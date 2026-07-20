import os
import time
import math
from flask import Blueprint, request, jsonify, send_file, current_app

maps_bp = Blueprint("maps", __name__)

_BASE       = os.path.join(os.path.dirname(__file__), "..")
MAPS_OUTPUT = os.path.join(_BASE, "maps", "output")
os.makedirs(MAPS_OUTPUT, exist_ok=True)

@maps_bp.route("/generate-map", methods=["POST"])
def generate_map():
    try:
        import folium
        from folium.plugins import MiniMap
    except ImportError:
        return jsonify({"error": "folium not installed. Run: pip install folium"}), 500

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    user_id = data.get("user_id", 0)
    rows    = data.get("rows", [])

    if len(rows) < 2:
        return jsonify({"error": "Need at least 2 GPS points to generate a map"}), 400

    points = _parse_gps_rows(rows)
    if len(points) < 2:
        return jsonify({"error": "Could not parse valid GPS coordinates"}), 400

    scored = _score_points(points)

    center_lat = sum(p["lat"] for p in points) / len(points)
    center_lng = sum(p["lng"] for p in points) / len(points)

    m = folium.Map(
        location=[center_lat, center_lng],
        zoom_start=13,
        tiles="OpenStreetMap"     
    )

    MiniMap(toggle_display=True).add_to(m)

    _draw_route_segments(m, scored)

    _add_markers(m, points)

    stats = _compute_stats(scored)
    _add_stats_legend(m, stats)

    legend_html = """
    <div style="position: fixed; bottom: 50px; left: 50px; z-index: 1000;
                background-color: white; padding: 10px; border-radius: 8px;
                border: 2px solid #6c63ff; font-family: Arial, sans-serif;">
        <b>🚗 DriveSafe AI Risk Levels</b><br>
        <i class="fa fa-circle" style="color:#e74c3c"></i> High Risk (6-10)<br>
        <i class="fa fa-circle" style="color:#f39c12"></i> Medium Risk (3-6)<br>
        <i class="fa fa-circle" style="color:#27ae60"></i> Low Risk (0-3)<br>
        <i class="fa fa-play"   style="color:#27ae60"></i> Trip Start<br>
        <i class="fa fa-stop"   style="color:#2c3e50"></i> Trip End
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    map_id       = f"{user_id}_{int(time.time())}"
    output_path  = os.path.join(MAPS_OUTPUT, f"map_{map_id}.html")
    m.save(output_path)

    base_url = _get_base_url()
    map_url  = f"{base_url}/view-map/{map_id}"

    return jsonify({
        "map_url":          map_url,
        "map_id":           map_id,
        "total_points":     stats["total_points"],
        "avg_risk":         round(stats["avg_risk"],  2),
        "max_risk":         round(stats["max_risk"],  2),
        "high_risk_events": stats["high_risk_events"],
    })

@maps_bp.route("/generate-heatmap", methods=["POST"])
def generate_heatmap():
    try:
        import folium
        from folium.plugins import HeatMap
    except ImportError:
        return jsonify({"error": "folium not installed. Run: pip install folium"}), 500

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    user_id = data.get("user_id", 0)
    rows    = data.get("rows", [])

    if len(rows) < 2:
        return jsonify({"error": "Need at least 2 GPS points"}), 400

    points = _parse_gps_rows(rows)
    if len(points) < 2:
        return jsonify({"error": "Could not parse valid GPS coordinates"}), 400

    scored = _score_points(points)

    center_lat = sum(p["lat"] for p in points) / len(points)
    center_lng = sum(p["lng"] for p in points) / len(points)

    m = folium.Map(
        location=[center_lat, center_lng],
        zoom_start=13,
        tiles="OpenStreetMap"
    )

    heat_data = [
        [p["lat"], p["lng"], p["risk_score"]]
        for p in scored
    ]

    HeatMap(
        heat_data,
        min_opacity=0.4,
        max_zoom=16,
        radius=15,
        blur=10,
        gradient={
            0.0: "green",
            0.4: "yellow",
            0.7: "orange",
            1.0: "red",
        }
    ).add_to(m)

    legend_html = """
    <div style="position: fixed; bottom: 30px; left: 30px; z-index: 1000;
                background-color: white; padding: 10px; border-radius: 8px;
                border: 2px solid #888; font-family: Arial, sans-serif; font-size:13px;">
        <b>🔥 Risk Heatmap</b><br>
        <span style="color:green">■</span> Low &nbsp;&nbsp;
        <span style="color:orange">■</span> &nbsp;&nbsp;
        <span style="color:red">■</span> High
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))

    map_id      = f"{user_id}_heat_{int(time.time())}"
    output_path = os.path.join(MAPS_OUTPUT, f"heatmap_{map_id}.html")
    m.save(output_path)

    base_url     = _get_base_url()
    heatmap_url  = f"{base_url}/view-heatmap/{map_id}"

    return jsonify({
        "heatmap_url": heatmap_url,
        "map_id":      map_id,
    })

@maps_bp.route("/view-map/<map_id>")
def view_map(map_id):
    safe_id = "".join(c for c in map_id if c.isalnum() or c == "_")
    path = os.path.join(MAPS_OUTPUT, f"map_{safe_id}.html")

    if not os.path.exists(path):
        return "<h3>Map not found or not yet generated.</h3>", 404

    return send_file(path, mimetype="text/html")

@maps_bp.route("/view-heatmap/<map_id>")
def view_heatmap(map_id):
    safe_id = "".join(c for c in map_id if c.isalnum() or c == "_")
    path = os.path.join(MAPS_OUTPUT, f"heatmap_{safe_id}.html")

    if not os.path.exists(path):
        return "<h3>Heatmap not found or not yet generated.</h3>", 404

    return send_file(path, mimetype="text/html")

def _parse_gps_rows(rows: list) -> list:
    points = []
    for row in rows:
        try:
            lat = float(row.get("latitude",  row.get("lat", 0)))
            lng = float(row.get("longitude", row.get("lng", row.get("lon", 0))))
            if lat == 0 and lng == 0:
                continue
            points.append({
                "lat":          lat,
                "lng":          lng,
                "speed":        float(row.get("speed",        0)),
                "acceleration": float(row.get("acceleration", 0)),
                "rpm":          float(row.get("rpm",          0)),
            })
        except (ValueError, TypeError):
            continue
    return points


def _score_points(points: list) -> list:
    scored = []
    for p in points:
        risk = 0.0

        s = p["speed"]
        if   s > 140: risk += 4.0
        elif s > 120: risk += 3.0
        elif s > 100: risk += 2.0
        elif s > 80:  risk += 1.0

        a = p["acceleration"]
        if a < -2.94:     risk += 3.0
        elif a < -1.5:    risk += 1.5

        if a > 2.0:        risk += 2.0
        elif a > 1.0:      risk += 1.0

        if p["rpm"] > 4000: risk += 1.0

        scored.append({**p, "risk_score": min(risk, 10.0)})

    return scored


def _draw_route_segments(m, scored: list):
    import folium

    for i in range(len(scored) - 1):
        p1 = scored[i]
        p2 = scored[i + 1]

        avg_risk = (p1["risk_score"] + p2["risk_score"]) / 2.0
        color    = _risk_color(avg_risk)
        weight   = 4 if avg_risk >= 6 else 3

        folium.PolyLine(
            locations=[[p1["lat"], p1["lng"]], [p2["lat"], p2["lng"]]],
            color=color,
            weight=weight,
            opacity=0.85,
            tooltip=f"Risk: {avg_risk:.1f}/10 | Speed: {p1['speed']:.0f} km/h"
        ).add_to(m)

def _add_markers(m, points: list):
    import folium

    folium.Marker(
        location=[points[0]["lat"],  points[0]["lng"]],
        popup="Trip Start",
        icon=folium.Icon(color="green", icon="play", prefix="fa")
    ).add_to(m)

    folium.Marker(
        location=[points[-1]["lat"], points[-1]["lng"]],
        popup="Trip End",
        icon=folium.Icon(color="black", icon="stop", prefix="fa")
    ).add_to(m)


def _add_stats_legend(m, stats: dict):
    import folium

    html = f"""
    <div style="position: fixed; top: 10px; right: 10px; z-index: 1000;
                background-color: white; padding: 12px; border-radius: 8px;
                border: 1px solid #ccc; font-family: Arial, sans-serif; font-size: 13px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2); min-width: 180px;">
        <b>📊 Trip Statistics</b><br>
        <span style="color:#e74c3c">●</span> Total Points: {stats['total_points']}<br>
        <span style="color:#3498db">⊞</span> Average Risk: {stats['avg_risk']:.2f}/10<br>
        <span style="color:#e74c3c">●</span> Max Risk: {stats['max_risk']:.2f}/10<br>
        <span style="color:#f39c12">▲</span> High Risk Events: {stats['high_risk_events']}<br>
        Est. Distance: {stats['distance_km']:.1f} km
    </div>
    """
    m.get_root().html.add_child(folium.Element(html))


def _compute_stats(scored: list) -> dict:
    total   = len(scored)
    risks   = [p["risk_score"] for p in scored]
    avg     = sum(risks) / total if total else 0
    maximum = max(risks) if risks else 0
    high    = sum(1 for r in risks if r >= 6)

    # Estimate distance using haversine
    dist = 0.0
    for i in range(len(scored) - 1):
        dist += _haversine_km(
            scored[i]["lat"],   scored[i]["lng"],
            scored[i+1]["lat"], scored[i+1]["lng"]
        )

    return {
        "total_points":     total,
        "avg_risk":         avg,
        "max_risk":         maximum,
        "high_risk_events": high,
        "distance_km":      dist,
    }


def _risk_color(risk: float) -> str:
    if risk >= 6.0: return "#e74c3c"   # red   — High Risk
    if risk >= 3.0: return "#f39c12"   # orange — Medium Risk
    return "#27ae60"                    # green  — Low Risk


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_base_url() -> str:
    return os.environ.get("FLASK_BASE_URL", "http://localhost:5000")
