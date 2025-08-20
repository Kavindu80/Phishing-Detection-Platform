from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..controllers.user_controller import UserController
from ..middleware.auth import token_required

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Register routes
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    return UserController.register()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user"""
    return UserController.login()

@auth_bp.route('/user/<user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    """Get a user by ID"""
    return UserController.get_user(current_user, user_id)

@auth_bp.route('/user/<user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    """Update a user"""
    return UserController.update_user(current_user, user_id)

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get the current user"""
    return UserController.get_user(current_user, current_user['id'])

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Refresh access token"""
    return UserController.refresh_token() 