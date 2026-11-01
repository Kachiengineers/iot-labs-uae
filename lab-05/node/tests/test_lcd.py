"""Show text on both lines for 5 s. Edit the Andrew ID below."""
import time
from devices.lcd import Lcd

lcd = Lcd()
lcd.write_line(0, "Hello, room node")
lcd.write_line(1, "andrew-id: uae")
time.sleep(5)
lcd.close()
