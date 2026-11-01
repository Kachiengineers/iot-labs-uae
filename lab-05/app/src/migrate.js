// Runs migrations.sql against the database configured in .env.
// Usage (from lab-05/app):  node src/migrate.js
// Safe to run more than once: every statement is idempotent.
const fs = require('fs');
const path = require('path');
const DB = require('./db');

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations.sql'), 'utf8');
    try {
        await DB.pool.query(sql);
        console.log('Migration applied.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        await DB.pool.end();
    }
}

migrate();
