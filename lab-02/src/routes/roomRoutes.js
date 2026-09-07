const DB = require('../db');
async function createARoom(req, res) {
    const name = req.body.name;
    const room = await DB.createRoom(name);
    res.status(201).json(room);
}

module.exports = {
    createARoom
}