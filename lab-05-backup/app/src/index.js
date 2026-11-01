const path = require('path');
const express = require('express');
const app = express();
const DB = require('./db');
const RoomRoutes = require('./routes/roomRoutes');
//const SensorPlugin = require('./plugins/sensorPlugin');

// Render EJS templates from the views/ folder.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Serve CSS, JavaScript and SVG images from the public/ folder.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Parse JSON request bodies before they reach the route handlers.
app.use(express.json());

// Basic health-check route for the API.
function home(req, res) {
res.status(200).json({ message: 'This is lab 03. Open /dashboard for the front-end.' });
}
app.get('/', home);

// Render the dashboard with the first two rooms, their light state and latest temperature.
// main.js keeps the page up to date afterwards through the API.
async function dashboard(req, res) {
  try {
    const latest = await DB.getLatestTemperatures();
    const rooms = await DB.getAllRooms();
    const dashboardRooms = latest.slice(0, 2).map(function(reading) {
      const room = rooms.find(r => r.id === reading.id);
      return {
        id: reading.id,
        name: reading.name,
        light: room ? room.light : false,
        temperature: reading.temperature
      };
    });
    res.render('dashboard', { rooms: dashboardRooms });
  } catch (err) {
    // Still render the page; the browser will retry loading data from the API.
    res.render('dashboard', { rooms: [] });
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

// Return a JSON response when a client requests an unknown route.
app.get(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[GET] Route not found' });
});
app.post(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[POST] Route not found' });
});
const port = 3000;

// Start the server, prepare the database, and begin sensor logging.
app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Dashboard available at http://localhost:${port}/dashboard`);
  DB.setupDatabase().then(() => {
    console.log('Database ready; waiting for readings from the Pi');
  });
});