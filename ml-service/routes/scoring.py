"""
scoring.py — Flask blueprint for DriveScore prediction

POST /predict
    Input  : JSON telemetry from TripService.java (callFlaskForScore)
    Output : { "drive_score": 57.75, "risk_level": "Moderate", "risk_factors": {...} }

LightGBM model loaded once at startup.
Falls back to a deterministic heuristic if model.pkl is missing —
Spring Boot never receives a 500 from this service.
"""

import os
import pickle
import numpy as np
from flask import Blueprint, request, jsonify

scoring_bp = Blueprint("scoring", __name__)

# ── Model paths ───────────────────────────────────────────────────────────────
_BASE = os.path.join(os.path.dirname(__file__), "..")
MODEL_PATH  = os.path.join(_BASE, "models", "model.pkl")
SCALER_PATH = os.path.join(_BASE, "models", "scaler.pkl")

_model  = None
_scaler = None


def load_model():
    """
    Load LightGBM model and scaler from disk.
    Called once by app.py at startup — not lazily per-request.
    """
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


# ── Feature order (must match training column order exactly) ──────────────────
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

# WeatherService.normaliseCondition() output → numeric risk weight
WEATHER_RISK_MAP = {
    "clear weather": 0,
    "cloudy":        1,
    "rainy":         2,
    "foggy":         2,
    "snowy":         3,
    "thunderstorm":  4,
    "unknown":       1,
}


# ── POST /predict ─────────────────────────────────────────────────────────────

@scoring_bp.route("/predict", methods=["POST"])
def predict():
    """
    Called by TripService.callFlaskForScore() in Spring Boot.

    Request JSON:
    {
        "max_speed":          109.0,
        "avg_speed":          72.4,
        "max_acceleration":   0.42,
        "hard_braking_count": 3,
        "sharp_turn_count":   2,
        "distance_km":        23.0,
        "is_daytime":         1,
        "weather":            "Clear Weather"
    }

    Response JSON:
    {
        "drive_score":  57.75,
        "risk_level":   "Moderate",
        "risk_factors": {
            "Speeding Events": "Low",
            "Hard Braking":    "Moderate",
            "Sharp Turns":     "Low",
            "Night Driving":   "Normal",
            "Weather":         "Clear Weather"
        }
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        raw = _parse_request(data)
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400

    # Build feature vector with derived features
    features = _build_features(raw)

    # Predict or fall back
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


# ── Input parsing ─────────────────────────────────────────────────────────────

def _parse_request(data: dict) -> dict:
    """Extract and type-cast all fields from the request JSON."""
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


# ── Feature engineering ───────────────────────────────────────────────────────

# def _build_features(raw: dict) -> np.ndarray:
#     """
#     Compute derived features and assemble (1, 11) numpy array.
#     Column order must match FEATURE_NAMES and training data.
#     """
#     d = raw["distance_km"]

#     speed_variance = raw["max_speed"] - raw["avg_speed"]
#     braking_per_km = raw["hard_braking_count"] / d
#     turns_per_km   = raw["sharp_turn_count"]   / d

#     vec = np.array([[
#         raw["max_speed"],
#         raw["avg_speed"],
#         raw["max_acceleration"],
#         raw["hard_braking_count"],
#         raw["sharp_turn_count"],
#         raw["distance_km"],
#         raw["is_daytime"],
#         raw["weather_risk"],
#         speed_variance,
#         braking_per_km,
#         turns_per_km,
#     ]], dtype=np.float64)

#     if _scaler is not None:
#         vec = _scaler.transform(vec)

#     return vec


def _build_features(raw: dict) -> np.ndarray:
    import pandas as pd

    d = raw["distance_km"]
    speed_variance = raw["max_speed"] - raw["avg_speed"]
    braking_per_km = raw["hard_braking_count"] / d
    turns_per_km   = raw["sharp_turn_count"]   / d

    # Use DataFrame with column names to match training — fixes sklearn warning
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

# ── Model inference ───────────────────────────────────────────────────────────

def _predict_model(features: np.ndarray) -> float:
    """
    Run the LightGBM model.
    Handles both regression (output in [0,100]) and
    binary classification (output in [0,1] → scaled ×100).
    """
    try:
        pred = _model.predict(features)
        score = float(pred[0])
        # If classifier output probability — scale to 0-100
        if 0.0 <= score <= 1.0:
            score *= 100.0
        return score
    except Exception as e:
        print(f"[scoring] Model inference error: {e}. Falling back to heuristic.")
        return _heuristic_from_vec(features)


# ── Heuristic fallback ────────────────────────────────────────────────────────

# def _heuristic(raw: dict) -> float:
#     """
#     Rule-based DriveScore when model.pkl is absent.
#     Base 20 + additive contributions from each risk factor.
#     Mirrors TripService.computeFallbackScore() in Java but with more granularity.
#     """
#     score = 20.0

#     # Speed (max +35)
#     ms = raw["max_speed"]
#     if   ms > 140: score += 35
#     elif ms > 120: score += 25
#     elif ms > 100: score += 15
#     elif ms > 80:  score += 5

#     # Hard braking (max +20)
#     hb = raw["hard_braking_count"]
#     if   hb > 8: score += 20
#     elif hb > 5: score += 14
#     elif hb > 2: score += 8
#     elif hb > 0: score += 3

#     # Sharp turns (max +15)
#     st = raw["sharp_turn_count"]
#     if   st > 10: score += 15
#     elif st > 5:  score += 10
#     elif st > 2:  score += 5

#     # Night driving (+5)
#     if raw["is_daytime"] == 0:
#         score += 5

#     # Weather (+0 to +10)
#     score += raw["weather_risk"] * 2.5

#     return min(score, 100.0)



def _heuristic(raw: dict) -> float:
    score = 20.0

    # Speed (more aggressive)
    ms = raw["max_speed"]
    if   ms > 130: score += 40
    elif ms > 110: score += 30
    elif ms > 90:  score += 20
    elif ms > 70:  score += 10

    # Hard braking (more sensitive)
    hb = raw["hard_braking_count"]
    if   hb > 100: score += 25
    elif hb > 50:  score += 18
    elif hb > 20:  score += 12
    elif hb > 5:   score += 6

    # Sharp turns
    st = raw["sharp_turn_count"]
    if   st > 200: score += 15
    elif st > 100: score += 10
    elif st > 50:  score += 5

    # Night driving
    if raw["is_daytime"] == 0:
        score += 5

    # Weather
    score += raw["weather_risk"] * 2.5

    return min(score, 100.0)

def _heuristic_from_vec(features: np.ndarray) -> float:
    """Emergency fallback when model.predict() itself crashes."""
    try:
        max_speed    = float(features[0][0])
        hard_braking = float(features[0][3])
        return min(20.0 + (max_speed / 5.0) + (hard_braking * 5.0), 100.0)
    except Exception:
        return 50.0


# ── Risk helpers ──────────────────────────────────────────────────────────────

def _risk_level(score: float) -> str:
    if score <= 40: return "Safe"
    if score <= 65: return "Moderate"
    return "High"


def _risk_factors(raw: dict) -> dict:
    """
    Per-factor labels matching DashboardResponse.riskFactors keys
    and the badge colours in the React Risk Analysis card.

    Keys match exactly what DriscScoringService.computeRiskFactors() produces
    so the dashboard is consistent whether it uses Java or Python risk factors.
    """
    d = raw["distance_km"]

    # Speeding Events
    ms = raw["max_speed"]
    speed = "High" if ms > 120 else "Moderate" if ms > 90 else "Low"

    # Hard Braking (normalised per km)
    br = raw["hard_braking_count"] / d
    braking = "High" if br > 0.3 else "Moderate" if br > 0.1 else "Low"

    # Sharp Turns (normalised per km)
    tr = raw["sharp_turn_count"] / d
    turns = "High" if tr > 0.4 else "Moderate" if tr > 0.15 else "Low"

    # Night Driving
    night = "High" if raw["is_daytime"] == 0 else "Normal"

    return {
        "Speeding Events": speed,
        "Hard Braking":    braking,
        "Sharp Turns":     turns,
        "Night Driving":   night,
        "Weather":         raw["weather_str"].title(),
    }