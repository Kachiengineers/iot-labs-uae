const express = require('express');
const app = express();
const DB = require('./db');
const RoomRoutes = require('./routes/roomRoutes');
app.use(express.json());
function home(req, res) {
res.status(200).json({ message: 'This is lab 02' });
}
app.get('/', home);
app.post('/api/rooms', RoomRoutes.createARoom);
app.get('/api/rooms', RoomRoutes.getAllRooms);
app.patch('/api/rooms/lights/on', RoomRoutes.turnOnAllLights);
app.patch('/api/rooms/lights/off', RoomRoutes.turnOffAllLights);
app.get('/api/rooms/average-temperature', RoomRoutes.getAverageTemperature);
app.get('/api/rooms/:id', RoomRoutes.getRoomById);
app.patch('/api/rooms/:id/light', RoomRoutes.updateRoomLight);
app.delete('/api/rooms/:id', RoomRoutes.deleteRoom);
// from here, client is lost, so we need to handle 404 errors
app.get(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[GET] Route not found' });
});
app.post(/(.*)/, function _404(_, res) {
  res.status(404).json({ message: '[POST] Route not found' });
});
const port = 3000;
app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}`);
  DB.setupDatabase()
});