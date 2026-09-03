// index.js
// Main entry point. Wires together the room logic (rooms.js), the
// command-line interface (prompt.js), and helper utilities (utilities.js).

const rooms = require("./rooms");
const cli = require("./prompt");

function handleAddRoom() {
  const name = cli.askNewRoomName();
  const result = rooms.addRoom(name);
  cli.printMessage(result.message);
}

function handleToggleLight() {
  const name = cli.askRoomNameForToggle();
  const result = rooms.toggleLight(name);
  cli.printMessage(result.message);
}

function handleSetTemperature() {
  const name = cli.askRoomNameForTemperature();

  if (!rooms.findRoom(name)) {
    cli.printMessage(`No room named "${name}" was found.`);
    return;
  }

  const rawTemperature = cli.askNewTemperature();
  const temperature = Number(rawTemperature);

  if (rawTemperature.trim() === "" || Number.isNaN(temperature)) {
    cli.printMessage("Invalid temperature. Please enter a numeric value.");
    return;
  }

  const result = rooms.setTemperature(name, temperature);
  cli.printMessage(result.message);
}

function handleDisplayRooms() {
  cli.printRooms(rooms.getAllRooms());
}

function handleTurnOffAllLights() {
  const result = rooms.turnOffAllLights();
  cli.printMessage(result.message);
}

function runApp() {
  let running = true;

  while (running) {
    const choice = cli.askMenuChoice();

    switch (choice) {
      case "1":
        handleAddRoom();
        break;
      case "2":
        handleToggleLight();
        break;
      case "3":
        handleSetTemperature();
        break;
      case "4":
        handleDisplayRooms();
        break;
      case "5":
        handleTurnOffAllLights();
        break;
      case "6":
        cli.printMessage("Goodbye!");
        running = false;
        break;
      default:
        cli.printMessage("Invalid choice. Please enter a number between 1 and 6.");
        break;
    }

    cli.printDivider();
  }
}

runApp();