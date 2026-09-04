// index.js
// Main entry point. Wires together the room logic (rooms.js), the
// command-line interface (prompt.js), and helper utilities (utilities.js).

const rooms = require("./rooms"); //const is a javascript synatx that assigns variable permanently. go find the file rooms.js (in the same folder, that's what ./ means), run it, and give me back whatever it exports. Store that in a variable called rooms
const cli = require("./prompt"); // require is used to speak to other sub files in the folder. in this case, it is prompt and rooms

function handleAddRoom() { //this function ask for a room name and adds it and then prints it
  const name = cli.askNewRoomName();
  const result = rooms.addRoom(name);
  cli.printMessage(result.message);
}

function handleToggleLight() { //asks which room, flips its light on/off, prints the result.
  const name = cli.askRoomNameForToggle();
  const result = rooms.toggleLight(name);
  cli.printMessage(result.message);
}

function handleSetTemperature() { //It first asks for a room name,
  const name = cli.askRoomNameForTemperature();

  if (!rooms.findRoom(name)) { // then checks if that room actually exists
    cli.printMessage(`No room named "${name}" was found.`);
    return;
  }

  const rawTemperature = cli.askNewTemperature(); //we ask for a new temperature and save it under this new variable named rawtemperature
  const temperature = Number(rawTemperature); //tries to convert that text into an actual number

  if (rawTemperature.trim() === "" || Number.isNaN(temperature)) { //the user typed nothing (or just spaces) or the conversion failed cos they typed the wrong thing eg "edwfsfv"
    cli.printMessage("Invalid temperature. Please enter a numeric value.");
    return;
  }

  const result = rooms.setTemperature(name, temperature); //sets the temperature and shows the result.
  cli.printMessage(result.message);
}

function handleDisplayRooms() { //shows all rooms
  cli.printRooms(rooms.getAllRooms());
}

function handleTurnOffAllLights() { //turns off all lights
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