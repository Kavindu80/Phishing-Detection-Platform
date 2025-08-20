from flask import Blueprint, jsonify

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data"""
    try:
        # For testing purposes, return mock analytics
        analytics = {
            "total_scans": 100,
            "phishing_detected": 15,
            "safe_urls": 85,
            "detection_rate": 0.85
        }
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 