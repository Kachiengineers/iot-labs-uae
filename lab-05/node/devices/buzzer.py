"""Buzzer device module.

Active buzzer: a steady HIGH makes a tone, so on/off is enough.
Passive buzzer: needs a square wave, so we drive it with PWM at
config.BUZZER_FREQUENCY and a 50% duty cycle.
"""
import threading

from gpiozero import DigitalOutputDevice, PWMOutputDevice

import config


class Buzzer:
    def __init__(self, pin=config.BUZZER_PIN, active=config.BUZZER_IS_ACTIVE):
        self._active = active
        if active:
            self._dev = DigitalOutputDevice(pin)
        else:
            self._dev = PWMOutputDevice(pin, frequency=config.BUZZER_FREQUENCY)
        self._timer = None  # pending "stop beeping" timer

    def on(self):
        if self._active:
            self._dev.on()
        else:
            self._dev.value = 0.5  # 50% duty square wave = audible tone

    def off(self):
        self._cancel_timer()
        self._dev.off()

    def beep(self, duration=config.BEEP_DURATION):
        """Sound one short beep without blocking the caller."""
        self._cancel_timer()
        self.on()
        self._timer = threading.Timer(duration, self._dev.off)
        self._timer.daemon = True
        self._timer.start()

    def _cancel_timer(self):
        if self._timer is not None:
            self._timer.cancel()
            self._timer = None

    def close(self):
        """Silence the buzzer and release the GPIO pin."""
        self.off()
        self._dev.close()
