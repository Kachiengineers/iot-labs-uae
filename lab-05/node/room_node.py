"""Smart Room Node (Lab 05): control logic only.

All hardware access lives in devices/, all network access lives in api.py,
and all tunable values live in config.py. This file is the only place the
two meet; devices/ and api.py know nothing about each other.

The light has one source of truth: the server.
    Online   the LED follows the room's `light` field, polled every POLL_INTERVAL.
             The node writes `light` only when occupancy CHANGES
             (Empty -> Occupied: on, Occupied -> Empty: off), so a dashboard
             click holds until the next occupancy transition.
    Offline  the LED follows occupancy locally, exactly as in Lab 04, and the
             LCD shows OFFLINE. The next successful poll hands control back.

The over-temperature alarm (buzzer + "ALERT: HOT") is local only and never
waits for the network: a fire alarm that needs WiFi is not a fire alarm.

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

import api
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
        self.fresh_reading = False   # a good reading arrived since the last report
        self.last_motion = 0.0       # monotonic time motion was last seen
        self.last_beep = 0.0
        self.next_dht_read = 0.0
        self.shown = [None, None]    # what is currently on each LCD line

        # Network state (Lab 05)
        self.online = True           # assume online until a request fails
        self.server_light = None     # the room's `light` on the server; None until the first poll
        self.led_lit = False         # what the LED is actually doing (Led() starts off)
        self.next_report = 0.0
        self.next_poll = 0.0
        self.last_api_error = None   # so a repeated 4xx is logged once, not every poll
        # Changes the server has not heard about yet. At start-up the server may
        # still hold `occupied` from a previous run, so occupancy is sent once.
        # `light` is only written on a real transition, never at start-up.
        self.occupancy_unsent = True
        self.light_unsent = False

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
        log(f"Reporting as room {config.ROOM_ID} to {config.API_BASE_URL}")
        while True:
            now = time.monotonic()
            self.update_occupancy(now)
            if now >= self.next_dht_read:
                self.next_dht_read = now + config.DHT_READ_INTERVAL
                self.read_climate()
            self.update_buzzer(now)
            if now >= self.next_poll:
                self.next_poll = now + config.POLL_INTERVAL
                self.poll_server()
            if now >= self.next_report:
                self.next_report = now + config.REPORT_INTERVAL
                self.report_reading()
            self.update_led()
            self.update_display()
            self.wake.wait(config.LOOP_PERIOD)   # sleeps, but motion wakes us early
            self.wake.clear()

    # ---- occupancy -------------------------------------------------------
    def update_occupancy(self, now):
        if self.motion_pending or self.pir.motion_detected:
            self.motion_pending = False
            self.last_motion = now           # any motion restarts the countdown
            if not self.occupied:
                self.set_occupied(True)
        elif self.occupied and now - self.last_motion >= config.OCCUPANCY_TIMEOUT:
            self.set_occupied(False)

    def set_occupied(self, occupied):
        """A real transition: tell the server at once, and set the light to match.

        Motion while already occupied never gets here, so it never re-asserts
        the light and cannot undo a dashboard click.
        """
        self.occupied = occupied
        if occupied:
            log("Room OCCUPIED (motion detected)")
        else:
            log(f"Room EMPTY (no motion for {config.OCCUPANCY_TIMEOUT:.0f}s)")
        self.occupancy_unsent = True
        self.light_unsent = True
        if self.online:
            self.send_unsent_changes()
        # Offline: they stay unsent and go out on the first poll that succeeds.

    # ---- talking to the server --------------------------------------------
    def call_server(self, description, request, *args):
        """Run one api.py request. Return its result, or None if it failed.

        Never raises, so a network problem can never crash the node. An outage
        is logged once when it starts and once when it ends, not per retry.
        """
        try:
            result = request(*args)
        except api.ServerUnreachable as err:
            if self.online:
                self.online = False
                log(f"Server unreachable ({err} during {description}); "
                    f"OFFLINE - light now follows occupancy locally")
            return None
        except api.ApiError as err:
            # The server answered, so we are online, but it refused the request.
            self.mark_online()
            if str(err) != self.last_api_error:
                log(f"Server rejected {description}: {err}")
                self.last_api_error = str(err)
            return None
        self.mark_online()
        self.last_api_error = None
        return result

    def mark_online(self):
        if not self.online:
            self.online = True
            log("Server reachable again; ONLINE - server controls the light")

    def send_unsent_changes(self):
        """Send the occupancy (and, after a transition, the light) the server is missing."""
        if self.occupancy_unsent:
            if self.call_server("occupancy update", api.set_occupancy, self.occupied) is None:
                return
            self.occupancy_unsent = False
        if self.light_unsent:
            room = self.call_server("light update", api.set_light, self.occupied)
            if room is None:
                return
            self.light_unsent = False
            self.server_light = room["light"]

    def poll_server(self):
        """Every POLL_INTERVAL: catch up on unsent changes, then read the room's light."""
        if self.occupancy_unsent or self.light_unsent:
            self.send_unsent_changes()
            if self.occupancy_unsent or self.light_unsent:
                return                   # still failing; try again next poll
        room = self.call_server("light poll", api.get_room)
        if room is not None:
            self.server_light = room["light"]

    def report_reading(self):
        """Every REPORT_INTERVAL: send the latest good reading.

        Skipped when no good DHT read arrived since the last report (never
        send a failed read) and while offline (the 2 s poll is the health
        check, so the loop does not also wait out a timeout here).
        """
        if not self.fresh_reading or not self.online:
            return
        if self.call_server("reading upload", api.post_reading,
                            self.temperature, self.humidity) is not None:
            self.fresh_reading = False

    # ---- the light ---------------------------------------------------------
    def update_led(self):
        if self.online:
            if self.server_light is None:
                return                   # no answer from the server yet: leave the LED as it is
            lit, source = self.server_light, "server"
        else:
            lit, source = self.occupied, "local fallback"
        if lit != self.led_lit:          # only switch on a change: no flicker
            self.led.on() if lit else self.led.off()
            self.led_lit = lit
            log(f"Light {'ON' if lit else 'OFF'} ({source})")

    # ---- sensing and the alarm ------------------------------------------
    def read_climate(self):
        reading = self.dht.read()
        if reading is None:
            log(f"DHT read failed ({self.dht.last_error}); keeping last good value")
            return
        self.temperature, self.humidity = reading
        self.fresh_reading = True
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
        # Line 1: readings, unchanged from Lab 04.
        # Line 2: occupancy, with OFFLINE added while the server is unreachable so
        # anyone looking at the device can tell. "ALERT: HOT" takes priority.
        if self.temperature is None:
            line1 = "T:--.-C H:--%"
        else:
            line1 = f"T:{self.temperature:.1f}C H:{self.humidity:.0f}%"
        if self.alert:
            line2 = "ALERT: HOT"
        else:
            line2 = "Occupied" if self.occupied else "Empty"
            if not self.online:
                line2 += " OFFLINE"      # "Occupied OFFLINE" is exactly 16 chars

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
