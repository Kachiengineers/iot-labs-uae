-- Lab 05 schema changes.
-- Run once against your Lab 03 database, for example:
--   psql -U <user> -d <database> -f migrations.sql
-- Existing rooms and logs are kept: every change is an ALTER, nothing is dropped.
-- ASSUMPTION: temperature_logs has columns (id, room_id, temperature, recorded_at).
-- If your timestamp column has another name (created_at, logged_at...), change
-- "recorded_at" here and in src/routes/roomRoutes.js.

BEGIN;

-- 1. Real temperatures have a decimal place (e.g. 23.4). The USING clause
--    converts the integers already stored (23 becomes 23.0).
ALTER TABLE temperature_logs
    ALTER COLUMN temperature TYPE NUMERIC(4,1) USING temperature::NUMERIC(4,1);

-- 2. Humidity, in percent with one decimal place. Older rows have no humidity,
--    so the column allows NULL.
ALTER TABLE temperature_logs
    ADD COLUMN IF NOT EXISTS humidity NUMERIC(4,1);

-- 3. Occupancy is part of the room's state, like light.
ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS occupied BOOLEAN NOT NULL DEFAULT false;

-- 4. The dashboard and the Pi ask for "latest reading for room X" constantly;
--    this index keeps that fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_temperature_logs_room_time
    ON temperature_logs (room_id, recorded_at DESC);

COMMIT;
