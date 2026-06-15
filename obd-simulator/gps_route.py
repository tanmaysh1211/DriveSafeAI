"""
gps_route.py — Predefined GPS routes for Indian cities

Provides realistic GPS waypoint routes for the OBD simulator.
simulate_trip.py calls get_route() and interpolates between waypoints
to produce the dense per-second GPS stream DF2.csv needs.

Available routes:
    bangalore_koramangala_mg_road   —  8.5 km  city drive
    bangalore_electronic_city       — 18.0 km  highway + city
    bangalore_hebbal_whitefield     — 32.0 km  outer ring road
    delhi_connaught_place_noida     — 22.0 km  expressway
    mumbai_bandra_andheri           — 12.0 km  suburban

Usage:
    from gps_route import get_route, interpolate_route
    waypoints   = get_route("bangalore_koramangala_mg_road")
    dense_track = interpolate_route(waypoints, points_per_segment=40)
"""

import math
import random
from typing import List, Tuple

LatLng = Tuple[float, float]


# ═════════════════════════════════════════════════════════════════════════════
# ROUTE DEFINITIONS  — (latitude, longitude) waypoints along real roads
# ═════════════════════════════════════════════════════════════════════════════

ROUTES = {

    # ── Bangalore: Koramangala → MG Road (≈8.5 km) ───────────────────
    "bangalore_koramangala_mg_road": [
        (12.9352, 77.6245),
        (12.9380, 77.6289),
        (12.9412, 77.6301),
        (12.9448, 77.6318),
        (12.9489, 77.6334),
        (12.9521, 77.6362),
        (12.9558, 77.6389),
        (12.9587, 77.6401),
        (12.9612, 77.6188),
        (12.9716, 77.6101),
        (12.9747, 77.6070),
        (12.9762, 77.6036),
    ],

    # ── Bangalore: Koramangala → Electronic City (≈18 km) ────────────
    "bangalore_electronic_city": [
        (12.9352, 77.6245),
        (12.9218, 77.6198),
        (12.9101, 77.6145),
        (12.8985, 77.6089),
        (12.8834, 77.6012),
        (12.8712, 77.5978),
        (12.8601, 77.5934),
        (12.8489, 77.5901),
        (12.8399, 77.6757),
        (12.8344, 77.6801),
    ],

    # ── Bangalore: Hebbal → Whitefield (≈32 km) — ORR ────────────────
    "bangalore_hebbal_whitefield": [
        (13.0358, 77.5970),
        (13.0234, 77.6089),
        (13.0112, 77.6212),
        (12.9989, 77.6334),
        (12.9867, 77.6456),
        (12.9745, 77.6578),
        (12.9712, 77.6801),
        (12.9801, 77.7101),
        (12.9834, 77.7289),
    ],

    # ── Delhi: Connaught Place → Noida Sector 18 (≈22 km) ────────────
    "delhi_connaught_place_noida": [
        (28.6315, 77.2167),
        (28.6289, 77.2312),
        (28.6278, 77.2401),
        (28.6234, 77.2489),
        (28.6189, 77.2578),
        (28.6101, 77.2689),
        (28.5989, 77.2801),
        (28.5834, 77.3012),
        (28.5712, 77.3134),
        (28.5623, 77.3234),
        (28.5534, 77.3312),
    ],

    # ── Mumbai: Bandra → Andheri (≈12 km) ────────────────────────────
    "mumbai_bandra_andheri": [
        (19.0596, 72.8295),
        (19.0634, 72.8312),
        (19.0712, 72.8334),
        (19.0801, 72.8356),
        (19.0889, 72.8378),
        (19.1001, 72.8401),
        (19.1089, 72.8434),
        (19.1145, 72.8467),
        (19.1189, 72.8489),
    ],
}

DEFAULT_ROUTE = "bangalore_koramangala_mg_road"


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═════════════════════════════════════════════════════════════════════════════

def get_route(name: str = DEFAULT_ROUTE) -> List[LatLng]:
    """
    Return waypoints for a named route.
    Pass name="random" to pick a random route each time.
    """
    if name == "random":
        name = random.choice(list(ROUTES.keys()))
    if name not in ROUTES:
        raise ValueError(
            f"Unknown route '{name}'. "
            f"Available: {list(ROUTES.keys())}"
        )
    return ROUTES[name]


def list_routes() -> List[str]:
    """Return names of all available routes."""
    return list(ROUTES.keys())


def interpolate_route(waypoints: List[LatLng],
                      points_per_segment: int = 40) -> List[LatLng]:
    """
    Linearly interpolate between waypoints to produce a dense GPS track.

    With points_per_segment=40 and ~10 waypoints you get ~400 rows —
    enough for a realistic 6–7 minute trip at 1 reading/second.

    Parameters
    ----------
    waypoints          : sparse route-shape waypoints
    points_per_segment : interpolated points between each adjacent pair

    Returns
    -------
    Dense list of (lat, lng) tuples
    """
    dense = []
    for i in range(len(waypoints) - 1):
        lat1, lng1 = waypoints[i]
        lat2, lng2 = waypoints[i + 1]
        for j in range(points_per_segment):
            t = j / points_per_segment
            dense.append((
                round(lat1 + t * (lat2 - lat1), 6),
                round(lng1 + t * (lng2 - lng1), 6),
            ))
    dense.append(waypoints[-1])
    return dense


def add_gps_noise(points: List[LatLng],
                  noise_meters: float = 5.0) -> List[LatLng]:
    """
    Add Gaussian positional noise to simulate real GPS module jitter.
    5 m std-dev is typical for a consumer-grade GPS receiver.
    """
    noise_deg = noise_meters / 111_320.0   # 1 degree lat ≈ 111,320 m
    return [
        (
            round(lat + random.gauss(0, noise_deg), 6),
            round(lng + random.gauss(0, noise_deg), 6),
        )
        for lat, lng in points
    ]


def route_distance_km(waypoints: List[LatLng]) -> float:
    """Estimate total route length in km using Haversine summation."""
    return round(
        sum(
            _haversine_km(
                waypoints[i][0], waypoints[i][1],
                waypoints[i+1][0], waypoints[i+1][1]
            )
            for i in range(len(waypoints) - 1)
        ),
        2,
    )


# ═════════════════════════════════════════════════════════════════════════════
# HELPER
# ═════════════════════════════════════════════════════════════════════════════

def _haversine_km(lat1: float, lng1: float,
                  lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ═════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC
# python gps_route.py
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\nAvailable routes:\n")
    for name in list_routes():
        wpts  = get_route(name)
        dist  = route_distance_km(wpts)
        dense = interpolate_route(wpts, points_per_segment=40)
        print(f"  {name}")
        print(f"    Waypoints     : {len(wpts)}")
        print(f"    Distance      : {dist} km")
        print(f"    Dense rows    : {len(dense)}")
        print(f"    Start → End   : {wpts[0]} → {wpts[-1]}")
        print()