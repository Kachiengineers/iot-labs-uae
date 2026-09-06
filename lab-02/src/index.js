const express = require('express');
const app = express();
app.get('/', function(req, res) {
    res.status(200).json({ message: 'This is lab 02' });
});
const port = 3000;
app.listen(port, function() {
  console.log(`Server is running on http://localhost:${port}`);
});