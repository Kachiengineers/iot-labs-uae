const DB = require('../db');
async function createARoom(req, res) {
    const name = req.body?.name;
    if (!name?.trim()) {
        return res.status(400).json({ message: 'Room name is required' });
    }
    try {
        const room = await DB.createRoom(name);
        res.status(201).json(room);
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ message: `Room name ${name} already exists` });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
async function getAllRooms(_, res) {
    const rooms = await DB.getAllRooms();
    res.status(200).json(rooms);
}

async function getRoomById(req, res) {
    const id = req.params?.id;  
    const room = await DB.getRoomById(id);
    if (room== null) {
        return res.status(404).json({ message: `Room with id ${id} not found` });
    }
    if(room.id !=id){
        return res.status(400).json({ message: `Room id ${id} does not match the requested room` });
    }
    res.status(200).json(room);
}

async function updateRoomLight(req, res) {
    const id = req.params?.id;
    const light = req.body?.light;
    if (typeof light !== 'boolean') {
        return res.status(400).json({ message: 'Light status must be a boolean' });
    }
    const room = await DB.updateRoomLight(id, light);
    if (room == null) {
        return res.status(404).json({ message: `Room with id ${id} not found` });
    }
    res.status(200).json(room);
}

async function deleteRoom(req, res) {
    const id = req.params?.id;
    const room = await DB.deleteRoom(id);
    if (room == null) {
        return res.status(404).json({ message: `Room with id ${id} not found` });
    }
    res.status(200).json(room);
}

async function turnOnAllLights(_, res) {
    const updatedRooms = await DB.turnOnAllLights();
    res.status(200).json({ message: 'All room lights turned on', updatedRooms });
}

async function turnOffAllLights(_, res) {
    const updatedRooms = await DB.turnOffAllLights();
    res.status(200).json({ message: 'All room lights turned off', updatedRooms });
}

async function getAverageTemperature(_, res) {
    const averageTemperature = await DB.getAverageTemperature();
    res.status(200).json(averageTemperature);
}

async function getLatestTemperatures(_, res) {
    const temperatures = await DB.getLatestTemperatures();
    res.status(200).json(temperatures);
}
module.exports = {
    createARoom,
    getAllRooms,
    getRoomById,
    updateRoomLight,
    deleteRoom,
    turnOnAllLights,
    turnOffAllLights,
    getAverageTemperature,
    getLatestTemperatures
}