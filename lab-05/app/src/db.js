const PG = require('pg');
require('dotenv').config();

// A shared connection pool is reused by all database operations.
const pool = new PG.Pool();

// Create the tables required by the room and temperature features.
// Lab 05: a fresh database gets the new schema directly; an existing Lab 03
// database is upgraded by migrations.sql (CREATE TABLE IF NOT EXISTS leaves it alone).
async function setupDatabase() {
    const text = `

            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                light BOOLEAN DEFAULT FALSE,
                occupied BOOLEAN NOT NULL DEFAULT FALSE
                );

            CREATE TABLE IF NOT EXISTS temperature_logs (
                id SERIAL PRIMARY KEY,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                temperature NUMERIC(4,1) CHECK (temperature BETWEEN -40 AND 80),
                humidity NUMERIC(4,1) CHECK (humidity BETWEEN 0 AND 100),
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`

        try {
            await pool.query(text);
            console.log('Database setup completed successfully.');
        } catch (err) {
            console.error('Error setting up the database:', err);
        }
}

// Room CRUD operations.
async function createRoom(name) {
    const text = 'INSERT INTO rooms (name) VALUES ($1) RETURNING *';
    const values = [name];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function getAllRooms(){
    const text = 'SELECT * FROM rooms ORDER BY id';
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

// Lab 05: the Pi reports when the room becomes occupied or empty.
async function updateRoomOccupancy(id, occupied) {
    const text = 'UPDATE rooms SET occupied = $1 WHERE id = $2 RETURNING *';
    const values = [occupied, id];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

async function deleteRoom(id) {
    const text = 'DELETE FROM rooms WHERE id = $1 RETURNING *';
    const values = [id];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

// Update the light state for every room at once.
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

// Lab 05: store one reading from the Pi. The server's clock sets the timestamp.
// Returns undefined when the room does not exist (the SELECT finds no row).
async function addReading(roomId, temperature, humidity) {
    const text = `
        INSERT INTO temperature_logs (room_id, temperature, humidity)
        SELECT id, ROUND($2::numeric, 1), ROUND($3::numeric, 1) FROM rooms WHERE id = $1
        RETURNING id, room_id, temperature::float AS temperature,
                  humidity::float AS humidity, timestamp
    `;
    const values = [roomId, temperature, humidity];
    const dbResponse = await pool.query(text, values);
    return dbResponse.rows[0];
}

// Temperature reporting queries.
// NUMERIC columns come back from pg as strings ("24.6"); ::float returns numbers.
async function getAverageTemperature() {
    const text = 'SELECT ROUND(AVG(temperature), 1)::float AS average_temperature FROM temperature_logs';
    const dbResponse = await pool.query(text);
    return dbResponse.rows[0];
}

async function getLatestTemperatures() {
    const text = `
        SELECT rooms.id, rooms.name, rooms.light, rooms.occupied,
               latest.temperature::float AS temperature,
               latest.humidity::float AS humidity,
               latest.timestamp
        FROM rooms
        LEFT JOIN LATERAL (
            SELECT temperature, humidity, timestamp
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
    updateRoomOccupancy,
    deleteRoom,
    turnOnAllLights,
    turnOffAllLights,
    addReading,
    getAverageTemperature,
    getLatestTemperatures,
    pool
}
