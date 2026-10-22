"""Print a line whenever motion starts or stops. Ctrl+C to quit."""
from signal import pause
from devices.pir import Pir

pir = Pir()
pir.on_motion_start(lambda: print("motion started"))
pir.on_motion_stop(lambda: print("motion stopped"))
print("Waiting for motion (allow ~1 min warm-up)...")
pause()
