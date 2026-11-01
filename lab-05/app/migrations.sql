-- Lab 05 schema changes, applied to the Lab 03 database.
-- Run once with:  node src/migrate.js      (from lab-05/app)
-- Every change is an ALTER: existing rooms and logs are kept.

BEGIN;

-- 1. Real temperatures have one decimal place (e.g. 24.6).
--    The Lab 02 check (10..40, written for the simulator) is replaced by the
--    DHT22's own measuring range so a genuine reading is never refused by the
--    database; the API applies the tighter "sensible" range.
ALTER TABLE temperature_logs DROP CONSTRAINT IF EXISTS temperature_logs_temperature_check;
ALTER TABLE temperature_logs
    ALTER COLUMN temperature TYPE NUMERIC(4,1) USING temperature::NUMERIC(4,1);
ALTER TABLE temperature_logs
    ADD CONSTRAINT temperature_logs_temperature_check CHECK (temperature BETWEEN -40 AND 80);

-- 2. Humidity in %RH, one decimal place. Old simulator rows have none, so NULL is allowed.
ALTER TABLE temperature_logs ADD COLUMN IF NOT EXISTS humidity NUMERIC(4,1);
ALTER TABLE temperature_logs DROP CONSTRAINT IF EXISTS temperature_logs_humidity_check;
ALTER TABLE temperature_logs
    ADD CONSTRAINT temperature_logs_humidity_check CHECK (humidity BETWEEN 0 AND 100);

-- 3. Occupancy is room state, like light.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS occupied BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. "Latest reading for room X" is asked every few seconds; keep it fast.
CREATE INDEX IF NOT EXISTS idx_temperature_logs_room_time
    ON temperature_logs (room_id, timestamp DESC);

COMMIT;
