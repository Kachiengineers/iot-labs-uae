"""LED device module: the room light. Knows nothing about rooms or occupancy."""
from gpiozero import LED as _GpioLED

import config


class Led:
    def __init__(self, pin=config.LED_PIN):
        self._led = _GpioLED(pin)

    def on(self):
        self._led.on()

    def off(self):
        self._led.off()

    @property
    def is_on(self):
        return self._led.is_lit

    def close(self):
        """Turn the LED off and release the GPIO pin."""
        self._led.off()
        self._led.close()
