// rooms.js
// Handles all room-related logic: storage and operations on rooms.
// The rooms array is kept private to this module and is only accessible
// through the functions exported below.

const { randomStartTemperature, isValidTemperature } = require("./utilities");

// Private in-memory store of rooms. Each room looks like:
// { name: string, lightOn: boolean, temperature: number }
const rooms = [];

// Finds a room by name (case-insensitive).
function findRoom(name) {
  return rooms.find(
    (room) => room.name.toLowerCase() === String(name).toLowerCase()
  );
}

// Adds a new room. Light starts off, temperature is random (18-26).
function addRoom(name) {
  const trimmedName = name ? name.trim() : "";

  if (trimmedName === "") {
    return { success: false, message: "Room name cannot be empty." };
  }

  if (findRoom(trimmedName)) {
    return {
      success: false,
      message: `A room named "${trimmedName}" already exists.`,
    };
  }

  rooms.push({
    name: trimmedName,
    lightOn: false,
    temperature: randomStartTemperature(),
  });

  return { success: true, message: `${trimmedName} has been added.` };
}

// Toggles the light on/off for the room with the given name.
function toggleLight(name) {
  const room = findRoom(name);

  if (!room) {
    return { success: false, message: `No room named "${name}" was found.` };
  }

  room.lightOn = !room.lightOn;

  return {
    success: true,
    message: `${room.name} light is now ${room.lightOn ? "On" : "Off"}`,
  };
}

// Sets a new temperature for the room with the given name.
function setTemperature(name, temperature) {
  const room = findRoom(name);

  if (!room) {
    return { success: false, message: `No room named "${name}" was found.` };
  }

  if (!isValidTemperature(temperature)) {
    return {
      success: false,
      message: "Invalid temperature. Please enter a number between 10 and 32.",
    };
  }

  room.temperature = temperature;

  return {
    success: true,
    message: `${room.name} temperature is now ${room.temperature} C`,
  };
}

// Turns off the lights in every room.
function turnOffAllLights() {
  rooms.forEach((room) => {
    room.lightOn = false;
  });

  return { success: true, message: "All lights have been turned off." };
}

// Returns a copy of all rooms, so callers can't mutate internal state directly.
function getAllRooms() {
  return rooms.map((room) => ({ ...room }));
}

module.exports = {
  addRoom,
  toggleLight,
  setTemperature,
  turnOffAllLights,
  getAllRooms,
  findRoom,
};