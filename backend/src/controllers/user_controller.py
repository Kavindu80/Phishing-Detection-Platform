from datetime import datetime
from bson import ObjectId
from flask import jsonify, request, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
import logging

from ..extensions import bcrypt
from ..config.database import get_db
from ..models.user import UserCreate, UserInDB, UserResponse, UserUpdate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserController:
    """Controller for user-related operations"""
    
    @staticmethod
    def register():
        """Register a new user"""
        try:
            # Get request data
            data = request.get_json()
            
            # Validate input data
            user_data = UserCreate(**data)
            
            # Get database connection
            db = get_db()
            
            # Check if user already exists
            existing_email = db.users.find_one({"email": user_data.email})
            if existing_email is not None:
                return jsonify({"error": "Email already registered"}), 400
            
            existing_username = db.users.find_one({"username": user_data.username})
            if existing_username is not None:
                return jsonify({"error": "Username already taken"}), 400
            
            # Hash password
            password_hash = bcrypt.generate_password_hash(user_data.password).decode('utf-8')
            
            # Create user document
            user_dict = user_data.dict(exclude={"password"})
            user_dict["password_hash"] = password_hash
            user_dict["created_at"] = datetime.utcnow()
            user_dict["updated_at"] = datetime.utcnow()
            
            # Insert user into database
            result = db.users.insert_one(user_dict)
            
            # Get the created user
            created_user = db.users.find_one({"_id": result.inserted_id})
            
            # Create response
            user_response = {
                "id": str(created_user["_id"]),
                "username": created_user["username"],
                "email": created_user["email"],
                "first_name": created_user.get("first_name"),
                "last_name": created_user.get("last_name"),
                "created_at": created_user["created_at"]
            }
            
            return jsonify(user_response), 201
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @staticmethod
    def login():
        """Login a user"""
        try:
            # Get request data
            data = request.get_json()
            
            # Log request data for debugging
            logger.info(f"Login attempt for username: {data.get('username', 'unknown')}")
            
            # Check required fields
            if data is None or "username" not in data or "password" not in data:
                logger.error("Missing required fields in login request")
                return jsonify({"error": "Username and password are required"}), 400
            
            # Get database connection
            db = get_db()
            
            # Find user by username or email
            user = db.users.find_one({
                "$or": [
                    {"username": data["username"]},
                    {"email": data["username"]}
                ]
            })
            
            # Log user lookup result
            if user is None:
                logger.error(f"User not found: {data['username']}")
                return jsonify({"error": "Invalid username or password"}), 401
            else:
                logger.info(f"User found: {user['username']}")
                logger.info(f"User ID: {user['_id']}")
                logger.info(f"Password hash exists: {'password_hash' in user}")
                if 'password_hash' in user:
                    logger.info(f"Password hash first 20 chars: {user['password_hash'][:20]}")
            
            # Check if password is correct
            password_check = bcrypt.check_password_hash(user["password_hash"], data["password"])
            logger.info(f"Password check result: {password_check}")
            
            if not password_check:
                logger.error(f"Invalid password for user: {user['username']}")
                return jsonify({"error": "Invalid username or password"}), 401
            
            # Check if user is active
            is_active = user.get("is_active", True)
            if not is_active:
                logger.error(f"Account is disabled: {user['username']}")
                return jsonify({"error": "Account is disabled"}), 401
            
            # Update last login time
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            # Create identity object for JWT - use string as subject
            user_id = str(user["_id"])
            # Store user info in additional claims
            additional_claims = {
                "username": user["username"],
                "email": user["email"],
                "is_admin": user.get("is_admin", False)
            }
            
            # Create access and refresh tokens
            access_token = create_access_token(identity=user_id, additional_claims=additional_claims)
            refresh_token = create_refresh_token(identity=user_id, additional_claims=additional_claims)
            
            logger.info(f"Login successful for user: {user['username']}")
            logger.info(f"Generated access token: {access_token[:20]}...")
            
            return jsonify({
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user["_id"]),
                    "username": user["username"],
                    "email": user["email"],
                    "first_name": user.get("first_name"),
                    "last_name": user.get("last_name"),
                    "is_admin": user.get("is_admin", False)
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @staticmethod
    def get_user(current_user, user_id):
        """Get a user by ID"""
        try:
            # Check if user is requesting their own data or is admin
            if str(current_user["id"]) != user_id and not current_user.get("is_admin", False):
                return jsonify({"error": "Unauthorized"}), 403
            
            # Get database connection
            db = get_db()
            
            # Find user by ID
            user = db.users.find_one({"_id": ObjectId(user_id)})
            
            if user is None:
                return jsonify({"error": "User not found"}), 404
            
            # Create response
            user_response = {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "is_active": user.get("is_active", True),
                "is_admin": user.get("is_admin", False),
                "created_at": user["created_at"],
                "last_login": user.get("last_login")
            }
            
            return jsonify(user_response), 200
            
        except Exception as e:
            logger.error(f"Get user error: {str(e)}")
            return jsonify({"error": str(e)}), 400
    
    @staticmethod
    def update_user(current_user, user_id):
        """Update a user"""
        try:
            # Check if user is updating their own data or is admin
            if str(current_user["id"]) != user_id and not current_user.get("is_admin", False):
                return jsonify({"error": "Unauthorized"}), 403
            
            # Get request data
            data = request.get_json()
            
            # Validate input data
            update_data = UserUpdate(**data)
            
            # Get database connection
            db = get_db()
            
            # Find user by ID
            user = db.users.find_one({"_id": ObjectId(user_id)})
            
            if user is None:
                return jsonify({"error": "User not found"}), 404
            
            # Prepare update document
            update_dict = update_data.dict(exclude_none=True)
            
            # Hash password if provided
            if "password" in update_dict:
                update_dict["password_hash"] = bcrypt.generate_password_hash(update_dict["password"]).decode('utf-8')
                del update_dict["password"]
            
            # Add updated_at timestamp
            update_dict["updated_at"] = datetime.utcnow()
            
            # Update user in database
            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_dict}
            )
            
            # Get the updated user
            updated_user = db.users.find_one({"_id": ObjectId(user_id)})
            
            # Create response
            user_response = {
                "id": str(updated_user["_id"]),
                "username": updated_user["username"],
                "email": updated_user["email"],
                "first_name": updated_user.get("first_name"),
                "last_name": updated_user.get("last_name"),
                "is_active": updated_user.get("is_active", True),
                "updated_at": updated_user["updated_at"]
            }
            
            return jsonify(user_response), 200
            
        except Exception as e:
            logger.error(f"Update user error: {str(e)}")
            return jsonify({"error": str(e)}), 400
            
    @staticmethod
    @jwt_required(refresh=True)
    def refresh_token():
        """Refresh access token using refresh token"""
        try:
            # Get user identity from refresh token
            user_id = get_jwt_identity()
            
            # Get database connection
            db = get_db()
            
            # Find user by ID
            user = db.users.find_one({"_id": ObjectId(user_id)})
            
            if user is None:
                logger.error(f"User not found during token refresh: {user_id}")
                return jsonify({"error": "Invalid refresh token"}), 401
                
            # Create additional claims
            additional_claims = {
                "username": user["username"],
                "email": user["email"],
                "is_admin": user.get("is_admin", False)
            }
            
            # Create new access token
            access_token = create_access_token(identity=user_id, additional_claims=additional_claims)
            
            logger.info(f"Token refreshed for user: {user['username']}")
            
            return jsonify({
                "access_token": access_token,
                "user": {
                    "id": str(user["_id"]),
                    "username": user["username"],
                    "email": user["email"],
                    "is_admin": user.get("is_admin", False)
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return jsonify({"error": str(e)}), 400 