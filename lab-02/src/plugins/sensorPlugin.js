// src/plugins/sensorPlugin.js

const { pool } = require('../db');

// Insert a generated temperature reading for one room.
// Function to log temperature every 10 seconds
const logTemperature = async (roomId) => {
    try {
        // Random temperature between 18 and 26
        const temperature = Math.floor(Math.random() * (26 - 18 + 1)) + 18;
        const timestamp = new Date();
        
        await pool.query(
            `INSERT INTO temperature_logs (room_id, temperature, timestamp)
            VALUES ($1, $2, $3)`,
            [roomId, temperature, timestamp]
        );
        console.log(`Logged temperature for room ${roomId}: ${temperature}°C at ${timestamp}`);
    } catch (err) {
        console.error('Error logging temperature:', err);
    }
};

// Periodically find all rooms and record a reading for each one.
// Start logging temperature every 10 seconds
const startLogging = () => {
    setInterval(async () => {
        const res = await pool.query('SELECT id FROM rooms');
        for (const row of res.rows) {
            await logTemperature(row.id);
        }
    }, 10000); // Every 10 seconds
};
module.exports = { startLogging };