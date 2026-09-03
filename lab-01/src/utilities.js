// utilities.js
// Small, reusable helper functions used across the application.

const MIN_START_TEMP = 18;
const MAX_START_TEMP = 26;

const MIN_ALLOWED_TEMP = 10;
const MAX_ALLOWED_TEMP = 32;

// Generates a random integer temperature between 18 and 26 (inclusive).
// Used when a new room is created.
function randomStartTemperature() {
  return randomInt(MIN_START_TEMP, MAX_START_TEMP);
}

// Generates a random integer between min and max, inclusive on both ends.
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Checks whether a value is a valid temperature within the allowed
// range (10 to 32 inclusive).
function isValidTemperature(value) {
  return (
    !Number.isNaN(value) &&
    value >= MIN_ALLOWED_TEMP &&
    value <= MAX_ALLOWED_TEMP
  );
}

// Prints a divider line, used to separate menu actions in the console.
function printDivider() {
  console.log("--------------------");
}

module.exports = {
  MIN_ALLOWED_TEMP,
  MAX_ALLOWED_TEMP,
  randomStartTemperature,
  randomInt,
  isValidTemperature,
  printDivider,
};