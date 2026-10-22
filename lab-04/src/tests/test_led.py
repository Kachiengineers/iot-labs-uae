"""Blink the LED 5 times."""
import time
from devices.led import Led

led = Led()
for _ in range(5):
    led.on(); time.sleep(0.5)
    led.off(); time.sleep(0.5)
led.close()
