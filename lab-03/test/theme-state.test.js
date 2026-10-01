const { getThemeMode } = require('../public/js/theme-state.js');

const test = require('node:test');
const assert = require('node:assert/strict');

test('dark mode when all rooms are off', () => {
  assert.equal(getThemeMode([{ light: false }, { light: false }]), true);
});

test('light mode when at least one room is on', () => {
  assert.equal(getThemeMode([{ light: false }, { light: true }]), false);
});

test('dark mode when there are no rooms yet', () => {
  assert.equal(getThemeMode([]), true);
});
