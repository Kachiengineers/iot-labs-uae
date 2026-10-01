const API_BASE_URL = 'http://localhost:3000'; // Adjust the base URL as needed

// Fetch room data including temperature and light status
async function fetchRoomData() {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) {
        throw new Error('Failed to fetch room data');
    }
    return await response.json();
}

// Toggle the light status for a specific room
async function toggleLight(roomId, lightStatus) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/light`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ light: lightStatus }),
    });
    if (!response.ok) {
        throw new Error('Failed to toggle light');
    }
    return await response.json();
}

// Fetch temperature logs for trend visualization
async function fetchTemperatureLogs() {
    const response = await fetch(`${API_BASE_URL}/temperatures`);
    if (!response.ok) {
        throw new Error('Failed to fetch temperature logs');
    }
    return await response.json();
}

export { fetchRoomData, toggleLight, fetchTemperatureLogs };