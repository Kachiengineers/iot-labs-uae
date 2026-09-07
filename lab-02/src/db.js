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
    return dbResponse;
}
module.exports = {
    setupDatabase,
    createRoom,
    pool
}