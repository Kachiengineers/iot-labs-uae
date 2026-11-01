"""All tunable values for the room node live here (requirement 15).

Pins are BCM GPIO numbers, not physical header pin numbers.
"""

# --- Server (Lab 05) ------------------------------------------------------
# The laptop's WiFi address on the hotspot. It can change every time you
# reconnect: check it with ipconfig on the laptop at the start of each session.
API_BASE_URL = "http://10.26.163.191:3000/api"
ROOM_ID = 19                 # created once with POST /api/rooms; the node never creates rooms
REPORT_INTERVAL = 10.0       # seconds between readings sent to the server
POLL_INTERVAL = 2.0          # seconds between "what should the light be?" requests
REQUEST_TIMEOUT = 2.5        # seconds before any request gives up (lab: 2 to 3 s)

# --- Pins (BCM numbering) -------------------------------------------------
DHT_PIN = 4          # DHT22 DATA      -> physical pin 7
PIR_PIN = 17         # PIR OUT         -> physical pin 11
LED_PIN = 22         # LED anode (via 220-330 ohm resistor) -> physical pin 15
BUZZER_PIN = 27      # Buzzer +        -> physical pin 13
# LCD uses the I2C bus: SDA = GPIO2 (pin 3), SCL = GPIO3 (pin 5)

# --- DHT sensor -----------------------------------------------------------
DHT_MODEL = "DHT22"          # "DHT22" or "DHT11"
DHT_READ_INTERVAL = 2.0      # seconds between reads (sensor cannot go faster)
DHT_MIN_INTERVAL = 2.0       # the device module refuses to read faster than this

# --- Buzzer ---------------------------------------------------------------
BUZZER_IS_ACTIVE = True      # True: active buzzer. False: passive (needs PWM tone)
BUZZER_FREQUENCY = 2000      # Hz, only used for a passive buzzer
BEEP_DURATION = 0.2          # seconds the buzzer sounds per beep
BEEP_INTERVAL = 2.0          # seconds between beeps while in ALERT

# --- LCD (I2C) ------------------------------------------------------------
LCD_I2C_ADDRESS = 0x27       # find yours with: i2cdetect -y 1 (often 0x27 or 0x3F)
LCD_I2C_PORT = 1
LCD_EXPANDER = "PCF8574"     # the chip on almost every I2C backpack
LCD_COLS = 16
LCD_ROWS = 2

# --- Control logic --------------------------------------------------------
OCCUPANCY_TIMEOUT = 10.0     # seconds without motion before the room is "Empty"
TEMP_THRESHOLD = 28.0        # degrees C: ALERT at or above this
HYSTERESIS = 1.0             # degrees C: leave ALERT only at THRESHOLD - HYSTERESIS or below
LOOP_PERIOD = 0.1            # seconds; main loop tick (motion wakes it early)
