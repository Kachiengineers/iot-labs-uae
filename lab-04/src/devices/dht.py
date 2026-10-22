"""DHT22 / DHT11 temperature and humidity device module.

read() returns (temperature_c, humidity_pct) or None if the read failed.
Failures (checksum errors, timeouts) are routine for this sensor.
"""
import time

import adafruit_dht
import board

import config


class Dht:
    def __init__(self, pin=config.DHT_PIN, model=config.DHT_MODEL):
        sensor_class = adafruit_dht.DHT11 if model == "DHT11" else adafruit_dht.DHT22
        self._sensor = sensor_class(getattr(board, f"D{pin}"), use_pulseio=False)
        self._last_time = None
        self._last_result = None
        self.last_error = None  # text of the most recent failure, for logging

    def read(self):
        """Return (temp_c, humidity_pct), or None on failure.

        Calls made less than config.DHT_MIN_INTERVAL apart do not touch the
        sensor; they return the previous result instead.
        """
        now = time.monotonic()
        if self._last_time is not None and now - self._last_time < config.DHT_MIN_INTERVAL:
            return self._last_result
        self._last_time = now
        try:
            temperature = self._sensor.temperature
            humidity = self._sensor.humidity
            if temperature is None or humidity is None:
                raise RuntimeError("sensor returned no data")
            self._last_result = (temperature, humidity)
        except (RuntimeError, OSError) as err:
            self.last_error = str(err)
            self._last_result = None
        return self._last_result

    def close(self):
        self._sensor.exit()
