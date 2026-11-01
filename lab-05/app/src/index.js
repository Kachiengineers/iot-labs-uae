const path = require('path');
const express = require('express');
const app = express();
const DB = require('./db');
const RoomRoutes = require('./routes/roomRoutes');
// Lab 05: the simulator is retired. Every reading now comes from the Pi.
// const SensorPlugin = require('./plugins/sensorPlugin');

// Render EJS templates from the views/ folder.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Serve CSS, JavaScript and SVG images from the public/ folder.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Parse JSON request bodies before they reach the route handlers.
app.use(express.json());

// Basic health-check route for the API.
function home(req, res) {
res.status(200).json({ message: 'This is lab 05. Open /dashboard for the front-end.' });
}
app.get('/', home);

// Lab 05: which rooms the dashboard shows, from DASHBOARD_ROOM_IDS in .env
// (e.g. "19", or "19,3" for two). Not set -> the first two rooms, as in Lab 03.
const DASHBOARD_ROOM_IDS = (process.env.DASHBOARD_ROOM_IDS || '')
  .split(',')
  .map(id => Number.parseInt(id, 10))
  .filter(Number.isInteger);

// Render the dashboard with the chosen rooms: light, occupancy and latest reading.
// main.js keeps the page up to date afterwards through the API.
async function dashboard(req, res) {
  const roomIds = DASHBOARD_ROOM_IDS.join(',');
  try {
    const latest = await DB.getLatestTemperatures();   // includes light, occupied, humidity
    const dashboardRooms = DASHBOARD_ROOM_IDS.length > 0
      ? DASHBOARD_ROOM_IDS.map(id => latest.find(r => r.id === id) || null)
      : latest.slice(0, 2);
    res.render('dashboard', { rooms: dashboardRooms, roomIds });
  } catch (err) {
    // Still render the page; the browser will retry loading data from the API.
    res.render('dashboard', { rooms: [], roomIds });
  }
}
app.get('/dashboard', dashboard);

// Room and temperature API endpoints.
// Fixed paths are registered before /api/rooms/:id so they are not treated as an id.
app.post('/api/rooms', RoomRoutes.createARoom);
app.get('/api/rooms', RoomRoutes.getAllRooms);
app.patch('/api/rooms/lights/on', RoomRoutes.turnOnAllLights);
app.patch('/api/rooms/lights/off', RoomRoutes.turnOffAllLights);
app.get('/api/rooms/temperatures', RoomRoutes.getLatestTemperatures);
app.get('/api/rooms/temperature-logs', RoomRoutes.getTemperatureLogs);
app.get('/api/rooms/average-temperature', RoomRoutes.getAverageTemperature);
app.get('/api/rooms/:id', RoomRoutes.getRoomById);
app.patch('/api/rooms/:id/light', RoomRoutes.updateRoomLight);
app.delete('/api/rooms/:id', RoomRoutes.deleteRoom);
// Lab 05: endpoints the Pi calls.
app.post('/api/rooms/:id/readings', RoomRoutes.addReading);
app.patch('/api/rooms/:id/occupancy', RoomRoutes.updateRoomOccupancy);

// Lab 05: a request body that is not valid JSON gets a JSON 400, not an HTML stack trace.
app.use(function badJson(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON' });
  }
  next(err);
});

// Return a JSON response when a client requests an unknown route.
app.get(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[GET] Route not found' });
});
app.post(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[POST] Route not found' });
});
const port = 3000;

// Start the server and prepare the database. No simulator: the Pi sends readings.
app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Dashboard available at http://localhost:${port}/dashboard`);
  DB.setupDatabase().then(() => {
    console.log('Database ready; waiting for readings from the Pi');
  });
});
