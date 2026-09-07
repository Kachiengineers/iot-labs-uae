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
const port = 3000;
app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}`);
  DB.setupDatabase()
});