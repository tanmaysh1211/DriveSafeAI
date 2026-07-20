import os
import pickle
import numpy as np
from flask import Blueprint, request, jsonify

scoring_bp = Blueprint("scoring", __name__)

_BASE = os.path.join(os.path.dirname(__file__), "..")
MODEL_PATH  = os.path.join(_BASE, "models", "model.pkl")
SCALER_PATH = os.path.join(_BASE, "models", "scaler.pkl")

_model  = None
_scaler = None


def load_model():
    global _model, _scaler

    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        print(f"[scoring] Model loaded: {MODEL_PATH}")
    else:
        print(f"[scoring] WARNING — model.pkl not found. Using heuristic fallback.")

    if os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, "rb") as f:
            _scaler = pickle.load(f)
        print(f"[scoring] Scaler loaded: {SCALER_PATH}")
    else:
        print("[scoring] WARNING — scaler.pkl not found. Skipping normalisation.")


FEATURE_NAMES = [
    "max_speed",           # km/h — peak reading in trip
    "avg_speed",           # km/h — mean across all rows
    "max_acceleration",    # m/s² — absolute max
    "hard_braking_count",  # events where deceleration < -2.94 m/s²
    "sharp_turn_count",    # events where |accel| > 1.5 at speed > 20 km/h
    "distance_km",         # haversine sum across GPS points
    "is_daytime",          # 1 = day, 0 = night (from OWM sunrise/sunset)
    "weather_risk",        # 0=clear, 1=cloudy, 2=rain/fog, 3=snow, 4=storm
    "speed_variance",      # max_speed - avg_speed (erratic driving proxy)
    "braking_per_km",      # hard_braking_count / distance_km
    "turns_per_km",        # sharp_turn_count   / distance_km
]

WEATHER_RISK_MAP = {
    "clear weather": 0,
    "cloudy":        1,
    "rainy":         2,
    "foggy":         2,
    "snowy":         3,
    "thunderstorm":  4,
    "unknown":       1,
}

@scoring_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        raw = _parse_request(data)
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400

    features = _build_features(raw)

    if _model is not None:
        score = _predict_model(features)
    else:
        score = _heuristic(raw)

    score = round(float(np.clip(score, 0.0, 100.0)), 2)

    return jsonify({
        "drive_score":  score,
        "risk_level":   _risk_level(score),
        "risk_factors": _risk_factors(raw),
    })

def _parse_request(data: dict) -> dict:
    weather_str  = str(data.get("weather", "clear weather")).lower().strip()
    weather_risk = WEATHER_RISK_MAP.get(weather_str, 1)

    return {
        "max_speed":          float(data.get("max_speed",          0)),
        "avg_speed":          float(data.get("avg_speed",          0)),
        "max_acceleration":   float(data.get("max_acceleration",   0)),
        "hard_braking_count": int(  data.get("hard_braking_count", 0)),
        "sharp_turn_count":   int(  data.get("sharp_turn_count",   0)),
        "distance_km":        max(float(data.get("distance_km",    1)), 0.1),
        "is_daytime":         int(  data.get("is_daytime",         1)),
        "weather_risk":       weather_risk,
        "weather_str":        weather_str,
    }

def _build_features(raw: dict) -> np.ndarray:
    import pandas as pd

    d = raw["distance_km"]
    speed_variance = raw["max_speed"] - raw["avg_speed"]
    braking_per_km = raw["hard_braking_count"] / d
    turns_per_km   = raw["sharp_turn_count"]   / d

    df = pd.DataFrame([[
        raw["max_speed"],
        raw["avg_speed"],
        raw["max_acceleration"],
        raw["hard_braking_count"],
        raw["sharp_turn_count"],
        raw["distance_km"],
        raw["is_daytime"],
        raw["weather_risk"],
        speed_variance,
        braking_per_km,
        turns_per_km,
    ]], columns=FEATURE_NAMES)

    if _scaler is not None:
        df = pd.DataFrame(
            _scaler.transform(df),
            columns=FEATURE_NAMES
        )

    return df.values

def _predict_model(features: np.ndarray) -> float:
    try:
        pred = _model.predict(features)
        score = float(pred[0])
        if 0.0 <= score <= 1.0:
            score *= 100.0
        return score
    except Exception as e:
        print(f"[scoring] Model inference error: {e}. Falling back to heuristic.")
        return _heuristic_from_vec(features)


def _heuristic(raw: dict) -> float:
    score = 20.0

    ms = raw["max_speed"]
    if   ms > 130: score += 40
    elif ms > 110: score += 30
    elif ms > 90:  score += 20
    elif ms > 70:  score += 10

    hb = raw["hard_braking_count"]
    if   hb > 100: score += 25
    elif hb > 50:  score += 18
    elif hb > 20:  score += 12
    elif hb > 5:   score += 6

    st = raw["sharp_turn_count"]
    if   st > 200: score += 15
    elif st > 100: score += 10
    elif st > 50:  score += 5

    if raw["is_daytime"] == 0:
        score += 5
    score += raw["weather_risk"] * 2.5

    return min(score, 100.0)

def _heuristic_from_vec(features: np.ndarray) -> float:
    try:
        max_speed    = float(features[0][0])
        hard_braking = float(features[0][3])
        return min(20.0 + (max_speed / 5.0) + (hard_braking * 5.0), 100.0)
    except Exception:
        return 50.0

def _risk_level(score: float) -> str:
    if score <= 40: return "Safe"
    if score <= 65: return "Moderate"
    return "High"


def _risk_factors(raw: dict) -> dict:
    d = raw["distance_km"]

    ms = raw["max_speed"]
    speed = "High" if ms > 120 else "Moderate" if ms > 90 else "Low"

    br = raw["hard_braking_count"] / d
    braking = "High" if br > 0.3 else "Moderate" if br > 0.1 else "Low"

    tr = raw["sharp_turn_count"] / d
    turns = "High" if tr > 0.4 else "Moderate" if tr > 0.15 else "Low"

    night = "High" if raw["is_daytime"] == 0 else "Normal"

    return {
        "Speeding Events": speed,
        "Hard Braking":    braking,
        "Sharp Turns":     turns,
        "Night Driving":   night,
        "Weather":         raw["weather_str"].title(),
    }
