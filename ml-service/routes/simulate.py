import os
import sys
from flask import Blueprint, request, jsonify

print("__file__ =", __file__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_DIR = os.path.dirname(CURRENT_DIR)
PROJECT_ROOT = os.path.dirname(ML_SERVICE_DIR)

OBD_PATH = os.path.join(PROJECT_ROOT, "obd-simulator")

print("PROJECT_ROOT =", PROJECT_ROOT)
print("OBD_PATH =", OBD_PATH)
print("Exists =", os.path.exists(OBD_PATH))

sys.path.insert(0, OBD_PATH)

from simulate_trip import simulate_trip

simulate_bp = Blueprint("simulate", __name__)

@simulate_bp.route("/simulate", methods=["POST"])
def simulate():
    data    = request.get_json()
    profile = data.get("profile", "average")
    route   = data.get("route",   "bangalore_electronic_city")
    rows    = simulate_trip(profile_name=profile, route_name=route)
    return jsonify({"rows": rows, "total_rows": len(rows)})