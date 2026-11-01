// Front-end logic for the Smart Room Assistant dashboard.
// Lab 05: every reading shown here comes from the Raspberry Pi through the API.

const REFRESH_MS = 3000;       // fast enough that a toggle, an occupancy change or a new reading shows within seconds
const READINGS_PER_ROOM = 60;  // how much history the chart shows (60 readings = 10 minutes at one per 10 s)
const STALE_AFTER_MS = 30000;  // no reading for 30 s (3 missed reports) -> flag the card as stale

const roomsSection = document.getElementById('rooms');
const statusMessage = document.getElementById('status-message');
let chart = null;

// Which rooms the dashboard shows. The server fills data-room-ids from
// DASHBOARD_ROOM_IDS in .env (e.g. "19"). Empty means "the first two rooms".
const configuredRoomIds = (roomsSection.dataset.roomIds || '')
    .split(',')
    .map(id => Number.parseInt(id, 10))
    .filter(Number.isInteger);

function pickDashboardRooms(rooms) {
    if (configuredRoomIds.length === 0) {
        return rooms.slice(0, 2);
    }
    return configuredRoomIds.map(id => rooms.find(r => r.id === id) || null);
}

function applyThemeFromRooms(rooms) {
    const isDark = ThemeState.getThemeMode(rooms.filter(Boolean));
    document.body.dataset.theme = isDark ? 'dark' : 'light';
}

function getVisibleRooms() {
    return Array.from(document.querySelectorAll('.room-card[data-room-id]')).map(card => ({
        light: card.dataset.light === 'true'
    }));
}

function syncAllLightsButtons(rooms) {
    const allOnButton = document.getElementById('all-on');
    const allOffButton = document.getElementById('all-off');

    if (!allOnButton || !allOffButton) {
        return;
    }

    const allLightsOn = rooms.length > 0 && rooms.every(room => room && room.light === true);
    const allLightsOff = rooms.length > 0 && rooms.every(room => room && room.light === false);

    allOnButton.classList.toggle('is-active', allLightsOn);
    allOffButton.classList.toggle('is-active', allLightsOff);

    allOnButton.classList.toggle('is-inactive', !allLightsOn);
    allOffButton.classList.toggle('is-inactive', !allLightsOff);
}

// Small helper: fetch JSON and throw a readable error on non-2xx responses.
async function requestJSON(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.message || `Request failed (${response.status})`);
    }
    return body;
}

function showMessage(text, isError) {
    statusMessage.textContent = text;
    statusMessage.classList.toggle('error', Boolean(isError));
}

function formatTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ---------- Room cards ----------

function lastReadingText(room) {
    if (!room.timestamp) {
        return 'Waiting for the first reading from the node';
    }
    const time = new Date(room.timestamp).getTime();
    if (Date.now() - time > STALE_AFTER_MS) {
        return `No recent data (last reading ${formatTime(time)})`;
    }
    return `Last reading ${formatTime(time)}`;
}

// Build the HTML for one room card, or an empty placeholder if there is no room.
function cardHTML(room, slot) {
    if (!room) {
        return `
          <article class="room-card empty" data-slot="${slot}">
            <h2 class="room-name">No room</h2>
            <p class="empty-text">Create a room with POST /api/rooms and set its id in DASHBOARD_ROOM_IDS.</p>
          </article>`;
    }
    const temp = room.temperature != null ? `${room.temperature.toFixed(1)} °C` : '--';
    const humidity = room.humidity != null ? `${room.humidity.toFixed(1)} %` : '--';
    const stale = room.timestamp && Date.now() - new Date(room.timestamp).getTime() > STALE_AFTER_MS;
    return `
      <article class="room-card" data-slot="${slot}" data-room-id="${room.id}" data-light="${room.light}">
        <div class="room-header">
          <h2 class="room-name"></h2>
          <span class="occupancy ${room.occupied ? 'is-occupied' : 'is-empty'}">${room.occupied ? 'Occupied' : 'Empty'}</span>
        </div>
        <img class="bulb" src="/img/${room.light ? 'bulb-on' : 'bulb-off'}.svg"
             alt="Light is ${room.light ? 'on' : 'off'}">
        <p class="light-status">Light: <strong>${room.light ? 'On' : 'Off'}</strong></p>
        <div class="readings">
          <p class="temperature"><span class="reading-label">Temperature</span><span class="temp-value">${temp}</span></p>
          <p class="humidity"><span class="reading-label">Humidity</span><span class="humidity-value">${humidity}</span></p>
        </div>
        <p class="last-reading${stale ? ' is-stale' : ''}">${lastReadingText(room)}</p>
        <button class="btn toggle-btn">${room.light ? 'Turn Off' : 'Turn On'}</button>
      </article>`;
}

// Fetch every room with its latest reading, light and occupancy, then redraw the cards.
// /api/rooms/temperatures already returns light, occupied, temperature and humidity.
async function loadRooms() {
    const latest = await requestJSON('/api/rooms/temperatures');
    const dashboardRooms = pickDashboardRooms(latest);

    roomsSection.innerHTML = dashboardRooms.map(cardHTML).join('');
    // Set names with textContent so a room name can never inject HTML.
    dashboardRooms.forEach((room, slot) => {
        const name = roomsSection.querySelector(`[data-slot="${slot}"] .room-name`);
        if (name && room) name.textContent = room.name;
    });
    applyThemeFromRooms(dashboardRooms);
    syncAllLightsButtons(dashboardRooms.filter(Boolean));
    return dashboardRooms;
}

// Update one card in place after its light changes.
function updateCardLight(card, light) {
    card.dataset.light = String(light);
    const bulb = card.querySelector('.bulb');
    bulb.src = `/img/${light ? 'bulb-on' : 'bulb-off'}.svg`;
    bulb.alt = `Light is ${light ? 'on' : 'off'}`;
    card.querySelector('.light-status strong').textContent = light ? 'On' : 'Off';
    card.querySelector('.toggle-btn').textContent = light ? 'Turn Off' : 'Turn On';
}

// One click listener on the section handles every room's toggle button.
// Lab 05: this now switches the real LED on the Pi within one poll (2 s).
roomsSection.addEventListener('click', async event => {
    const button = event.target.closest('.toggle-btn');
    if (!button) return;
    const card = button.closest('.room-card');
    const roomId = card.dataset.roomId;
    // The endpoint sets (not flips) the light, so send the state we want.
    const desired = card.dataset.light !== 'true';

    button.disabled = true;
    try {
        const room = await requestJSON(`/api/rooms/${roomId}/light`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ light: desired })
        });
        updateCardLight(card, room.light);
        applyThemeFromRooms(getVisibleRooms());
        showMessage(`${room.name} light turned ${room.light ? 'on' : 'off'}.`);
    } catch (err) {
        showMessage(`Could not change the light: ${err.message}`, true);
    } finally {
        button.disabled = false;
    }
});

// All-lights buttons: these endpoints take no body. Reload the cards afterwards.
async function setAllLights(state) {
    try {
        const result = await requestJSON(`/api/rooms/lights/${state}`, { method: 'PATCH' });
        await loadRooms();
        const allOnButton = document.getElementById('all-on');
        const allOffButton = document.getElementById('all-off');
        if (allOnButton && allOffButton) {
            allOnButton.classList.toggle('is-active', state === 'on');
            allOffButton.classList.toggle('is-active', state === 'off');
            allOnButton.classList.toggle('is-inactive', state !== 'on');
            allOffButton.classList.toggle('is-inactive', state !== 'off');
        }
        showMessage(result.message || `All lights turned ${state}.`);
    } catch (err) {
        showMessage(`Could not turn all lights ${state}: ${err.message}`, true);
    }
}
document.getElementById('all-on').addEventListener('click', () => setAllLights('on'));
document.getElementById('all-off').addEventListener('click', () => setAllLights('off'));

// ---------- Temperature chart ----------

// Read a colour from the CSS custom properties so the chart follows light/dark mode.
function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function loadChart(dashboardRooms) {
    const logs = await requestJSON(`/api/rooms/temperature-logs?limit=${READINGS_PER_ROOM}`);

    // Only plot the rooms shown in the cards, in the same order, so colours match the slots.
    const shownIds = dashboardRooms.filter(Boolean).map(room => room.id);
    const byRoom = new Map();
    logs.forEach(row => {
        if (!shownIds.includes(row.room_id) || row.temperature == null) return;
        if (!byRoom.has(row.room_id)) {
            byRoom.set(row.room_id, { name: row.room_name, points: [] });
        }
        byRoom.get(row.room_id).points.push({ x: new Date(row.timestamp).getTime(), y: row.temperature });
    });

    const colours = [cssVar('--series-1'), cssVar('--series-2')];
    const datasets = shownIds
        .map((id, i) => ({ id, colour: colours[i % colours.length] }))
        .filter(({ id }) => byRoom.has(id))
        .map(({ id, colour }) => ({
            label: byRoom.get(id).name,
            data: byRoom.get(id).points,
            borderColor: colour,
            backgroundColor: colour,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.2
        }));

    // Degrade gracefully: no readings yet -> a message instead of an empty axis.
    const hasData = datasets.length > 0;
    document.getElementById('chart-empty').hidden = hasData;
    document.querySelector('.chart-container').hidden = !hasData;

    if (chart) {
        chart.data.datasets = datasets;
        chart.update('none');
        return;
    }
    if (!hasData) {
        return;
    }

    const textColour = cssVar('--text-secondary');
    const gridColour = cssVar('--grid');
    chart = new Chart(document.getElementById('temperature-chart'), {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: textColour, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        title: items => formatTime(items[0].parsed.x),
                        label: item => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} °C`
                    }
                }
            },
            scales: {
                // A linear axis of millisecond timestamps avoids needing a date adapter.
                x: {
                    type: 'linear',
                    ticks: { color: textColour, maxTicksLimit: 6, callback: value => formatTime(value) },
                    grid: { display: false },
                    title: { display: true, text: 'Time', color: textColour }
                },
                y: {
                    suggestedMin: 15,
                    suggestedMax: 30,
                    ticks: { color: textColour },
                    grid: { color: gridColour },
                    title: { display: true, text: 'Temperature (°C)', color: textColour }
                }
            }
        }
    });
}

// ---------- Start up ----------

async function refresh() {
    try {
        const dashboardRooms = await loadRooms();
        await loadChart(dashboardRooms);
        if (statusMessage.classList.contains('error')) showMessage('');
    } catch (err) {
        showMessage(`Could not load data from the server: ${err.message}`, true);
    }
}

refresh();
setInterval(refresh, REFRESH_MS);
