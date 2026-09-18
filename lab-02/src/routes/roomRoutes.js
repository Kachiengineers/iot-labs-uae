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
    try {
        const rooms = await DB.getAllRooms();
        res.status(200).json(rooms);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getRoomById(req, res) {
    const id = req.params?.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.getRoomById(id);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        if (room.id != id) {
            return res.status(400).json({ message: `Room id ${id} does not match the requested room` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateRoomLight(req, res) {
    const id = req.params?.id;
    const light = req.body?.light;
    if (typeof light !== 'boolean') {
        return res.status(400).json({ message: 'Light status must be a boolean' });
    }
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.updateRoomLight(id, light);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteRoom(req, res) {
    const id = req.params?.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'Room id must be a number' });
    }
    try {
        const room = await DB.deleteRoom(id);
        if (room == null) {
            return res.status(404).json({ message: `Room with id ${id} not found` });
        }
        res.status(200).json(room);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function turnOnAllLights(_, res) {
    try {
        const updatedRooms = await DB.turnOnAllLights();
        res.status(200).json({ message: 'All room lights turned on', updatedRooms });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function turnOffAllLights(_, res) {
    try {
        const updatedRooms = await DB.turnOffAllLights();
        res.status(200).json({ message: 'All room lights turned off', updatedRooms });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAverageTemperature(_, res) {
    try {
        const averageTemperature = await DB.getAverageTemperature();
        res.status(200).json(averageTemperature);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getLatestTemperatures(_, res) {
    try {
        const temperatures = await DB.getLatestTemperatures();
        res.status(200).json(temperatures);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
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