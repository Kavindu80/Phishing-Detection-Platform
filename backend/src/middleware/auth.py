from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
from functools import wraps
import logging

from ..config.database import get_db
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_current_user():
    """
    Get the current user from JWT identity
    
    Returns:
        dict: User object with id and username
    """
    try:
        # Get user ID from JWT
        user_id = get_jwt_identity()
        
        # Get user from database
        db = get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if user is None:
            return None
        
        # Return user object
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "role": user.get("role", "user")
        }
        
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return None

def token_required(f):
    """Decorator to require a valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # Verify JWT token
            verify_jwt_in_request()
            
            # Get current user
            current_user = get_current_user()
            
            if current_user is None:
                logger.warning("Invalid token or user not found")
                return jsonify({"error": "Authentication failed"}), 401
                
            return f(current_user, *args, **kwargs)
        except NoAuthorizationError:
            logger.warning("Missing Authorization header")
            return jsonify({"error": "Authorization header is missing"}), 401
        except InvalidHeaderError:
            logger.warning("Invalid Authorization header")
            return jsonify({"error": "Invalid Authorization header"}), 401
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401
    return decorated

def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # Verify JWT token
            verify_jwt_in_request()
            
            # Get current user
            current_user = get_current_user()
            
            if current_user is None:
                logger.warning("Invalid token or user not found")
                return jsonify({"error": "Authentication failed"}), 401
                
            # Check if user is admin
            if current_user.get('role') != 'admin':
                logger.warning(f"Non-admin user {current_user.get('username')} attempted to access admin endpoint")
                return jsonify({"error": "Admin privileges required"}), 403
                
            return f(current_user, *args, **kwargs)
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401
    return decorated

def rate_limit(limit=100, per=60):
    """
    Rate limiting decorator
    
    Args:
        limit (int): Maximum number of requests
        per (int): Time window in seconds
    """
    def decorator(f):
        # Store request timestamps per user
        request_history = {}
        
        @wraps(f)
        def decorated(*args, **kwargs):
            # Get client IP
            client_ip = request.remote_addr
            
            # Get current time
            now = int(datetime.now().timestamp())
            
            # Initialize history for this client if not exists
            if client_ip not in request_history:
                request_history[client_ip] = []
            
            # Clean up old requests
            request_history[client_ip] = [t for t in request_history[client_ip] if t > now - per]
            
            # Check rate limit
            if len(request_history[client_ip]) >= limit:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # Add current request to history
            request_history[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated
    return decorator 