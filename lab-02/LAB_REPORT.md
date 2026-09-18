# Lab 02 Report: Smart Room Assistant with Express and PostgreSQL

**Course:** 04-645 A — Internet of Things (IoT)
**Institution:** Carnegie Mellon University Africa
**Student:** _[Your Name]_
**Andrew ID:** _[Your Andrew ID]_
**Date:** September 18, 2026
**Repository:** _[link to your iot-labs-<andrew-id> repo]_

---

## 1. Objective

The goal of this lab was to extend the Express server built in Lab 01 into a full **Smart Room Management System** backed by a PostgreSQL database. This involved:

- Designing and creating a relational schema (`rooms` and `temperature_logs`) in PostgreSQL.
- Building a set of RESTful API endpoints in Express to create, read, update, and delete rooms, control room lighting, and log/aggregate temperature data.
- Using parameterized SQL queries to prevent SQL injection.
- Testing every endpoint with Postman, including error and edge cases.
- Implementing a background "sensor" plugin that periodically simulates and logs temperature readings for every room.

---

## 2. Project Structure

The project follows the structure specified in the assignment:

```
lab-02/
├── src/
│   ├── plugins/
│   │   └── sensorPlugin.js
│   ├── routes/
│   │   └── roomRoutes.js
│   ├── db.js
│   └── index.js
├── package.json
├── package-lock.json
└── .env                (not committed — see Section 7)
```

**[Screenshot: VS Code Explorer panel showing the full `lab-02/` folder tree]**

### 2.1 File Responsibilities

| File | Responsibility |
|---|---|
| `db.js` | Creates the PostgreSQL connection pool (via `pg.Pool`, reading credentials from environment variables loaded by `dotenv`), creates the database tables on startup, and exposes one function per database operation (`createRoom`, `getAllRooms`, `getRoomById`, `updateRoomLight`, `deleteRoom`, `turnOnAllLights`, `turnOffAllLights`, `getAverageTemperature`). |
| `routes/roomRoutes.js` | Express route handler functions. Each handler validates the incoming request, calls the matching function in `db.js`, and maps the result to an appropriate HTTP status code and JSON response. |
| `index.js` | Application entry point. Creates the Express app, registers the `express.json()` body-parser middleware, wires up every route (in the order required — see Section 6), adds catch-all 404 handlers, and starts the server on port 3000, triggering database setup on boot. |
| `plugins/sensorPlugin.js` | Simulates a temperature sensor for every room. On an interval, it generates a random temperature reading for each room in the database and inserts it into `temperature_logs`. |

---

## 3. Database Design

Two tables were created, exactly as specified in the assignment:

```sql
-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    light BOOLEAN DEFAULT FALSE
);

-- Create temperature_logs table
CREATE TABLE IF NOT EXISTS temperature_logs (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    temperature INTEGER CHECK (temperature BETWEEN 10 AND 40),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

Rather than running this SQL manually, `db.js` runs it automatically as `CREATE TABLE IF NOT EXISTS ...` inside a `setupDatabase()` function, called once when the Express server starts listening. This means the schema is created idempotently every time the app boots, without needing a separate migration step.

Key design points:

- `rooms.name` is `UNIQUE`, so attempting to create two rooms with the same name is rejected by PostgreSQL at the database layer (error code `23505`), which the API translates into an HTTP `409 Conflict` (see Section 5).
- `temperature_logs.room_id` uses `ON DELETE CASCADE`, so deleting a room automatically removes its historical temperature readings — there is no orphaned data.
- `temperature_logs.temperature` has a `CHECK (temperature BETWEEN 10 AND 40)` constraint, guarding against nonsensical values even if application-level validation were bypassed.

**[Screenshot: pgAdmin / psql showing the `rooms` table structure]**

**[Screenshot: pgAdmin / psql showing the `temperature_logs` table structure]**

**[Screenshot: `SELECT * FROM rooms;` output after creating a few test rooms]**

**[Screenshot: `SELECT * FROM temperature_logs;` output showing logged readings]**

---

## 4. Environment Configuration

Database credentials are kept out of source control and loaded from a `.env` file via the `dotenv` package:

```
PGUSER=...
PGPASSWORD=...
PGHOST=...
PGPORT=...
PGDATABASE=...
```

The repository's root `.gitignore` includes the pattern `**/.env`, so this file is excluded from every subdirectory of the repo, including `lab-02/`. `pg.Pool()` picks these variables up automatically from `process.env` without needing to pass a config object explicitly.

**[Screenshot: `.gitignore` contents / `git status` confirming `.env` is untracked]**

---

## 5. API Implementation

All database access uses **parameterized queries** (`$1`, `$2`, …) — no string concatenation is used to build SQL, which prevents SQL injection.

### 5.1 Create a Room — `POST /api/rooms`

- Validates that `req.body.name` exists and is non-empty (`400 Bad Request` if missing).
- Inserts the room and returns the new row with `201 Created`.
- If the name already exists, PostgreSQL raises a unique-constraint violation (`23505`), which the handler catches and converts into `409 Conflict` with a descriptive message.

**[Screenshot: Postman — successful `POST /api/rooms` request/response, 201]**
**[Screenshot: Postman — duplicate room name, 409 Conflict]**
**[Screenshot: Postman — missing `name` field, 400 Bad Request]**

### 5.2 Get All Rooms — `GET /api/rooms`

Returns the full `rooms` table as a JSON array with `200 OK`.

**[Screenshot: Postman — `GET /api/rooms` response listing all created rooms]**

### 5.3 Get Room by ID — `GET /api/rooms/:id`

- Returns `404 Not Found` if no room matches the given id.
- Returns `200 OK` with the room object otherwise.

**[Screenshot: Postman — `GET /api/rooms/:id` for a valid id]**
**[Screenshot: Postman — `GET /api/rooms/:id` for a non-existent id, 404]**

### 5.4 Update Light Status — `PATCH /api/rooms/:id/light`

- Validates that `req.body.light` is strictly a boolean (`400 Bad Request` otherwise) — this rejects truthy strings like `"true"` and forces clients to send real JSON booleans.
- Returns `404 Not Found` if the room doesn't exist, otherwise the updated room with `200 OK`.

**[Screenshot: Postman — `PATCH /api/rooms/:id/light` turning a light on]**
**[Screenshot: Postman — invalid (non-boolean) light value, 400]**

### 5.5 Delete a Room — `DELETE /api/rooms/:id`

Deletes the room and returns the deleted row with `200 OK`, or `404 Not Found` if it didn't exist. Because of the `ON DELETE CASCADE` foreign key, all associated temperature logs are removed automatically.

**[Screenshot: Postman — `DELETE /api/rooms/:id` success]**
**[Screenshot: Postman — deleting an already-deleted / non-existent id, 404]**

### 5.6 Turn On / Off All Lights — `PATCH /api/rooms/lights/on` and `/off`

Bulk-updates every row in `rooms`, setting `light` to `TRUE` or `FALSE` respectively. The response includes a message and the number of rows affected.

**[Screenshot: Postman — `PATCH /api/rooms/lights/on`]**
**[Screenshot: Postman — `PATCH /api/rooms/lights/off`]**
**[Screenshot: `GET /api/rooms` immediately after, showing all `light` values updated]**

### 5.7 Average Temperature — `GET /api/rooms/average-temperature`

Runs `SELECT AVG(temperature) AS average_temperature FROM temperature_logs` and returns the result. This endpoint depends on the sensor plugin (Section 6) having already logged some readings.

**[Screenshot: Postman — `GET /api/rooms/average-temperature` response]**

### 5.8 404 Handling for Unmatched Routes

`index.js` registers catch-all handlers after every defined route (`app.get(/(.*)/, ...)` and `app.post(/(.*)/, ...)`) that return a JSON `404` for any GET or POST request that doesn't match a real route, instead of falling through to Express's default HTML error page.

**[Screenshot: Postman — request to an undefined route, e.g. `GET /api/unknown`, showing the JSON 404]**

---

## 6. Route Ordering

Per the assignment's guidance on Express route matching, static routes are registered **before** dynamic (parameterized) routes so that literal paths like `/api/rooms/lights/on` and `/api/rooms/average-temperature` are not accidentally captured by `/api/rooms/:id`. The registration order in `index.js` is:

1. `POST /api/rooms`
2. `GET /api/rooms`
3. `PATCH /api/rooms/lights/on` *(static)*
4. `PATCH /api/rooms/lights/off` *(static)*
5. `GET /api/rooms/average-temperature` *(static)*
6. `GET /api/rooms/:id` *(dynamic)*
7. `PATCH /api/rooms/:id/light` *(dynamic)*
8. `DELETE /api/rooms/:id` *(dynamic)*

This ordering was verified by testing `GET /api/rooms/average-temperature` in Postman and confirming it returns the aggregate result rather than being swallowed by `GET /api/rooms/:id` with `id = "average-temperature"`.

**[Screenshot: Postman confirming `/api/rooms/average-temperature` resolves correctly, not as an invalid `:id` lookup]**

---

## 7. Sensor Plugin

`sensorPlugin.js` simulates a temperature sensor for each room:

- Every **10 seconds**, it queries all room ids from the database.
- For each room, it generates a random integer temperature between 18–26°C and inserts it into `temperature_logs` with the current timestamp.
- It logs a descriptive message to the console for each reading, including the room id/name and the temperature value.
- `startLogging()` is invoked once from `index.js` after the server starts and the database schema is ready, so logging runs continuously in the background for the lifetime of the process.

**[Screenshot: terminal output showing several consecutive "logged temperature" console messages]**

**[Screenshot: `SELECT * FROM temperature_logs ORDER BY timestamp DESC LIMIT 10;` confirming the readings match the console output]**

---

## 8. Testing with Postman

All endpoints listed in Section 5 were tested manually in Postman, covering both the "happy path" and error/edge cases:

| Endpoint | Happy Path Tested | Error Case(s) Tested |
|---|---|---|
| `POST /api/rooms` | ✅ Room created, 201 | ✅ Missing name (400), ✅ Duplicate name (409) |
| `GET /api/rooms` | ✅ Returns all rooms | — |
| `GET /api/rooms/:id` | ✅ Returns matching room | ✅ Non-existent id (404) |
| `PATCH /api/rooms/:id/light` | ✅ Toggles light | ✅ Non-boolean value (400), ✅ Non-existent id (404) |
| `DELETE /api/rooms/:id` | ✅ Deletes room | ✅ Non-existent id (404) |
| `PATCH /api/rooms/lights/on` | ✅ All lights on | — |
| `PATCH /api/rooms/lights/off` | ✅ All lights off | — |
| `GET /api/rooms/average-temperature` | ✅ Returns average | — |
| Unmatched route | — | ✅ JSON 404 returned |

**[Screenshot: Postman collection / history sidebar showing all requests made]**

---

## 9. Challenges and Solutions

_[Fill in based on your own experience — examples of what typically goes here:]_

- **Challenge:** _[e.g., PostgreSQL connection refused initially.]_
  **Solution:** _[e.g., discovered `.env` variables weren't loading because `dotenv.config()` was called after the pool was created; reordered the imports.]_
- **Challenge:** _[e.g., route `/api/rooms/average-temperature` was being matched by `/api/rooms/:id` and returning "room not found".]_
  **Solution:** _[Reordered routes so static paths are declared before the dynamic `:id` route, per Section 6.]_
- **Challenge:** _[Any issue getting the sensor plugin to run/insert on schedule.]_
  **Solution:** _[...]_

---

## 10. Reflection

_[1–2 short paragraphs: what you learned about Express routing, PostgreSQL, parameterized queries, and how this lab connects to the broader IoT/WoT goals mentioned in the assignment's "Why This Matters" section.]_

---

## 11. Conclusion

This lab extended the Lab 01 Express server into a persistent, database-backed Smart Room Management System. All required endpoints for room CRUD operations, light control, and temperature logging/aggregation were implemented using parameterized queries, appropriate HTTP status codes, and input validation. The application was verified end-to-end using Postman for the API layer and direct SQL queries for the database layer.

**Repository link:** _[GitHub URL]_
