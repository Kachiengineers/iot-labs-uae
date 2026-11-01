"""Beep three times. If you hear only clicks, set BUZZER_IS_ACTIVE = False."""
import time
from devices.buzzer import Buzzer

buzzer = Buzzer()
for _ in range(3):
    buzzer.beep(); time.sleep(0.6)
buzzer.close()
