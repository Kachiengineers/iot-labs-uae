// prompt.js
// Handles all direct interaction with the command line: showing the menu
// and reading input from the user.

const promptSync = require("prompt-sync")({ sigint: true });
const { printDivider } = require("./utilities");

// Displays the main menu and returns the user's raw choice as a string.
function askMenuChoice() {
  console.log("\nSmart Room Setup Assistant");
  console.log("1. Add Room");
  console.log("2. Toggle Light");
  console.log("3. Set Temperature");
  console.log("4. Display Rooms");
  console.log("5. Turn Off All Lights");
  console.log("6. Exit");

  return promptSync("Enter your choice: ");
}

function askNewRoomName() {
  return promptSync("Enter room name: ");
}

function askRoomNameForToggle() {
  return promptSync("Enter room name to toggle light: ");
}

function askRoomNameForTemperature() {
  return promptSync("Enter room name to set temperature: ");
}

function askNewTemperature() {
  return promptSync("Enter new temperature: ");
}

function printMessage(message) {
  console.log(message);
}

// Prints the status of every room in the required format.
function printRooms(rooms) {
  if (rooms.length === 0) {
    console.log("No rooms have been added yet.");
    return;
  }

  rooms.forEach((room) => {
    console.log(
      `Room: ${room.name}, Light: ${room.lightOn ? "On" : "Off"}, Temperature: ${room.temperature} C`
    );
  });
}

module.exports = {
  askMenuChoice,
  askNewRoomName,
  askRoomNameForToggle,
  askRoomNameForTemperature,
  askNewTemperature,
  printMessage,
  printRooms,
  printDivider,
};