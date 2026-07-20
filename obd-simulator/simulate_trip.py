import os
import sys
import csv
import math
import time
import random
import argparse
import datetime
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from gps_route import (
    get_route,
    interpolate_route,
    add_gps_noise,
    list_routes,
    DEFAULT_ROUTE,
)

DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "DF2.csv")

PROFILES = {
    "safe": {
        "description":    "Smooth, cautious driver — score typically 20–40",
        "speed_mean":     55.0,
        "speed_std":      15.0,
        "speed_max":      85.0,
        "accel_std":      0.7,
        "brake_prob":     0.03,   
        "brake_intensity":(-2.5, -1.5),  
        "rpm_mean":       1800,
        "rpm_std":        400,
        "engine_temp":    (85, 92),
        "night_prob":     0.10,
        "stop_prob":      0.05,   
    },
    "average": {
        "description":    "Typical city driver — score typically 40–65",
        "speed_mean":     70.0,
        "speed_std":      22.0,
        "speed_max":      110.0,
        "accel_std":      1.3,
        "brake_prob":     0.08,
        "brake_intensity":(-3.5, -2.0),
        "rpm_mean":       2400,
        "rpm_std":        600,
        "engine_temp":    (88, 96),
        "night_prob":     0.25,
        "stop_prob":      0.08,
    },
    "aggressive": {
        "description":    "Fast, aggressive driver — score typically 65–90",
        "speed_mean":     95.0,
        "speed_std":      30.0,
        "speed_max":      145.0,
        "accel_std":      2.5,
        "brake_prob":     0.15,
        "brake_intensity":(-5.5, -3.0),
        "rpm_mean":       3200,
        "rpm_std":        800,
        "engine_temp":    (92, 102),
        "night_prob":     0.40, 
    },
}

def parse_args():
    p = argparse.ArgumentParser(
        description="DriveSafe AI OBD Trip Simulator"
    )
    p.add_argument(
        "--profile",
        choices=list(PROFILES.keys()),
        default="average",
        help="Driver behaviour profile (default: average)",
    )
    p.add_argument(
        "--route",
        choices=list_routes() + ["random"],
        default=DEFAULT_ROUTE,
        help="GPS route name (default: bangalore_koramangala_mg_road)",
    )
    p.add_argument(
        "--output", "-o",
        default=DEFAULT_OUTPUT,
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    p.add_argument(
        "--duration",
        type=int,
        default=None,
        help="Override trip duration in seconds (default: auto from route)",
    )
    p.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility",
    )
    p.add_argument(
        "--upload",
        action="store_true",
        help="Upload generated CSV to Spring Boot after generation",
    )
    p.add_argument(
        "--url",
        default="http://localhost:8080",
        help="Spring Boot base URL for upload (default: http://localhost:8080)",
    )
    p.add_argument(
        "--token",
        default="",
        help="JWT token for authenticated upload",
    )
    p.add_argument(
        "--live",
        action="store_true",
        help="Stream rows to console in real time (1 row/second) — demo mode",
    )
    return p.parse_args()

def simulate_trip(profile_name: str = "average",route_name:   str = DEFAULT_ROUTE,duration_override: int = None,seed: int = None) -> list:
    if seed is not None:
        np.random.seed(seed)
        random.seed(seed)

    profile = PROFILES[profile_name]

    waypoints  = get_route(route_name)
    pps        = 50 if "whitefield" in route_name or "noida" in route_name else 35
    gps_points = interpolate_route(waypoints, points_per_segment=pps)
    gps_points = add_gps_noise(gps_points, noise_meters=4.0)

    n_rows = duration_override if duration_override else len(gps_points)

    if len(gps_points) != n_rows:
        indices    = np.linspace(0, len(gps_points) - 1, n_rows, dtype=int)
        gps_points = [gps_points[i] for i in indices]

    start_time = _random_start_time(profile["night_prob"])
    is_daytime = 6 <= start_time.hour < 20

    rows       = []
    prev_speed = profile["speed_mean"]

    for i, (lat, lng) in enumerate(gps_points):
        timestamp = start_time + datetime.timedelta(seconds=i)

        target_speed = np.clip(
            np.random.normal(profile["speed_mean"], profile["speed_std"]),
            0, profile["speed_max"]
        )
        if random.random() < profile["stop_prob"]:
            target_speed = random.uniform(0, 15)

        speed = prev_speed * 0.7 + target_speed * 0.3
        speed = max(0.0, min(speed, profile["speed_max"]))

        accel = (speed - prev_speed) / 1.0   # Δspeed / 1 second = m/s²

        if random.random() < profile["brake_prob"]:
            accel = random.uniform(*profile["brake_intensity"])
            speed = max(0, speed + accel)

        accel += np.random.normal(0, 0.15)

        rpm = np.clip(
            np.random.normal(profile["rpm_mean"], profile["rpm_std"]),
            600, 6500
        )
        rpm = rpm * 0.6 + (speed / profile["speed_max"] * 4000) * 0.4
        eng_temp = random.uniform(*profile["engine_temp"])
        eng_temp += (rpm - profile["rpm_mean"]) / 1000.0

        rows.append({
            "timestamp":          timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude":           lat,
            "longitude":          lng,
            "speed":              round(speed,    2),
            "acceleration":       round(accel,    3),
            "rpm":                round(rpm,      0),
            "engine_temperature": round(eng_temp, 1),
        })

        prev_speed = speed

    return rows

CSV_COLUMNS = [
    "timestamp", "latitude", "longitude",
    "speed", "acceleration", "rpm", "engine_temperature",
]

def write_csv(rows: list, output_path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[simulate] Saved {len(rows)} rows → {output_path}")


def stream_live(rows: list) -> None:
    print("\n[LIVE] Streaming OBD data — press Ctrl+C to stop\n")
    print(f"{'Timestamp':<22} {'Lat':>10} {'Lng':>11} "
          f"{'Speed':>7} {'Accel':>7} {'RPM':>6} {'Temp':>6}")
    print("─" * 75)

    try:
        for row in rows:
            print(
                f"{row['timestamp']:<22} "
                f"{row['latitude']:>10.6f} "
                f"{row['longitude']:>11.6f} "
                f"{row['speed']:>7.1f} "
                f"{row['acceleration']:>7.3f} "
                f"{row['rpm']:>6.0f} "
                f"{row['engine_temperature']:>6.1f}"
            )
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\n[LIVE] Stream interrupted.")

def upload_to_spring_boot(csv_path: str,base_url: str,token: str) -> None:
    try:
        import requests
    except ImportError:
        print("[upload] requests not installed. Run: pip install requests")
        return

    url     = f"{base_url}/api/trips/upload"
    headers = {"Authorization": f"Bearer {token}"}

    print(f"[upload] Uploading {csv_path} → {url}")

    with open(csv_path, "rb") as f:
        response = requests.post(
            url,
            headers=headers,
            files={"file": (os.path.basename(csv_path), f, "text/csv")},
            timeout=30,
        )

    if response.status_code in (200, 201):
        data = response.json()
        print(f"[upload] ✓ Success!")
        print(f"Trip ID      : {data.get('tripId')}")
        print(f"Drive Score  : {data.get('driveScore')}")
        print(f"Risk Level   : {data.get('riskLevel')}")
        print(f"Points Earned: {data.get('pointsEarned')}")
        print(f"AI Tip       : {str(data.get('aiRecommendation',''))[:80]}...")
    else:
        print(f"[upload] ✗ Failed — HTTP {response.status_code}")
        print(f"         Response: {response.text[:200]}")

def print_summary(rows: list, profile_name: str, route_name: str) -> None:
    speeds  = [r["speed"]        for r in rows]
    accels  = [r["acceleration"] for r in rows]

    max_speed    = max(speeds)
    avg_speed    = sum(speeds) / len(speeds)
    hard_braking = sum(1 for a in accels if a < -2.94)
    sharp_turns  = sum(
        1 for i, r in enumerate(rows)
        if abs(r["acceleration"]) > 1.5 and r["speed"] > 20
    )

    print(f"\n{'═'*50}")
    print(f"  Trip Summary")
    print(f"{'═'*50}")
    print(f"  Profile         : {profile_name}")
    print(f"  Route           : {route_name}")
    print(f"  Total rows      : {len(rows)}")
    print(f"  Duration        : ~{len(rows)} seconds")
    print(f"  Max speed       : {max_speed:.1f} km/h")
    print(f"  Avg speed       : {avg_speed:.1f} km/h")
    print(f"  Hard braking    : {hard_braking} events")
    print(f"  Sharp turns     : {sharp_turns} events")
    print(f"  Start time      : {rows[0]['timestamp']}")
    print(f"  End time        : {rows[-1]['timestamp']}")
    print(f"{'═'*50}\n")

def _random_start_time(night_prob: float) -> datetime.datetime:
    base_date = datetime.date.today()
    if random.random() < night_prob:
        hour   = random.choice(list(range(20, 24)) + list(range(0, 6)))
    else:
        # Day: 06:00 – 20:00 with peak at 08–10 and 17–19
        weights = [
            3, 3, 4, 5, 6, 5,   # 06–11
            4, 4, 4, 3, 3, 3,   # 12–17
            5, 5, 3,             # 18–20
        ]
        hour = random.choices(range(6, 21), weights=weights, k=1)[0]

    minute = random.randint(0, 59)
    return datetime.datetime(
        base_date.year, base_date.month, base_date.day, hour, minute, 0
    )

def main():
    args = parse_args()

    print(f"\n🚗 DriveSafe AI OBD Simulator")
    print(f"Profile : {args.profile} — {PROFILES[args.profile]['description']}")
    print(f"Route   : {args.route}")
    print(f"Output  : {args.output}\n")

    rows = simulate_trip(
        profile_name      = args.profile,
        route_name        = args.route,
        duration_override = args.duration,
        seed              = args.seed,
    )

    print_summary(rows, args.profile, args.route)

    write_csv(rows, args.output)

    if args.live:
        stream_live(rows)
        
    if args.upload:
        if not args.token:
            print("[upload] ✗ --token is required for upload. "
                  "Get it from POST /api/auth/login response.")
        else:
            upload_to_spring_boot(args.output, args.url, args.token)


if __name__ == "__main__":
    main()
