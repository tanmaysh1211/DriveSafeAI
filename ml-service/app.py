"""
app.py — DriveSafe AI Flask ML Service entry point

Registers all blueprints and starts the Flask dev server.

Run:
    cd ml-service
    source venv/bin/activate
    python app.py

Endpoints registered:
    POST /predict          → scoring.py   — LightGBM DriveScore
    POST /generate-map     → maps.py      — Folium route map
    POST /generate-heatmap → maps.py      — Folium heatmap
    GET  /view-map/<id>    → maps.py      — Serve map HTML
    GET  /view-heatmap/<id>→ maps.py      — Serve heatmap HTML
    POST /recommend        → recommendations.py — OpenAI trip advice
    GET  /recommend/health → recommendations.py — Key check
    GET  /health           → this file    — Service health check
    GET  /                 → this file    — API index page
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS

from routes.scoring        import scoring_bp,        load_model
from routes.maps           import maps_bp
from routes.recommendations import recommendations_bp
from routes.simulate import simulate_bp

# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> Flask:
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────
    # Allow calls from Spring Boot (8080) and React (5173)
    CORS(app, resources={r"/*": {"origins": [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        os.environ.get("ALLOWED_ORIGIN", ""),
    ]}})

    # ── Register blueprints ───────────────────────────────────────────
    app.register_blueprint(simulate_bp)
    app.register_blueprint(scoring_bp)
    app.register_blueprint(maps_bp)
    app.register_blueprint(recommendations_bp)

    # ── Health check ──────────────────────────────────────────────────
    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "DriveSafe AI ML Service"})

    # ── API index (shown in browser at localhost:5000) ─────────────────
    @app.route("/")
    def index():
        return """
        <html>
        <head><title>DriveSafe AI ML Service</title></head>
        <body style="font-family:Arial;padding:30px;background:#f0f0f5">
            <h2>🚗 DriveSafe AI Map Visualization API</h2>
            <div style="background:#e8f0fe;padding:15px;border-radius:8px;margin:10px 0">
                <b>📋 Available Endpoints:</b><br><br>
                <b>POST /predict</b>        — DriveScore from trip telemetry<br>
                <b>POST /generate-map</b>   — Colour-coded Folium route map<br>
                <b>POST /generate-heatmap</b>— Risk heatmap<br>
                <b>GET  /view-map/&lt;id&gt;</b>  — Serve route map HTML<br>
                <b>GET  /view-heatmap/&lt;id&gt;</b>— Serve heatmap HTML<br>
                <b>POST /recommend</b>      — OpenAI trip recommendation<br>
                <b>GET  /health</b>         — Service health<br>
            </div>
            <p style="color:#666">ML Service running on port 5000</p>
        </body>
        </html>
        """

    return app


# ── Startup ───────────────────────────────────────────────────────────────────

# Create the Flask app at module level
app = create_app()

if __name__ == "__main__":
    # Load LightGBM model into memory once before accepting requests
    load_model()

    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"

    print(f"\n🚗 DriveSafe AI ML Service starting on port {port}")
    print(f"   Debug mode: {debug}")
    print(f"   CORS origins: localhost:8080, localhost:5173\n")

    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=debug)