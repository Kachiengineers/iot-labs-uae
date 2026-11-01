const DB = require('../db');

// Lab 05: plausible ranges for a real indoor room. Anything outside is a
// sensor fault or a bad request, and is rejected with 400.
const TEMPERATURE_MIN = -10;
const TEMPERATURE_MAX = 60;
const HUMIDITY_MIN = 0;
const HUMIDITY_MAX = 100;

function isNumberBetween(value, min, max) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

// Create a room after validating its required name.
async function createARoom(req, res) {
    const name = req.body?.name;
    if (!name?.trim()) {
        return res.status(400).json({ message: 'Room name is required' });
    }
    try {
        const room = await DB.createRoom(name);
        res.status(201).json(room);
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ message: `Room name ${name} already exists` });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

// Return every room in the database.
async function getAllRooms(_, res) {
    try {
        const rooms = await DB.getAllRooms();
        res.status(200).json(rooms);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Return one room, rejecting malformed IDs before querying PostgreSQL.
// Lab 05: the Pi polls this every 2 s; the response includes light and occupied.
async function getRoomById(req, res) {
    const id = req.params?.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.getRoomById(id);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        if (room.id != id) {
            return res.status(400).json({ message: `Room id ${id} does not match the requested room` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Validate and update the light state for one room.
// Lab 05: called by both the dashboard toggle and the Pi.
async function updateRoomLight(req, res) {
    const id = req.params?.id;
    const light = req.body?.light;
    if (typeof light !== 'boolean') {
        return res.status(400).json({ message: 'Light status must be a boolean' });
    }
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.updateRoomLight(id, light);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Lab 05: the Pi reports a change of occupancy.
async function updateRoomOccupancy(req, res) {
    const id = req.params?.id;
    const occupied = req.body?.occupied;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    if (typeof occupied !== 'boolean') {
        return res.status(400).json({ message: 'Occupied must be a boolean' });
    }
    try {
        const room = await DB.updateRoomOccupancy(id, occupied);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Lab 05: the Pi posts one temperature and humidity reading.
async function addReading(req, res) {
    const id = req.params?.id;
    const temperature = req.body?.temperature;
    const humidity = req.body?.humidity;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    if (!isNumberBetween(temperature, TEMPERATURE_MIN, TEMPERATURE_MAX)) {
        return res.status(400).json({
            message: `Temperature must be a number between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}`
        });
    }
    if (!isNumberBetween(humidity, HUMIDITY_MIN, HUMIDITY_MAX)) {
        return res.status(400).json({
            message: `Humidity must be a number between ${HUMIDITY_MIN} and ${HUMIDITY_MAX}`
        });
    }
    try {
        const reading = await DB.addReading(id, temperature, humidity);
        if (reading == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(201).json(reading);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Delete one room and return the deleted record.
async function deleteRoom(req, res) {
    const id = req.params?.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.deleteRoom(id);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Bulk light controls for all rooms.
async function turnOnAllLights(_, res) {
    try {
        const updatedRooms = await DB.turnOnAllLights();
        res.status(200).json({ message: 'All room lights turned on', updatedRooms });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function turnOffAllLights(_, res) {
    try {
        const updatedRooms = await DB.turnOffAllLights();
        res.status(200).json({ message: 'All room lights turned off', updatedRooms });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Temperature reporting endpoints.
async function getAverageTemperature(_, res) {
    try {
        const averageTemperature = await DB.getAverageTemperature();
        res.status(200).json(averageTemperature);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getLatestTemperatures(_, res) {
    try {
        const temperatures = await DB.getLatestTemperatures();
        res.status(200).json(temperatures);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Return recent readings for every room, oldest first.
// ?limit=N caps how many readings per room are returned (default 30, max 500).
// Lab 05: includes humidity, and returns numbers rather than NUMERIC strings.
async function getTemperatureLogs(req, res) {
    const limitParam = req.query?.limit ?? '30';
    if (!/^\d+$/.test(limitParam) || Number(limitParam) < 1) {
        return res.status(400).json({ message: 'Limit must be a positive number' });
    }
    const limit = Math.min(Number(limitParam), 500);
    const text = `
        SELECT room_id, room_name, temperature::float AS temperature,
               humidity::float AS humidity, timestamp
        FROM (
            SELECT temperature_logs.room_id,
                   rooms.name AS room_name,
                   temperature_logs.temperature,
                   temperature_logs.humidity,
                   temperature_logs.timestamp,
                   ROW_NUMBER() OVER (
                       PARTITION BY temperature_logs.room_id
                       ORDER BY temperature_logs.timestamp DESC
                   ) AS row_num
            FROM temperature_logs
            JOIN rooms ON rooms.id = temperature_logs.room_id
        ) AS recent
        WHERE row_num <= $1
        ORDER BY timestamp ASC, room_id ASC
    `;
    try {
        const dbResponse = await DB.pool.query(text, [limit]);
        res.status(200).json(dbResponse.rows);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}
module.exports = {
    createARoom,
    getAllRooms,
    getRoomById,
    updateRoomLight,
    updateRoomOccupancy,
    addReading,
    deleteRoom,
    turnOnAllLights,
    turnOffAllLights,
    getAverageTemperature,
    getLatestTemperatures,
    getTemperatureLogs
}
