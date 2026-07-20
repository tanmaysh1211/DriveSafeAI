import math
import numpy as np
import pandas as pd
from typing import Tuple

HARD_BRAKING_THRESHOLD  = -2.94   

SHARP_TURN_ACCEL        = 1.5     
SHARP_TURN_MIN_SPEED    = 20.0    

WEATHER_RISK_MAP = {
    "clear weather": 0,
    "cloudy":        1,
    "rainy":         2,
    "foggy":         2,
    "snowy":         3,
    "thunderstorm":  4,
    "unknown":       1,
}

REQUIRED_COLUMNS = {"latitude", "longitude", "speed", "acceleration"}

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

def engineer_trip_features(df: pd.DataFrame,weather: str = "clear weather",is_daytime: int = 1) -> dict:
    df = _clean_dataframe(df)

    if df.empty or len(df) < 2:
        raise ValueError("Trip DataFrame has too few rows after cleaning")

    max_speed         = float(df["speed"].max())
    avg_speed         = float(df["speed"].mean())
    max_acceleration  = float(df["acceleration"].abs().max())

    hard_braking_count = int((df["acceleration"] < HARD_BRAKING_THRESHOLD).sum())
    sharp_turn_count   = int(
        ((df["acceleration"].abs() > SHARP_TURN_ACCEL) &
         (df["speed"] > SHARP_TURN_MIN_SPEED)).sum()
    )

    distance_km = _compute_distance_km(df)
    distance_km = max(distance_km, 0.1)   

    speed_variance = max_speed - avg_speed
    braking_per_km = hard_braking_count / distance_km
    turns_per_km   = sharp_turn_count   / distance_km

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

def build_training_dataset(raw_df: pd.DataFrame) -> pd.DataFrame:
    raw_df = _clean_dataframe(raw_df)

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
            skipped += 1
            continue

        try:
            weather    = str(trip_df.get("weather_condition",pd.Series(["clear weather"])).iloc[0]).lower()
            is_daytime = int(trip_df.get("is_daytime",pd.Series([1])).iloc[0])

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

def compute_drive_score(features: dict) -> float:
    score = 0.0

    ms = features["max_speed"]
    if   ms > 150: score += 30
    elif ms > 130: score += 22
    elif ms > 110: score += 15
    elif ms > 90:  score += 8
    elif ms > 70:  score += 3

    bpk = features["braking_per_km"]
    if   bpk > 0.5: score += 25
    elif bpk > 0.3: score += 18
    elif bpk > 0.1: score += 10
    elif bpk > 0.0: score += 4

    tpk = features["turns_per_km"]
    if   tpk > 0.5: score += 15
    elif tpk > 0.3: score += 10
    elif tpk > 0.1: score += 5
    elif tpk > 0.0: score += 2

    sv = features["speed_variance"]
    if   sv > 80: score += 10
    elif sv > 60: score += 7
    elif sv > 40: score += 4
    elif sv > 20: score += 2

    if features["is_daytime"] == 0:
        score += 8

    score += features["weather_risk"] * 3.0

    score = max(0.0, min(score, 100.0))

    noise = np.random.normal(0, 2.0)
    score = np.clip(score + noise, 0.0, 100.0)

    return round(float(score), 2)

def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df.columns = (
        df.columns
          .str.strip()
          .str.lower()
          .str.replace("\uFEFF", "", regex=False)
          .str.replace(" ", "_")
    )

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {missing}. "
            f"Found: {list(df.columns)}"
        )

    numeric_cols = ["latitude", "longitude", "speed","acceleration", "rpm", "engine_temperature"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["speed", "acceleration"])
    if "latitude" in df.columns and "longitude" in df.columns:
        df = df[~((df["latitude"] == 0) & (df["longitude"] == 0))]

    df = df[df["speed"]        >= 0]
    df = df[df["speed"]        <= 300]   
    df = df[df["acceleration"] >= -15]   
    df = df[df["acceleration"] <= 15]

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    df = df.reset_index(drop=True)
    return df

def _assign_trip_ids(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    trip_ids = [1]
    current  = 1

    for i in range(1, len(df)):
        new_trip = False

        if "timestamp" in df.columns:
            t_prev = df["timestamp"].iloc[i - 1]
            t_curr = df["timestamp"].iloc[i]
            if pd.notnull(t_prev) and pd.notnull(t_curr):
                gap_seconds = (t_curr - t_prev).total_seconds()
                if gap_seconds > 300:   
                    new_trip = True

        if not new_trip and "latitude" in df.columns:
            lat1 = df["latitude"].iloc[i - 1]
            lng1 = df["longitude"].iloc[i - 1]
            lat2 = df["latitude"].iloc[i]
            lng2 = df["longitude"].iloc[i]
            if all(pd.notnull([lat1, lng1, lat2, lng2])):
                dist = _haversine_km(lat1, lng1, lat2, lng2)
                if dist > 2.0:          
                    new_trip = True

        if new_trip:
            current += 1

        trip_ids.append(current)

    df["trip_id"] = trip_ids
    return df

def _compute_distance_km(df: pd.DataFrame) -> float:
    if "latitude" not in df.columns or "longitude" not in df.columns:
        return 0.0

    lats = df["latitude"].values
    lngs = df["longitude"].values
    total = 0.0

    for i in range(len(lats) - 1):
        if all(map(lambda v: not math.isnan(v), [lats[i], lngs[i], lats[i+1], lngs[i+1]])):
            total += _haversine_km(lats[i], lngs[i], lats[i+1], lngs[i+1])

    return total

def _haversine_km(lat1: float, lng1: float,lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

if __name__ == "__main__":
    import os

    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "DF2.csv")
    if not os.path.exists(csv_path):
        print(f"CSV not found at {csv_path} — generating synthetic data for demo")
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
