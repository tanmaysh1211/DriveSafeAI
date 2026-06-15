"""
feature_engineering.py — Feature computation from raw OBD telemetry CSV

Called by train_model.py before model training.
Also importable by scoring.py if you want identical feature logic in inference.

Input  : pandas DataFrame with raw OBD columns:
             timestamp, latitude, longitude, speed,
             acceleration, rpm, engine_temperature

Output : pandas DataFrame with engineered features ready for LightGBM:
             max_speed, avg_speed, max_acceleration, hard_braking_count,
             sharp_turn_count, distance_km, is_daytime, weather_risk,
             speed_variance, braking_per_km, turns_per_km,
             ... plus label column: drive_score (0–100, higher = riskier)

Usage:
    from feature_engineering import engineer_trip_features, compute_drive_score
    features_df = engineer_trip_features(raw_df)
"""

import math
import numpy as np
import pandas as pd
from typing import Tuple


# ═════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═════════════════════════════════════════════════════════════════════════════

# Hard braking threshold: deceleration sharper than 0.3 g (≈ -2.94 m/s²)
HARD_BRAKING_THRESHOLD  = -2.94   # m/s²

# Sharp turn proxy: high lateral acceleration at speed
SHARP_TURN_ACCEL        = 1.5     # m/s² absolute
SHARP_TURN_MIN_SPEED    = 20.0    # km/h — ignore turns at low speed

# Weather condition → numeric risk weight
# Must match WEATHER_RISK_MAP in scoring.py
WEATHER_RISK_MAP = {
    "clear weather": 0,
    "cloudy":        1,
    "rainy":         2,
    "foggy":         2,
    "snowy":         3,
    "thunderstorm":  4,
    "unknown":       1,
}

# Columns the raw CSV must have (minimum required)
REQUIRED_COLUMNS = {"latitude", "longitude", "speed", "acceleration"}

# Final feature columns fed to the model — ORDER MATTERS for LightGBM
FEATURE_COLUMNS = [
    "max_speed",
    "avg_speed",
    "max_acceleration",
    "hard_braking_count",
    "sharp_turn_count",
    "distance_km",
    "is_daytime",
    "weather_risk",
    "speed_variance",
    "braking_per_km",
    "turns_per_km",
]

LABEL_COLUMN = "drive_score"


# ═════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY — engineer features for a SINGLE trip DataFrame
# ═════════════════════════════════════════════════════════════════════════════

def engineer_trip_features(df: pd.DataFrame,
                            weather: str = "clear weather",
                            is_daytime: int = 1) -> dict:
    """
    Compute all features from a single trip's raw DataFrame.

    Parameters
    ----------
    df         : raw OBD rows for one trip (one row per timestamp)
    weather    : normalised weather string from OpenWeatherMap
    is_daytime : 1 = day, 0 = night (from OWM sunrise/sunset)

    Returns
    -------
    dict of feature_name → value, matching FEATURE_COLUMNS order.
    Use this dict to build a single-row DataFrame for model.predict().
    """
    df = _clean_dataframe(df)

    if df.empty or len(df) < 2:
        raise ValueError("Trip DataFrame has too few rows after cleaning")

    # ── Base stats ──────────────────────────────────────────────────────
    max_speed         = float(df["speed"].max())
    avg_speed         = float(df["speed"].mean())
    max_acceleration  = float(df["acceleration"].abs().max())

    # ── Safety event counts ─────────────────────────────────────────────
    hard_braking_count = int((df["acceleration"] < HARD_BRAKING_THRESHOLD).sum())
    sharp_turn_count   = int(
        ((df["acceleration"].abs() > SHARP_TURN_ACCEL) &
         (df["speed"] > SHARP_TURN_MIN_SPEED)).sum()
    )

    # ── GPS-derived distance ────────────────────────────────────────────
    distance_km = _compute_distance_km(df)
    distance_km = max(distance_km, 0.1)   # guard divide-by-zero

    # ── Derived / engineered features ──────────────────────────────────
    speed_variance = max_speed - avg_speed
    braking_per_km = hard_braking_count / distance_km
    turns_per_km   = sharp_turn_count   / distance_km

    # ── Encode weather ──────────────────────────────────────────────────
    weather_risk = WEATHER_RISK_MAP.get(weather.lower().strip(), 1)

    return {
        "max_speed":          max_speed,
        "avg_speed":          avg_speed,
        "max_acceleration":   max_acceleration,
        "hard_braking_count": hard_braking_count,
        "sharp_turn_count":   sharp_turn_count,
        "distance_km":        distance_km,
        "is_daytime":         is_daytime,
        "weather_risk":       weather_risk,
        "speed_variance":     speed_variance,
        "braking_per_km":     braking_per_km,
        "turns_per_km":       turns_per_km,
    }


# ═════════════════════════════════════════════════════════════════════════════
# BUILD TRAINING DATASET from a multi-trip CSV
#
# The raw CSV (DF2.csv) has one row per OBD reading.
# We assume a "trip_id" column separates trips.
# If not present, we segment by GPS gaps > 500m or time gaps > 5 min.
# ═════════════════════════════════════════════════════════════════════════════

def build_training_dataset(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert a multi-trip raw CSV into one row per trip with features + label.

    Steps:
        1. Clean raw data
        2. Segment into individual trips
        3. Engineer features per trip
        4. Compute drive_score label per trip
        5. Return feature DataFrame ready for LightGBM training

    Parameters
    ----------
    raw_df : full raw OBD DataFrame (all trips concatenated)

    Returns
    -------
    DataFrame with columns = FEATURE_COLUMNS + [LABEL_COLUMN]
    """
    raw_df = _clean_dataframe(raw_df)

    # Segment into trips
    if "trip_id" in raw_df.columns:
        trip_groups = raw_df.groupby("trip_id")
        print(f"[feature_engineering] Found {len(trip_groups)} trips via trip_id column")
    else:
        raw_df = _assign_trip_ids(raw_df)
        trip_groups = raw_df.groupby("trip_id")
        print(f"[feature_engineering] Auto-segmented {len(trip_groups)} trips")

    rows = []
    skipped = 0

    for trip_id, trip_df in trip_groups:
        if len(trip_df) < 10:
            # Too few points — likely a GPS glitch, skip
            skipped += 1
            continue

        try:
            # Determine conditions from trip metadata if available
            weather    = str(trip_df.get("weather_condition",
                             pd.Series(["clear weather"])).iloc[0]).lower()
            is_daytime = int(trip_df.get("is_daytime",
                             pd.Series([1])).iloc[0])

            feats  = engineer_trip_features(trip_df, weather, is_daytime)
            label  = compute_drive_score(feats)

            row = {**feats, LABEL_COLUMN: label, "trip_id": trip_id}
            rows.append(row)

        except Exception as e:
            print(f"[feature_engineering] Skipping trip {trip_id}: {e}")
            skipped += 1

    print(f"[feature_engineering] Built {len(rows)} trip rows "
          f"({skipped} skipped)")

    if not rows:
        raise RuntimeError("No valid trips found in CSV. "
                           "Check column names and data quality.")

    df_out = pd.DataFrame(rows)
    return df_out[FEATURE_COLUMNS + [LABEL_COLUMN]]


# ═════════════════════════════════════════════════════════════════════════════
# DRIVE SCORE LABEL COMPUTATION
#
# Used to generate training labels when you don't have human-annotated scores.
# Formula is additive — each risk factor contributes independently.
# Score range: 0 (perfectly safe) to 100 (extremely dangerous).
# ═════════════════════════════════════════════════════════════════════════════

def compute_drive_score(features: dict) -> float:
    """
    Compute a DriveScore (0–100, higher = riskier) from engineered features.

    This is the GROUND TRUTH formula used to label training data.
    The LightGBM model learns to replicate this from the raw features.

    After training on real data, replace this with human expert labels
    or insurance claim data for a production model.

    Scoring breakdown (max 100 pts):
        Speed contribution       : 0–30 pts
        Hard braking             : 0–25 pts
        Sharp turns              : 0–15 pts
        Speed variance           : 0–10 pts (erratic driving)
        Night driving            : 0–8  pts
        Weather risk             : 0–12 pts
    """
    score = 0.0

    # ── Speed contribution (max 30 pts) ──────────────────────────────
    ms = features["max_speed"]
    if   ms > 150: score += 30
    elif ms > 130: score += 22
    elif ms > 110: score += 15
    elif ms > 90:  score += 8
    elif ms > 70:  score += 3

    # ── Hard braking per km (max 25 pts) ─────────────────────────────
    # Per-km rate prevents long trips from being unfairly penalised
    bpk = features["braking_per_km"]
    if   bpk > 0.5: score += 25
    elif bpk > 0.3: score += 18
    elif bpk > 0.1: score += 10
    elif bpk > 0.0: score += 4

    # ── Sharp turns per km (max 15 pts) ──────────────────────────────
    tpk = features["turns_per_km"]
    if   tpk > 0.5: score += 15
    elif tpk > 0.3: score += 10
    elif tpk > 0.1: score += 5
    elif tpk > 0.0: score += 2

    # ── Speed variance (max 10 pts) ───────────────────────────────────
    # High variance = stop-go aggressive driving
    sv = features["speed_variance"]
    if   sv > 80: score += 10
    elif sv > 60: score += 7
    elif sv > 40: score += 4
    elif sv > 20: score += 2

    # ── Night driving (max 8 pts) ─────────────────────────────────────
    if features["is_daytime"] == 0:
        score += 8

    # ── Weather risk (max 12 pts) ─────────────────────────────────────
    # weather_risk: 0=clear, 1=cloudy, 2=rain/fog, 3=snow, 4=storm
    score += features["weather_risk"] * 3.0

    # Clamp to [0, 100] and add small noise for training variety
    score = max(0.0, min(score, 100.0))

    # Add ±2 pts Gaussian noise so the model doesn't overfit perfectly
    noise = np.random.normal(0, 2.0)
    score = np.clip(score + noise, 0.0, 100.0)

    return round(float(score), 2)


# ═════════════════════════════════════════════════════════════════════════════
# DATA CLEANING
# ═════════════════════════════════════════════════════════════════════════════

def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalise column names, drop bad rows, cast types.
    Works on both single-trip and multi-trip DataFrames.
    """
    df = df.copy()

    # Normalise column names: lowercase, strip whitespace, remove BOM
    df.columns = (
        df.columns
          .str.strip()
          .str.lower()
          .str.replace("\uFEFF", "", regex=False)
          .str.replace(" ", "_")
    )

    # Validate minimum required columns
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {missing}. "
            f"Found: {list(df.columns)}"
        )

    # Cast numeric columns — coerce errors to NaN
    numeric_cols = ["latitude", "longitude", "speed",
                    "acceleration", "rpm", "engine_temperature"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows where core columns are null or GPS is (0, 0)
    df = df.dropna(subset=["speed", "acceleration"])
    if "latitude" in df.columns and "longitude" in df.columns:
        df = df[~((df["latitude"] == 0) & (df["longitude"] == 0))]

    # Remove physically impossible values
    df = df[df["speed"]        >= 0]
    df = df[df["speed"]        <= 300]   # nothing road-legal goes faster
    df = df[df["acceleration"] >= -15]   # crash decel is ~10 g
    df = df[df["acceleration"] <= 15]

    # Parse timestamp if present
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    df = df.reset_index(drop=True)
    return df


# ═════════════════════════════════════════════════════════════════════════════
# TRIP SEGMENTATION
# Auto-assign trip IDs when no trip_id column exists
# ═════════════════════════════════════════════════════════════════════════════

def _assign_trip_ids(df: pd.DataFrame) -> pd.DataFrame:
    """
    Segment raw GPS rows into trips by detecting:
        1. Time gap > 5 minutes between consecutive rows
        2. GPS jump > 2 km between consecutive rows (teleport detection)

    Each new trip starts a new trip_id (integer starting at 1).
    """
    df = df.copy()
    trip_ids = [1]
    current  = 1

    for i in range(1, len(df)):
        new_trip = False

        # Time gap check
        if "timestamp" in df.columns:
            t_prev = df["timestamp"].iloc[i - 1]
            t_curr = df["timestamp"].iloc[i]
            if pd.notnull(t_prev) and pd.notnull(t_curr):
                gap_seconds = (t_curr - t_prev).total_seconds()
                if gap_seconds > 300:   # 5 minutes
                    new_trip = True

        # GPS jump check
        if not new_trip and "latitude" in df.columns:
            lat1 = df["latitude"].iloc[i - 1]
            lng1 = df["longitude"].iloc[i - 1]
            lat2 = df["latitude"].iloc[i]
            lng2 = df["longitude"].iloc[i]
            if all(pd.notnull([lat1, lng1, lat2, lng2])):
                dist = _haversine_km(lat1, lng1, lat2, lng2)
                if dist > 2.0:          # 2 km jump → new trip
                    new_trip = True

        if new_trip:
            current += 1

        trip_ids.append(current)

    df["trip_id"] = trip_ids
    return df


# ═════════════════════════════════════════════════════════════════════════════
# GPS DISTANCE
# ═════════════════════════════════════════════════════════════════════════════

def _compute_distance_km(df: pd.DataFrame) -> float:
    """
    Sum haversine distances between consecutive GPS rows.
    Returns 0.0 if latitude/longitude columns are absent.
    """
    if "latitude" not in df.columns or "longitude" not in df.columns:
        return 0.0

    lats = df["latitude"].values
    lngs = df["longitude"].values
    total = 0.0

    for i in range(len(lats) - 1):
        if all(map(lambda v: not math.isnan(v), [lats[i], lngs[i], lats[i+1], lngs[i+1]])):
            total += _haversine_km(lats[i], lngs[i], lats[i+1], lngs[i+1])

    return total


def _haversine_km(lat1: float, lng1: float,
                  lat2: float, lng2: float) -> float:
    """Straight-line distance between two GPS coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ═════════════════════════════════════════════════════════════════════════════
# QUICK DIAGNOSTIC — run directly for sanity check
# python feature_engineering.py
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import os

    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "DF2.csv")
    if not os.path.exists(csv_path):
        print(f"CSV not found at {csv_path} — generating synthetic data for demo")
        # Synthetic demo data — 500 rows simulating a city trip
        np.random.seed(42)
        n = 500
        demo = pd.DataFrame({
            "timestamp":   pd.date_range("2024-06-01 09:00", periods=n, freq="2s"),
            "latitude":    np.cumsum(np.random.normal(0, 0.0005, n)) + 12.97,
            "longitude":   np.cumsum(np.random.normal(0, 0.0005, n)) + 77.59,
            "speed":       np.clip(np.random.normal(60, 25, n), 0, 140),
            "acceleration":np.random.normal(0, 1.5, n),
            "rpm":         np.random.uniform(800, 4500, n),
            "engine_temperature": np.random.uniform(80, 100, n),
        })
        raw_df = demo
    else:
        raw_df = pd.read_csv(csv_path)
        print(f"Loaded {len(raw_df)} rows from {csv_path}")

    print(f"\nRaw columns  : {list(raw_df.columns)}")
    print(f"Raw shape    : {raw_df.shape}")

    dataset = build_training_dataset(raw_df)
    print(f"\nTraining dataset shape: {dataset.shape}")
    print(f"Columns: {list(dataset.columns)}")
    print(f"\nFirst 3 rows:\n{dataset.head(3).to_string()}")
    print(f"\nDrive score stats:\n{dataset['drive_score'].describe().round(2)}")