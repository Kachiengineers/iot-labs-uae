"""All configuration for the room node, in one place.

Nothing network related is hard-coded anywhere else. Copy the hardware
settings (pins, thresholds) from your Lab 04 config.py into the bottom section.
"""

# --- Server (Lab 05) --------------------------------------------------------
# The laptop's WiFi IP on the hotspot. It can change every time you reconnect:
# check it with ipconfig / ifconfig / ip addr at the start of each session.
API_BASE_URL = "http://192.168.43.17:3000/api"

# Created once by hand with:  curl -X POST <API_BASE_URL>/rooms \
#   -H "Content-Type: application/json" -d '{"name": "Lab Room"}'
# The node never creates rooms.
ROOM_ID = 1

REPORT_INTERVAL_S = 10.0      # how often to POST a temperature/humidity reading
POLL_INTERVAL_S = 2.0         # how often to GET the room's light state
REQUEST_TIMEOUT_S = 2.5       # every request gives up after this (spec: 2-3 s)

# --- Behaviour carried over from Lab 04 ------------------------------------
DHT_MIN_INTERVAL_S = 2.0      # DHT22 must not be read faster than this
OCCUPANCY_TIMEOUT_S = 10.0    # no motion for this long -> room is empty
HOT_THRESHOLD_C = 30.0        # at or above this: buzzer + "ALERT: HOT"
LOOP_SLEEP_S = 0.1            # main loop tick

# --- Hardware pins (replace with your Lab 04 values) -------------------------
DHT_PIN = 4
PIR_PIN = 17
LED_PIN = 27
BUZZER_PIN = 22
LCD_I2C_ADDRESS = 0x27
