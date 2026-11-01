"""HC-SR501 PIR motion sensor device module.

The module's output is 3.3 V, so it connects straight to a GPIO input.
Callers can poll motion_detected or register callbacks for start/stop.
"""
from gpiozero import MotionSensor

import config


class Pir:
    def __init__(self, pin=config.PIR_PIN):
        # The HC-SR501 drives its output actively, so no pull-up is needed.
        self._sensor = MotionSensor(pin, pull_up=False)

    @property
    def motion_detected(self):
        return self._sensor.motion_detected

    def on_motion_start(self, callback):
        """callback() is called (from a background thread) when motion starts."""
        self._sensor.when_motion = lambda: callback()

    def on_motion_stop(self, callback):
        """callback() is called (from a background thread) when motion stops."""
        self._sensor.when_no_motion = lambda: callback()

    def close(self):
        self._sensor.close()
