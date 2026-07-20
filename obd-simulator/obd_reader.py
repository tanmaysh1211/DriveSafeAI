import os
import sys
import csv
import time
import math
import argparse
import datetime
import random

try:
    import gpsd
    GPS_AVAILABLE = True
except ImportError:
    GPS_AVAILABLE = False

try:
    import obd
    OBD_AVAILABLE = True
except ImportError:
    OBD_AVAILABLE = False
    print("[obd_reader] python-obd not installed. Run: pip install obd")

DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "live_trip.csv")

OBD_COMMANDS = {
    "speed":              obd.commands.SPEED       if OBD_AVAILABLE else None,
    "rpm":                obd.commands.RPM         if OBD_AVAILABLE else None,
    "engine_temperature": obd.commands.COOLANT_TEMP if OBD_AVAILABLE else None,
    "throttle":           obd.commands.THROTTLE_POS if OBD_AVAILABLE else None,
}

CSV_COLUMNS = [
    "timestamp", "latitude", "longitude",
    "speed", "acceleration", "rpm", "engine_temperature",
]

def parse_args():
    p = argparse.ArgumentParser(
        description="DriveSafe AI — Real OBD-II Device Reader"
    )
    p.add_argument(
        "--port",
        default=None,
        help="Serial port (e.g. /dev/rfcomm0, COM3). Auto-detects if not set.",
    )
    p.add_argument(
        "--baudrate",
        type=int,
        default=38400,
        help="Serial baud rate (default: 38400)",
    )
    p.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Polling interval in seconds (default: 1.0)",
    )
    p.add_argument(
        "--output", "-o",
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    p.add_argument(
        "--upload",
        action="store_true",
        help="Upload CSV to Spring Boot on Ctrl+C / trip end",
    )
    p.add_argument(
        "--url",
        default="http://localhost:8080",
        help="Spring Boot base URL (default: http://localhost:8080)",
    )
    p.add_argument(
        "--token",
        default="",
        help="JWT Bearer token for upload authentication",
    )
    p.add_argument(
        "--mock",
        action="store_true",
        help="Use mock OBD data (no physical device needed) — for testing",
    )
    p.add_argument(
        "--duration",
        type=int,
        default=None,
        help="Stop after N seconds (default: run until Ctrl+C)",
    )
    return p.parse_args()


class OBDConnection:
    def __init__(self, port: str = None, baudrate: int = 38400):
        self.port     = port
        self.baudrate = baudrate
        self.conn     = None

    def connect(self) -> bool:
        if not OBD_AVAILABLE:
            print("[obd] python-obd not installed")
            return False

        print(f"[obd] Connecting to ELM327"
              f"{' on ' + self.port if self.port else ' (auto-detect)'}...")

        try:
            self.conn = obd.OBD(
                portstr=self.port,
                baudrate=self.baudrate,
                fast=True,
                timeout=3,
            )

            if self.conn.is_connected():
                print(f"[obd] ✓ Connected — "
                      f"protocol: {self.conn.protocol_name()}")
                self._print_supported_pids()
                return True
            else:
                print("[obd] ✗ Could not connect. Check adapter and port.")
                return False

        except Exception as e:
            print(f"[obd] Connection error: {e}")
            return False

    def read(self) -> dict:
        if self.conn is None or not self.conn.is_connected():
            return {}

        readings = {}
        for name, cmd in OBD_COMMANDS.items():
            if cmd is None:
                continue
            try:
                response = self.conn.query(cmd)
                if not response.is_null():
                    readings[name] = float(response.value.magnitude)
                else:
                    readings[name] = None
            except Exception:
                readings[name] = None

        return readings

    def disconnect(self):
        if self.conn:
            self.conn.close()
            print("[obd] Disconnected from ELM327")

    def _print_supported_pids(self):
        if self.conn:
            supported = [
                cmd.name for cmd in self.conn.supported_commands
                if hasattr(cmd, "name")
            ]
            print(f"[obd] Supported PIDs: {len(supported)} "
                  f"({', '.join(supported[:8])}...)")

class GPSReader:
    def __init__(self):
        self._last_lat = 12.9352   # Koramangala fallback
        self._last_lng = 77.6245
        self._connected = False

        if GPS_AVAILABLE:
            try:
                gpsd.connect()
                self._connected = True
                print("[gps] ✓ gpsd connected")
            except Exception as e:
                print(f"[gps] gpsd unavailable ({e}) — using simulated GPS")

    def read(self):
        if self._connected:
            try:
                packet = gpsd.get_current()
                if packet.mode >= 2:   # 2D or 3D fix
                    self._last_lat = packet.lat
                    self._last_lng = packet.lon
            except Exception:
                pass
        return self._last_lat, self._last_lng

class MockOBD:
    def __init__(self):
        self._speed    = 60.0
        self._rpm      = 2000.0
        self._eng_temp = 90.0

    def read(self) -> dict:
        target = random.gauss(70, 20)
        self._speed = max(0, min(130, self._speed * 0.75 + target * 0.25))

        if random.random() < 0.05:
            self._speed = max(0, self._speed - random.uniform(15, 35))

        self._rpm      = max(700, min(5000, random.gauss(2200, 600)))
        self._eng_temp = max(85, min(105, random.gauss(92, 3)))

        return {
            "speed":              round(self._speed,    1),
            "rpm":                round(self._rpm,      0),
            "engine_temperature": round(self._eng_temp, 1),
        }

class MockGPS:
    def __init__(self):
        from gps_route import get_route, interpolate_route, add_gps_noise
        wpts         = get_route(DEFAULT_ROUTE)
        pts          = interpolate_route(wpts, points_per_segment=50)
        self._points = add_gps_noise(pts, noise_meters=4.0)
        self._idx    = 0

    def read(self):
        lat, lng = self._points[self._idx % len(self._points)]
        self._idx += 1
        return lat, lng

def run_reader(args) -> list:
    if args.mock:
        print("[obd_reader] Running in MOCK mode (no real device needed)\n")
        obd_source = MockOBD()
        gps_source = MockGPS()
    else:
        obd_source = OBDConnection(port=args.port, baudrate=args.baudrate)
        gps_source = GPSReader()
        if not obd_source.connect():
            print("[obd_reader] Could not connect to OBD device. "
                  "Use --mock for testing.")
            sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    csv_file   = open(args.output, "w", newline="", encoding="utf-8")
    csv_writer = csv.DictWriter(csv_file, fieldnames=CSV_COLUMNS)
    csv_writer.writeheader()

    rows       = []
    prev_speed = None
    start_ts   = time.time()
    row_count  = 0

    print(f"[obd_reader] Recording to {args.output}")
    print(f"[obd_reader] Press Ctrl+C to stop and save\n")
    print(f"{'Time':<22} {'Lat':>10} {'Lng':>11} "
          f"{'Speed':>7} {'Accel':>7} {'RPM':>6} {'Temp':>6}")
    print("─" * 75)

    try:
        while True:
            if args.duration and (time.time() - start_ts) >= args.duration:
                print(f"\n[obd_reader] Duration limit ({args.duration}s) reached.")
                break

            loop_start = time.time()

            obd_data = obd_source.read()
            lat, lng = gps_source.read()

            speed    = float(obd_data.get("speed", 0) or 0)
            rpm      = float(obd_data.get("rpm",   0) or 0)
            eng_temp = float(obd_data.get("engine_temperature", 90) or 90)

            if prev_speed is not None:
                accel = (speed - prev_speed) / args.interval
            else:
                accel = 0.0
            accel = max(-15.0, min(15.0, accel))

            prev_speed = speed

            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            row = {
                "timestamp":          timestamp,
                "latitude":           lat,
                "longitude":          lng,
                "speed":              round(speed,    2),
                "acceleration":       round(accel,    3),
                "rpm":                round(rpm,      0),
                "engine_temperature": round(eng_temp, 1),
            }

            rows.append(row)
            csv_writer.writerow(row)
            csv_file.flush()   # write immediately — survive a crash
            row_count += 1

            print(
                f"{timestamp:<22} "
                f"{lat:>10.6f} "
                f"{lng:>11.6f} "
                f"{speed:>7.1f} "
                f"{accel:>7.3f} "
                f"{rpm:>6.0f} "
                f"{eng_temp:>6.1f}"
            )
            elapsed = time.time() - loop_start
            sleep_t = max(0, args.interval - elapsed)
            time.sleep(sleep_t)

    except KeyboardInterrupt:
        print(f"\n[obd_reader] Stopped by user after {row_count} readings.")

    finally:
        csv_file.close()
        if not args.mock:
            obd_source.disconnect()

    print(f"[obd_reader] CSV saved → {args.output} ({len(rows)} rows)")
    return rows

def upload_csv(csv_path: str, base_url: str, token: str) -> None:
    try:
        import requests
    except ImportError:
        print("[upload] requests not installed. Run: pip install requests")
        return

    url     = f"{base_url}/api/trips/upload"
    headers = {"Authorization": f"Bearer {token}"}

    print(f"\n[upload] Uploading {csv_path} → {url}")

    with open(csv_path, "rb") as f:
        resp = requests.post(
            url,
            headers=headers,
            files={"file": (os.path.basename(csv_path), f, "text/csv")},
            timeout=30,
        )

    if resp.status_code in (200, 201):
        d = resp.json()
        print(f"[upload] ✓ Trip processed!")
        print(f"Trip ID      : {d.get('tripId')}")
        print(f"Drive Score  : {d.get('driveScore')}")
        print(f"Risk Level   : {d.get('riskLevel')}")
        print(f"Points Earned: {d.get('pointsEarned')}")
        tip = str(d.get("aiRecommendation", ""))
        print(f"         AI Tip       : {tip[:100]}{'...' if len(tip)>100 else ''}")
    else:
        print(f"[upload] ✗ HTTP {resp.status_code}: {resp.text[:200]}")

def main():
    args = parse_args()

    print(f"\n🚗 DriveSafe AI — OBD Reader")
    print(f"Mode    : {'MOCK (no hardware)' if args.mock else 'REAL ELM327'}")
    print(f"Output  : {args.output}")
    print(f"Interval: {args.interval}s per reading\n")

    rows = run_reader(args)

    if not rows:
        print("[obd_reader] No data collected.")
        return

    if args.upload:
        if not args.token:
            print("[upload] ✗ --token required. "
                  "Get it from POST /api/auth/login")
        else:
            upload_csv(args.output, args.url, args.token)


if __name__ == "__main__":
    main()
