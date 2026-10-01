(function(global) {
  function getThemeMode(rooms) {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return true;
    }

    return !rooms.some(room => room && room.light === true);
  }

  const api = { getThemeMode };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.ThemeState = api;
})(typeof window !== 'undefined' ? window : globalThis);
