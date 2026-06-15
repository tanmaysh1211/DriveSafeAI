"""
recommendations.py — Flask blueprint for AI-powered trip recommendations

POST /recommend
    Input  : trip telemetry JSON (same shape as /predict)
    Output : { "recommendation": "Your max speed of 109 km/h..." }

This is a THIN wrapper around the OpenAI API.
In the DriveSafe AI architecture, Spring Boot's AIRecommendationService.java
is the primary caller of OpenAI — this Flask endpoint exists as an alternative
if you want the ML service to own all AI calls in one place.

You can call either:
  Option A (recommended): Spring Boot → OpenAI directly
  Option B:               Spring Boot → POST /recommend → OpenAI

Switch between them by toggling use_flask_recommendations=true
in application.properties.
"""

import os
from flask import Blueprint, request, jsonify

recommendations_bp = Blueprint("recommendations", __name__)

# OpenAI API key — read from environment variable set in .env / shell
# Never hardcode this — it will end up in Git
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_URL     = "https://api.openai.com/v1/chat/completions"
MODEL          = "gpt-4o-mini"   # cheapest capable model (~$0.15/1M tokens)


# ── POST /recommend ───────────────────────────────────────────────────────────

@recommendations_bp.route("/recommend", methods=["POST"])
def recommend():
    """
    Generate an AI driving recommendation for a completed trip.

    Request JSON (from TripService or AIRecommendationService):
    {
        "drive_score":       57.75,
        "max_speed":         109.0,
        "avg_speed":         72.4,
        "hard_braking_count": 3,
        "sharp_turn_count":   2,
        "distance_km":        23.0,
        "is_daytime":         1,
        "weather":            "Clear Weather",
        "max_acceleration":   0.42
    }

    Response:
    {
        "recommendation": "Your max speed of 109 km/h exceeded safe limits...\n
                           You had 3 hard braking events...\n
                           Consider smoother deceleration..."
    }
    """
    if not OPENAI_API_KEY:
        return jsonify({
            "recommendation": _fallback_recommendation(),
            "source": "fallback",
            "reason": "OPENAI_API_KEY not set"
        })

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    prompt   = _build_prompt(data)
    response = _call_openai(prompt)

    return jsonify({
        "recommendation": response,
        "source": "openai",
        "model": MODEL,
    })


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(data: dict) -> str:
    """
    Build the GPT prompt from trip data.
    Injects actual numbers so recommendations are trip-specific, not generic.
    Matches the prompt structure in Java's AIRecommendationService.buildPrompt().
    """
    drive_score  = float(data.get("drive_score",       50))
    max_speed    = float(data.get("max_speed",          0))
    avg_speed    = float(data.get("avg_speed",          0))
    hard_braking = int(  data.get("hard_braking_count", 0))
    sharp_turns  = int(  data.get("sharp_turn_count",   0))
    distance     = float(data.get("distance_km",        0))
    is_daytime   = int(  data.get("is_daytime",         1))
    weather      = str(  data.get("weather",     "Clear Weather"))
    max_accel    = float(data.get("max_acceleration",   0))

    risk_level   = "Safe" if drive_score <= 40 else "Moderate" if drive_score <= 65 else "High Risk"
    time_context = "daytime" if is_daytime else "nighttime"

    return f"""You are a professional driving coach and road safety expert.

A driver just completed a trip. Analyze the data and give exactly 3 specific, actionable safety recommendations.

TRIP DATA:
- Drive Score: {drive_score:.1f} / 100  (higher = riskier)
- Risk Level: {risk_level}
- Max Speed: {max_speed:.1f} km/h
- Average Speed: {avg_speed:.1f} km/h
- Distance: {distance:.2f} km
- Hard Braking Events: {hard_braking}
- Sharp Turn Events: {sharp_turns}
- Max Acceleration: {max_accel:.2f} m/s²
- Conditions: {time_context}, {weather}

INSTRUCTIONS:
- Give exactly 3 recommendations, each 1–2 sentences
- Be specific to the data above — mention actual numbers where helpful
- Focus on the worst factors first (highest risk contributors)
- Use a supportive coaching tone — not alarming
- Do NOT use markdown, bullet symbols, or headers — plain text only
- Separate each recommendation with a newline"""


# ── OpenAI call ───────────────────────────────────────────────────────────────

def _call_openai(prompt: str) -> str:
    """
    POST to OpenAI chat completions endpoint.
    Returns the recommendation text or a fallback string on error.
    """
    try:
        import requests as req

        headers = {
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        }

        body = {
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a concise, expert driving safety coach. "
                        "You give practical, data-driven feedback. "
                        "Never use bullet points or markdown formatting."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens":  300,
            "temperature": 0.7,
        }

        response = req.post(OPENAI_URL, headers=headers, json=body, timeout=20)
        response.raise_for_status()

        data = response.json()
        return _extract_content(data)

    except Exception as e:
        print(f"[recommendations] OpenAI call failed: {e}")
        return _fallback_recommendation()


def _extract_content(data: dict) -> str:
    """Parse the text content from OpenAI's response JSON."""
    try:
        choices = data.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content", "")
            if content:
                return content.strip()
    except Exception as e:
        print(f"[recommendations] Failed to parse OpenAI response: {e}")
    return _fallback_recommendation()


# ── Fallback ──────────────────────────────────────────────────────────────────

def _fallback_recommendation() -> str:
    """
    Plain-text fallback shown when OpenAI is unreachable.
    Matches the fallback in Java's AIRecommendationService.buildFallbackRecommendation().
    """
    return (
        "Try to maintain a steady speed and avoid sudden acceleration or braking.\n"
        "Keep a safe following distance so you have time to brake gradually.\n"
        "Stay aware of road conditions and reduce speed in poor weather or at night."
    )


# ── GET /recommend/health ─────────────────────────────────────────────────────

@recommendations_bp.route("/recommend/health", methods=["GET"])
def health():
    """
    Quick health check — confirms OpenAI key is configured.
    Useful for debugging without making an actual API call.
    """
    key_set = bool(OPENAI_API_KEY)
    return jsonify({
        "status":       "ok",
        "openai_key":   "configured" if key_set else "NOT SET — set OPENAI_API_KEY env var",
        "model":        MODEL,
    })