"""Smart Room Node: control logic only.

All hardware access lives in devices/; all tunable values live in config.py.

States and what each one drives:
    Empty     LED off, buzzer silent      LCD line 2: "Empty"
    Occupied  LED on,  buzzer silent      LCD line 2: "Occupied"
    ALERT     (overlays the above) buzzer beeps every BEEP_INTERVAL,
              LCD line 2: "ALERT: HOT" (takes priority)

Events:
    motion seen            -> Occupied, restart the occupancy countdown
    no motion for TIMEOUT  -> Empty
    temp >= THRESHOLD      -> enter ALERT
    temp <= THRESHOLD - HYSTERESIS -> leave ALERT (hysteresis stops chatter)
"""
import signal
import threading
import time
from datetime import datetime

import config
from devices.buzzer import Buzzer
from devices.dht import Dht
from devices.lcd import Lcd
from devices.led import Led
from devices.pir import Pir


def log(message):
    """Print one timestamped line to the console."""
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}", flush=True)


class RoomNode:
    def __init__(self):
        self.led = Led()
        self.buzzer = Buzzer()
        self.pir = Pir()
        self.dht = Dht()
        self.lcd = Lcd()

        self.occupied = False
        self.alert = False
        self.temperature = None      # last GOOD reading, None until the first one
        self.humidity = None
        self.last_motion = 0.0       # monotonic time motion was last seen
        self.last_beep = 0.0
        self.next_dht_read = 0.0
        self.shown = [None, None]    # what is currently on each LCD line

        # PIR callbacks run in a gpiozero background thread. They only set
        # flags; all decisions are made in the main loop, which the event
        # wakes immediately so motion is handled promptly.
        self.motion_pending = False
        self.wake = threading.Event()
        self.pir.on_motion_start(self._on_motion_start)
        self.pir.on_motion_stop(self.wake.set)

    def _on_motion_start(self):
        self.motion_pending = True
        self.wake.set()

    # ---- main loop -------------------------------------------------------
    def run(self):
        log("Room node started (PIR may give false motion for ~1 min while it warms up).")
        log(f"Threshold {config.TEMP_THRESHOLD:.1f}C, hysteresis {config.HYSTERESIS:.1f}C, "
            f"occupancy timeout {config.OCCUPANCY_TIMEOUT:.0f}s")
        while True:
            now = time.monotonic()
            self.update_occupancy(now)
            if now >= self.next_dht_read:
                self.next_dht_read = now + config.DHT_READ_INTERVAL
                self.read_climate()
            self.update_buzzer(now)
            self.update_display()
            self.wake.wait(config.LOOP_PERIOD)   # sleeps, but motion wakes us early
            self.wake.clear()

    # ---- occupancy and the light ----------------------------------------
    def update_occupancy(self, now):
        if self.motion_pending or self.pir.motion_detected:
            self.motion_pending = False
            self.last_motion = now           # any motion restarts the countdown
            if not self.occupied:
                self.set_occupied(True)
        elif self.occupied and now - self.last_motion >= config.OCCUPANCY_TIMEOUT:
            self.set_occupied(False)

    def set_occupied(self, occupied):
        self.occupied = occupied
        if occupied:
            self.led.on()
            log("Room OCCUPIED (motion detected) - light on")
        else:
            self.led.off()
            log(f"Room EMPTY (no motion for {config.OCCUPANCY_TIMEOUT:.0f}s) - light off")

    # ---- sensing and the alarm ------------------------------------------
    def read_climate(self):
        reading = self.dht.read()
        if reading is None:
            log(f"DHT read failed ({self.dht.last_error}); keeping last good value")
            return
        self.temperature, self.humidity = reading
        self.update_alarm()

    def update_alarm(self):
        if not self.alert and self.temperature >= config.TEMP_THRESHOLD:
            self.alert = True
            self.last_beep = float("-inf")   # beep straight away
            log(f"ALERT ON: {self.temperature:.1f}C >= {config.TEMP_THRESHOLD:.1f}C")
        elif self.alert and self.temperature <= config.TEMP_THRESHOLD - config.HYSTERESIS:
            self.alert = False
            self.buzzer.off()
            log(f"ALERT OFF: {self.temperature:.1f}C <= "
                f"{config.TEMP_THRESHOLD - config.HYSTERESIS:.1f}C")

    def update_buzzer(self, now):
        """While in ALERT, give a short beep every BEEP_INTERVAL seconds."""
        if self.alert and now - self.last_beep >= config.BEEP_INTERVAL:
            self.buzzer.beep()
            self.last_beep = now

    # ---- display ---------------------------------------------------------
    def update_display(self):
        if self.temperature is None:
            line1 = "T:--.-C H:--%"
        else:
            line1 = f"T:{self.temperature:.1f}C H:{self.humidity:.0f}%"
        if self.alert:
            line2 = "ALERT: HOT"
        else:
            line2 = "Occupied" if self.occupied else "Empty"

        # Only rewrite a line when its content has changed (no flicker).
        for row, text in enumerate((line1, line2)):
            if text != self.shown[row]:
                self.lcd.write_line(row, text)
                self.shown[row] = text

    # ---- shutdown --------------------------------------------------------
    def shutdown(self):
        # Buzzer first: a sounding buzzer is the worst thing to leave behind.
        for close in (self.buzzer.close, self.led.close, self.lcd.close,
                      self.pir.close, self.dht.close):
            try:
                close()
            except Exception as err:   # keep going so every device gets closed
                log(f"Cleanup error: {err}")
        log("Room node stopped: LED off, buzzer silent, display cleared. Goodbye.")


def _raise_keyboard_interrupt(signum, frame):
    raise KeyboardInterrupt


def main():
    # Treat `kill` (SIGTERM) the same as Ctrl+C so cleanup always runs.
    signal.signal(signal.SIGTERM, _raise_keyboard_interrupt)
    node = RoomNode()
    try:
        node.run()
    except KeyboardInterrupt:
        print()
        log("Ctrl+C received, shutting down...")
    finally:
        node.shutdown()


if __name__ == "__main__":
    main()
