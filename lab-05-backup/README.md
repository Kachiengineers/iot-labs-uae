# Lab 05: Connected Room Node

The Raspberry Pi (`node/`) reports to the Express API on the laptop (`app/`).
The Pi starts every request; the server never contacts the Pi.

| Where | What runs | Address it needs |
|---|---|---|
| Laptop | `app/` (Express + PostgreSQL + dashboard) | none; listens on port 3000 |
| Pi | `node/room_node.py` | laptop's WiFi IP, in `node/config.py` → `API_BASE_URL` |

## 1. Network (every session)
1. Connect laptop and Pi to the same phone hotspot (not CMU-SECURE).
2. Find the laptop's WiFi IP: `ipconfig` (Windows) / `ifconfig` or `ip addr` (macOS/Linux).
3. Allow Node.js through the laptop firewall on private networks (port 3000).
4. From the Pi: `ping -c 3 <laptop-ip>` then `curl http://<laptop-ip>:3000/api/rooms`.

## 2. Server (laptop)
```bash
cd lab-05/app
npm install
psql -U <user> -d <database> -f migrations.sql   # once
npm start                                        # or: node src/index.js
```
Create the room once and note the returned `id`:
```bash
curl -X POST http://localhost:3000/api/rooms -H "Content-Type: application/json" -d '{"name":"Lab Room"}'
```
Dashboard: http://localhost:3000

## 3. Node (Pi)
```bash
cd lab-05/node
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# edit config.py: API_BASE_URL = "http://<laptop-ip>:3000/api", ROOM_ID = <id from step 2>
python3 room_node.py          # Ctrl+C to stop
```

## Endpoints
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/rooms` | – | 200, rooms with latest reading | 500 |
| POST | `/api/rooms` | `{name}` | 201, room | 400, 500 |
| GET | `/api/rooms/:id` | – | 200, `{id,name,light,occupied}` | 400, 404, 500 |
| GET | `/api/rooms/:id/logs?limit=N` | – | 200, readings oldest first | 400, 500 |
| POST | `/api/rooms/:id/readings` | `{temperature, humidity}` | 201, row | 400, 404, 500 |
| PATCH | `/api/rooms/:id/occupancy` | `{occupied}` | 200, room | 400, 404, 500 |
| PATCH | `/api/rooms/:id/light` | `{light}` | 200, room | 400, 404, 500 |

## Quick endpoint tests (laptop, before involving the Pi)
```bash
curl -X POST localhost:3000/api/rooms/1/readings -H "Content-Type: application/json" -d '{"temperature":24.6,"humidity":55.2}'
curl -X POST localhost:3000/api/rooms/1/readings -H "Content-Type: application/json" -d '{"temperature":"hot","humidity":55}'   # expect 400
curl -X PATCH localhost:3000/api/rooms/1/occupancy -H "Content-Type: application/json" -d '{"occupied":true}'
curl -X PATCH localhost:3000/api/rooms/1/light -H "Content-Type: application/json" -d '{"light":false}'
curl localhost:3000/api/rooms/1
```
