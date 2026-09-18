const PG = require('pg');
require('dotenv').config();

const pool = new PG.Pool();
async function setupDatabase() {
    const text = `

            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                light BOOLEAN DEFAULT FALSE
                );

            CREATE TABLE IF NOT EXISTS temperature_logs (
                id SERIAL PRIMARY KEY,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                temperature INTEGER CHECK (temperature BETWEEN 10 AND 40),
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`

        try {
            await pool.query(text);
            console.log('Database setup completed successfully.');
        } catch (err) {
            console.error('Error setting up the database:', err);
        }
}

async function createRoom(name) {
    const text = 'INSERT INTO rooms (name) VALUES ($1) RETURNING *';
    const values = [name];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function getAllRooms(){
    const text = 'SELECT * FROM rooms';
    const dbResponse = await pool.query(text);
    return dbResponse.rows;
}

async function getRoomById(id) {
    const text = 'SELECT * FROM rooms WHERE id = $1';
    const values = [id];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function updateRoomLight(id, light) {
    const text = 'UPDATE rooms SET light = $1 WHERE id = $2 RETURNING *';
    const values = [light, id];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function deleteRoom(id) {
    const text = 'DELETE FROM rooms WHERE id = $1 RETURNING *';
    const values = [id];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function turnOnAllLights() {
    const text = 'UPDATE rooms SET light = TRUE';
    const dbResponse = await pool.query(text);
    return dbResponse.rowCount;
}

async function turnOffAllLights() {
    const text = 'UPDATE rooms SET light = FALSE';
    const dbResponse = await pool.query(text);
    return dbResponse.rowCount;
}

async function getAverageTemperature() {
    const text = 'SELECT AVG(temperature) AS average_temperature FROM temperature_logs';
    const dbResponse = await pool.query(text);
    return dbResponse.rows[0];
}

async function getLatestTemperatures() {
    const text = `
        SELECT rooms.id, rooms.name, latest.temperature, latest.timestamp
        FROM rooms
        LEFT JOIN LATERAL (
            SELECT temperature, timestamp
            FROM temperature_logs
            WHERE room_id = rooms.id
            ORDER BY timestamp DESC
            LIMIT 1
        ) AS latest ON TRUE
        ORDER BY rooms.id
    `;
    const dbResponse = await pool.query(text);
    return dbResponse.rows;
}
module.exports = {
    setupDatabase,
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoomLight,
    deleteRoom,
    turnOnAllLights,
    turnOffAllLights,
    getAverageTemperature,
    getLatestTemperatures,
    pool
}