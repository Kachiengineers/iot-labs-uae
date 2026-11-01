"""16x2 character LCD on an I2C (PCF8574) backpack.

Enable I2C first (sudo raspi-config -> Interface Options -> I2C), then
find the address with `i2cdetect -y 1` and put it in config.py.
"""
from RPLCD.i2c import CharLCD

import config


class Lcd:
    def __init__(self, address=config.LCD_I2C_ADDRESS, port=config.LCD_I2C_PORT):
        self._cols = config.LCD_COLS
        self._lcd = CharLCD(
            i2c_expander=config.LCD_EXPANDER,
            address=address,
            port=port,
            cols=config.LCD_COLS,
            rows=config.LCD_ROWS,
            auto_linebreaks=False,
        )
        self._lcd.clear()

    def write_line(self, row, text):
        """Write text on a row (0 = top, 1 = bottom).

        Text is padded to the full width so leftovers from a longer previous
        message are overwritten, without clearing the screen (no flicker).
        """
        self._lcd.cursor_pos = (row, 0)
        self._lcd.write_string(text[: self._cols].ljust(self._cols))

    def clear(self):
        self._lcd.clear()

    def close(self):
        """Clear the display and release the I2C bus."""
        self._lcd.close(clear=True)
