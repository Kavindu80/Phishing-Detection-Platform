from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..controllers.analytics_controller import AnalyticsController
from ..middleware.auth import token_required

# Create blueprint
analytics_bp = Blueprint('analytics', __name__)

# Register routes
@analytics_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    """Get analytics data for the dashboard"""
    return AnalyticsController.get_analytics(current_user) 