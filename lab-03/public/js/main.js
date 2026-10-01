// Front-end logic for the Smart Room Assistant dashboard.
// Everything shown here comes from the Lab 02/03 API.

const REFRESH_MS = 10000;      // matches the sensor plugin's logging interval
const READINGS_PER_ROOM = 30;  // how much history the chart shows

const roomsSection = document.getElementById('rooms');
const statusMessage = document.getElementById('status-message');
let chart = null;

function applyThemeFromRooms(rooms) {
    const isDark = ThemeState.getThemeMode(rooms);
    document.body.dataset.theme = isDark ? 'dark' : 'light';
}

function getVisibleRooms() {
    return Array.from(document.querySelectorAll('.room-card[data-room-id]')).map(card => ({
        light: card.dataset.light === 'true'
    }));
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

// ---------- Room cards ----------

// Build the HTML for one room card, or an empty placeholder if there is no room.
function cardHTML(room, slot) {
    if (!room) {
        return `
          <article class="room-card empty" data-slot="${slot}">
            <h2 class="room-name">No room</h2>
            <p class="empty-text">Create a room with POST /api/rooms to see it here.</p>
          </article>`;
    }
    const temp = room.temperature != null ? `${room.temperature} °C` : 'No reading yet';
    return `
      <article class="room-card" data-slot="${slot}" data-room-id="${room.id}" data-light="${room.light}">
        <h2 class="room-name"></h2>
        <img class="bulb" src="/img/${room.light ? 'bulb-on' : 'bulb-off'}.svg"
             alt="Light is ${room.light ? 'on' : 'off'}">
        <p class="light-status">Light: <strong>${room.light ? 'On' : 'Off'}</strong></p>
        <p class="temperature"><span class="temp-value">${temp}</span></p>
        <button class="btn toggle-btn">${room.light ? 'Turn Off' : 'Turn On'}</button>
      </article>`;
}

// Fetch rooms (for light state) and latest temperatures, then redraw both cards.
async function loadRooms() {
    const [rooms, latest] = await Promise.all([
        requestJSON('/api/rooms'),
        requestJSON('/api/rooms/temperatures')
    ]);
    // /api/rooms/temperatures is ordered by room id; use it to pick the first two rooms.
    const dashboardRooms = latest.slice(0, 2).map(reading => {
        const room = rooms.find(r => r.id === reading.id);
        return {
            id: reading.id,
            name: reading.name,
            light: room ? room.light : false,
            temperature: reading.temperature
        };
    });

    roomsSection.innerHTML = cardHTML(dashboardRooms[0], 0) + cardHTML(dashboardRooms[1], 1);
    // Set names with textContent so a room name can never inject HTML.
    dashboardRooms.forEach((room, slot) => {
        const card = roomsSection.querySelector(`[data-slot="${slot}"] .room-name`);
        if (card) card.textContent = room.name;
    });
    applyThemeFromRooms(dashboardRooms);
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

function formatTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadChart() {
    const logs = await requestJSON(`/api/rooms/temperature-logs?limit=${READINGS_PER_ROOM}`);

    // Group readings by room, keeping only the first two rooms (by id) to match the cards.
    const byRoom = new Map();
    logs.forEach(row => {
        if (!byRoom.has(row.room_id)) {
            byRoom.set(row.room_id, { name: row.room_name, points: [] });
        }
        byRoom.get(row.room_id).points.push({ x: new Date(row.timestamp).getTime(), y: row.temperature });
    });
    const roomIds = [...byRoom.keys()].sort((a, b) => a - b).slice(0, 2);

    // Colour follows the slot (room order), not the data, so lines keep their colour on refresh.
    const colours = [cssVar('--series-1'), cssVar('--series-2')];
    const datasets = roomIds.map((id, i) => ({
        label: byRoom.get(id).name,
        data: byRoom.get(id).points,
        borderColor: colours[i],
        backgroundColor: colours[i],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.2
    }));

    document.getElementById('chart-empty').hidden = datasets.length > 0;

    if (chart) {
        chart.data.datasets = datasets;
        chart.update('none');
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
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: textColour, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        title: items => formatTime(items[0].parsed.x),
                        label: item => `${item.dataset.label}: ${item.parsed.y} °C`
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
        await Promise.all([loadRooms(), loadChart()]);
    } catch (err) {
        showMessage(`Could not load data from the server: ${err.message}`, true);
    }
}

refresh();
setInterval(refresh, REFRESH_MS);
