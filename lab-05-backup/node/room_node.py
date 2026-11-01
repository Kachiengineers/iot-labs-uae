"""Lab 05 room node: senses the room, reports to the API, follows the server's light.

Layers:
  devices/      talks to hardware (unchanged from Lab 04)
  api.py        talks to the server
  room_node.py  (this file) control logic; the only place the two meet

Run on the Pi:  python3 room_node.py      Stop with Ctrl+C.
"""

import logging
import time

import api
import config

# --- Device imports ----------------------------------------------------------
# ASSUMPTION: these are your Lab 04 device classes. Rename the modules/classes
# to match yours; the methods used below are listed beside each one.
from devices.dht import DHTSensor        # read() -> (temp_c, humidity) or None on failure
from devices.pir import MotionSensor     # motion() -> bool
from devices.led import Led              # on(), off()
from devices.buzzer import Buzzer        # on(), off()
from devices.lcd import Lcd              # show(line1, line2), clear()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("room_node")


class RoomNode:
    def __init__(self):
        self.dht = DHTSensor(config.DHT_PIN)
        self.pir = MotionSensor(config.PIR_PIN)
        self.led = Led(config.LED_PIN)
        self.buzzer = Buzzer(config.BUZZER_PIN)
        self.lcd = Lcd(config.LCD_I2C_ADDRESS)

        # Sensor state
        self.temperature = None
        self.humidity = None
        self.fresh_reading = False       # a good reading arrived since the last report
        self.last_dht_read = 0.0

        # Room state
        self.occupied = False
        self.last_motion = 0.0
        self.alarm = False

        # Light: what the server says, and what the LED is actually doing
        self.server_light = False
        self.led_is_on = None            # None = unknown, forces the first write

        # Connection state
        self.online = True               # assume online until a request fails
        self.pending_transition = False  # an occupancy change the server has not heard about

        # Timers
        self.last_report = 0.0
        self.last_poll = 0.0

        self.lcd_text = None             # last text written, to avoid flicker

    # --- Connection bookkeeping ----------------------------------------------
    def _call(self, description, func, *args):
        """Run one API call. Returns the result, or None if it failed.

        Logs the outage once when it starts and once when it ends, never per retry.
        """
        try:
            result = func(*args)
        except api.ServerUnreachable as exc:
            if self.online:
                log.warning("Server unreachable (%s during %s); falling back to local control",
                            exc, description)
                self.online = False
            return None
        except api.ApiError as exc:
            # The server is up but refused the request: not an outage.
            log.error("%s rejected by server: %s", description, exc)
            self._mark_online()
            return None
        self._mark_online()
        return result

    def _mark_online(self):
        if not self.online:
            log.info("Server reachable again; server controls the light")
            self.online = True

    # --- Sensing -------------------------------------------------------------
    def read_dht(self, now):
        if now - self.last_dht_read < config.DHT_MIN_INTERVAL_S:
            return
        self.last_dht_read = now
        reading = self.dht.read()
        if reading is None:
            return                       # failed read: keep the last good one, send nothing new
        self.temperature, self.humidity = reading
        self.fresh_reading = True

    def update_alarm(self):
        # Local only: never depends on the server.
        hot = self.temperature is not None and self.temperature >= config.HOT_THRESHOLD_C
        if hot != self.alarm:
            self.alarm = hot
            if hot:
                self.buzzer.on()
                log.warning("ALERT: temperature %.1f C at or above %.1f C",
                            self.temperature, config.HOT_THRESHOLD_C)
            else:
                self.buzzer.off()
                log.info("Alert cleared: temperature %.1f C", self.temperature)

    def update_occupancy(self, now):
        if self.pir.motion():
            self.last_motion = now
            if not self.occupied:
                self._occupancy_changed(True)
        elif self.occupied and now - self.last_motion >= config.OCCUPANCY_TIMEOUT_S:
            self._occupancy_changed(False)

    def _occupancy_changed(self, occupied):
        self.occupied = occupied
        log.info("Room is now %s", "OCCUPIED" if occupied else "EMPTY")
        # Spec 5.3.6: the Pi writes `light` only on a transition, never on
        # motion while already occupied, so a dashboard click is not undone.
        self.pending_transition = True
        self.sync_transition()

    def sync_transition(self):
        """Tell the server about the latest occupancy change.

        If the server is down, this stays pending and is retried when it returns,
        so the database does not keep a stale occupied value after an outage.
        """
        if not self.pending_transition:
            return
        if self._call("occupancy update", api.set_occupancy, self.occupied) is None:
            return
        if self._call("light update", api.set_light, self.occupied) is None:
            return
        self.server_light = self.occupied
        self.pending_transition = False

    # --- Network loop pieces --------------------------------------------------
    def report(self, now):
        if now - self.last_report < config.REPORT_INTERVAL_S:
            return
        self.last_report = now
        if not self.online:
            return                       # the poll is the health check while offline; no 2.5 s stall here
        if not self.fresh_reading:
            return                       # no good DHT read this cycle: skip it
        if self._call("reading upload", api.post_reading, self.temperature, self.humidity) is not None:
            self.fresh_reading = False

    def poll(self, now):
        if now - self.last_poll < config.POLL_INTERVAL_S:
            return
        self.last_poll = now
        room = self._call("light poll", api.get_room)
        if room is None:
            return
        # Back online with an unsent transition: send it before trusting the server's light.
        if self.pending_transition:
            self.sync_transition()
            return
        self.server_light = bool(room.get("light"))

    # --- Outputs ---------------------------------------------------------------
    def drive_led(self):
        # Online: the server is the source of truth. Offline: Lab 04 behaviour.
        want_on = self.server_light if self.online else self.occupied
        if want_on != self.led_is_on:    # write only on change: no flicker
            self.led.on() if want_on else self.led.off()
            self.led_is_on = want_on
            log.info("LED %s (%s)", "ON" if want_on else "OFF",
                     "server" if self.online else "local fallback")

    def drive_lcd(self):
        if self.alarm:
            line1 = "ALERT: HOT"
        elif self.temperature is None:
            line1 = "Reading..."
        else:
            line1 = f"T:{self.temperature:.1f}C H:{self.humidity:.0f}%"
        line2 = "Occupied" if self.occupied else "Empty"
        if not self.online:
            line2 += " OFFLINE"          # "Occupied OFFLINE" is exactly 16 chars
        text = (line1[:16], line2[:16])
        if text != self.lcd_text:        # write only on change: no flicker
            self.lcd.show(*text)
            self.lcd_text = text

    # --- Main loop -------------------------------------------------------------
    def run(self):
        log.info("Room node started: room %s, server %s", config.ROOM_ID, config.API_BASE_URL)
        while True:
            now = time.monotonic()
            self.read_dht(now)
            self.update_alarm()
            self.update_occupancy(now)
            self.report(now)
            self.poll(now)
            self.drive_led()
            self.drive_lcd()
            time.sleep(config.LOOP_SLEEP_S)

    def shutdown(self):
        log.info("Shutting down")
        for action in (self.led.off, self.buzzer.off, self.lcd.clear):
            try:
                action()
            except Exception as exc:     # keep shutting down even if one device fails
                log.error("Shutdown step failed: %s", exc)


def main():
    node = RoomNode()
    try:
        node.run()
    except KeyboardInterrupt:
        pass
    finally:
        node.shutdown()


if __name__ == "__main__":
    main()
