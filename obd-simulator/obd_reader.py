"""
obd_reader.py — Real ELM327 OBD-II Device Reader

Connects to a physical ELM327 adapter (Bluetooth or USB) and streams
live vehicle data to DriveSafe AI's Spring Boot backend.

Hardware required:
    ELM327 OBD-II adapter — available on Amazon India for ₹500–₹1500
    Any OBD-II compatible car (most Indian cars made after 2005)

Connection options:
    Bluetooth : ELM327 Bluetooth → pair on laptop → /dev/rfcomm0  (Linux)
                                                    COM3           (Windows)
    USB       : ELM327 USB       → plug in        → /dev/ttyUSB0  (Linux)
                                                    COM4           (Windows)
    WiFi      : ELM327 WiFi      → connect to its hotspot → 192.168.0.10:35000

Install dependencies:
    pip install obd requests

Usage:
    # Auto-detect port, stream to console
    python obd_reader.py

    # Specific port, save CSV + upload to Spring Boot
    python obd_reader.py --port /dev/rfcomm0 --output live_trip.csv
                         --upload --url http://localhost:8080 --token <JWT>

    # Dry-run with mock data (no real OBD device needed)
    python obd_reader.py --mock
"""

import os
import sys
import csv
import time
import math
import argparse
import datetime
import random

# GPS library (optional — falls back to last known position if unavailable)
try:
    import gpsd
    GPS_AVAILABLE = True
except ImportError:
    GPS_AVAILABLE = False

# OBD-II library
try:
    import obd
    OBD_AVAILABLE = True
except ImportError:
    OBD_AVAILABLE = False
    print("[obd_reader] python-obd not installed. Run: pip install obd")

# ── Output path ───────────────────────────────────────────────────────────────
DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "live_trip.csv")

# ── OBD-II PIDs we read from the vehicle ─────────────────────────────────────
# Each PID maps to a python-obd command
OBD_COMMANDS = {
    "speed":              obd.commands.SPEED       if OBD_AVAILABLE else None,
    "rpm":                obd.commands.RPM         if OBD_AVAILABLE else None,
    "engine_temperature": obd.commands.COOLANT_TEMP if OBD_AVAILABLE else None,
    "throttle":           obd.commands.THROTTLE_POS if OBD_AVAILABLE else None,
}

# CSV columns — same as simulate_trip.py so Spring Boot parses identically
CSV_COLUMNS = [
    "timestamp", "latitude", "longitude",
    "speed", "acceleration", "rpm", "engine_temperature",
]


# ═════════════════════════════════════════════════════════════════════════════
# ARGUMENT PARSING
# ═════════════════════════════════════════════════════════════════════════════

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


# ═════════════════════════════════════════════════════════════════════════════
# REAL OBD CONNECTION
# ═════════════════════════════════════════════════════════════════════════════

class OBDConnection:
    """
    Wrapper around python-obd that handles connection, reconnection,
    and graceful fallback for unavailable PIDs.
    """

    def __init__(self, port: str = None, baudrate: int = 38400):
        self.port     = port
        self.baudrate = baudrate
        self.conn     = None

    def connect(self) -> bool:
        """
        Attempt to connect to the ELM327 adapter.

        python-obd auto-detects the port if port=None.
        Returns True if connected, False otherwise.
        """
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
        """
        Read all PIDs from the vehicle.
        Returns a dict of {pid_name: value} with None for unavailable PIDs.
        """
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


# ═════════════════════════════════════════════════════════════════════════════
# GPS READER
# Reads live GPS coordinates from gpsd (Linux) or falls back to last known.
# ═════════════════════════════════════════════════════════════════════════════

class GPSReader:
    """
    Reads GPS coordinates from the system's gpsd daemon.

    Setup on Raspberry Pi / Linux:
        sudo apt install gpsd gpsd-clients
        sudo gpsd /dev/ttyUSB0 -F /var/run/gpsd.sock
        python -c "import gpsd; gpsd.connect(); print(gpsd.get_current())"

    If gpsd is not available, uses the start position from gps_route.py.
    """

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
        """Return (lat, lng) from gpsd or last known position."""
        if self._connected:
            try:
                packet = gpsd.get_current()
                if packet.mode >= 2:   # 2D or 3D fix
                    self._last_lat = packet.lat
                    self._last_lng = packet.lon
            except Exception:
                pass
        return self._last_lat, self._last_lng


# ═════════════════════════════════════════════════════════════════════════════
# MOCK OBD (for testing without hardware)
# ═════════════════════════════════════════════════════════════════════════════

class MockOBD:
    """
    Generates realistic fake OBD readings for testing.
    Uses the same physics model as simulate_trip.py.
    """

    def __init__(self):
        self._speed    = 60.0
        self._rpm      = 2000.0
        self._eng_temp = 90.0

    def read(self) -> dict:
        # Smooth speed changes
        target = random.gauss(70, 20)
        self._speed = max(0, min(130, self._speed * 0.75 + target * 0.25))

        # Occasional hard braking
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
    """Moves along the default GPS route for mock mode."""

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


# ═════════════════════════════════════════════════════════════════════════════
# MAIN READER LOOP
# ═════════════════════════════════════════════════════════════════════════════

def run_reader(args) -> list:
    """
    Main polling loop — reads OBD + GPS every `interval` seconds.
    Computes acceleration from consecutive speed readings.
    Writes rows to CSV in real time.
    Returns all collected rows.
    """
    # ── Initialise sources ────────────────────────────────────────────
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

    # ── Open CSV for live writing ─────────────────────────────────────
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
            # Check duration limit
            if args.duration and (time.time() - start_ts) >= args.duration:
                print(f"\n[obd_reader] Duration limit ({args.duration}s) reached.")
                break

            loop_start = time.time()

            # ── Read sensors ──────────────────────────────────────────
            obd_data = obd_source.read()
            lat, lng = gps_source.read()

            speed    = float(obd_data.get("speed", 0) or 0)
            rpm      = float(obd_data.get("rpm",   0) or 0)
            eng_temp = float(obd_data.get("engine_temperature", 90) or 90)

            # ── Compute acceleration ──────────────────────────────────
            if prev_speed is not None:
                accel = (speed - prev_speed) / args.interval
            else:
                accel = 0.0
            # Clamp to physically reasonable range
            accel = max(-15.0, min(15.0, accel))

            prev_speed = speed

            # ── Build row ─────────────────────────────────────────────
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

            # Print to console
            print(
                f"{timestamp:<22} "
                f"{lat:>10.6f} "
                f"{lng:>11.6f} "
                f"{speed:>7.1f} "
                f"{accel:>7.3f} "
                f"{rpm:>6.0f} "
                f"{eng_temp:>6.1f}"
            )

            # Sleep for remainder of interval
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


# ═════════════════════════════════════════════════════════════════════════════
# UPLOAD HELPER
# ═════════════════════════════════════════════════════════════════════════════

def upload_csv(csv_path: str, base_url: str, token: str) -> None:
    """POST the CSV to Spring Boot's /api/trips/upload endpoint."""
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
        print(f"         Trip ID      : {d.get('tripId')}")
        print(f"         Drive Score  : {d.get('driveScore')}")
        print(f"         Risk Level   : {d.get('riskLevel')}")
        print(f"         Points Earned: {d.get('pointsEarned')}")
        tip = str(d.get("aiRecommendation", ""))
        print(f"         AI Tip       : {tip[:100]}{'...' if len(tip)>100 else ''}")
    else:
        print(f"[upload] ✗ HTTP {resp.status_code}: {resp.text[:200]}")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    args = parse_args()

    print(f"\n🚗 DriveSafe AI — OBD Reader")
    print(f"   Mode    : {'MOCK (no hardware)' if args.mock else 'REAL ELM327'}")
    print(f"   Output  : {args.output}")
    print(f"   Interval: {args.interval}s per reading\n")

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