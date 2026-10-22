# Lab 04: Smart Room Node
1. Enable I2C (`sudo raspi-config` → Interface Options → I2C), run `i2cdetect -y 1`, and put the LCD address in `src/config.py`.
2. From `lab-04`: `python3 -m venv --system-site-packages venv && source venv/bin/activate && pip install -r requirements.txt`
3. Run the node from `lab-04`: `python3 src/room_node.py` (Ctrl+C stops it cleanly).
4. Test one component from `lab-04/src`: `python3 -m tests.test_dht` (also `test_led`, `test_buzzer`, `test_pir`, `test_lcd`).
