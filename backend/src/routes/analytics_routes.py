from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    """Get analytics data - Requires authentication"""
    try:
        current_user = get_jwt_identity()
        
        # For testing purposes, return mock analytics
        analytics = {
            "total_scans": 100,
            "phishing_detected": 15,
            "safe_urls": 85,
            "detection_rate": 0.85,
            "user_id": current_user
        }
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/analytics/export', methods=['GET'])
@jwt_required()
def export_analytics():
    """Export analytics data - Requires authentication"""
    try:
        current_user = get_jwt_identity()
        
        # Mock export data
        export_data = {
            "user_id": current_user,
            "export_date": "2025-01-20",
            "data": {
                "total_scans": 100,
                "phishing_detected": 15,
                "safe_urls": 85
            }
        }
        return jsonify(export_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 