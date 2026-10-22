"""Print temperature and humidity every 2 s for 30 s; failures must not crash."""
import time
from devices.dht import Dht

dht = Dht()
for _ in range(15):
    reading = dht.read()
    print(reading if reading else f"read failed: {dht.last_error}")
    time.sleep(2)
dht.close()
