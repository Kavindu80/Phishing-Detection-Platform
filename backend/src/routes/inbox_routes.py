from flask import Blueprint, jsonify, request, redirect, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
import base64
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from email.mime.text import MIMEText
import logging
from datetime import datetime
from google.auth.transport.requests import Request

from ..middleware.auth import get_current_user
from ..controllers.scan_controller import ScanController

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
inbox_bp = Blueprint('inbox', __name__)

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Gmail client configuration
CLIENT_CONFIG = {
    'web': {
        'client_id': '1088026914586-9qjuc4k4cvv1mep9enppu4r16f2c4mi3.apps.googleusercontent.com',
        'client_secret': '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',
        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
        'token_uri': 'https://oauth2.googleapis.com/token',
        'auth_provider_x509_cert_url': 'https://www.googleapis.com/oauth2/v1/certs',
        'redirect_uris': [os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/inbox/oauth2callback')],
        'javascript_origins': [os.environ.get('FRONTEND_URL', 'http://localhost:5173')]
    }
}

# Helper functions
def get_user_credentials(user_id):
    """Get stored OAuth credentials for a user and refresh if expired."""
    try:
        # In a real application, these would be stored in a secure database
        # This is just a simple example using files (not recommended for production)
        creds_path = f"user_credentials/{user_id}.json"
        
        if not os.path.exists(creds_path):
            return None
            
        with open(creds_path, 'r') as f:
            creds_data = json.load(f)
        
        # Ensure scopes are applied when constructing credentials
        credentials = Credentials.from_authorized_user_info(creds_data, scopes=SCOPES)
        
        # Auto-refresh expired credentials when possible
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                logger.info("Refreshing expired Gmail credentials for user %s", user_id)
                credentials.refresh(Request())
                # Persist refreshed credentials
                save_user_credentials(user_id, credentials)
            except Exception as refresh_error:
                logger.error(f"Failed to refresh Gmail credentials: {str(refresh_error)}")
                return None
        
        return credentials
    except Exception as e:
        logger.error(f"Error getting credentials: {str(e)}")
        return None

def save_user_credentials(user_id, credentials):
    """Save OAuth credentials for a user"""
    try:
        # Create directory if it doesn't exist
        if not os.path.exists("user_credentials"):
            os.makedirs("user_credentials")
            
        # Save credentials to a file (in a real app, store in a secure database)
        creds_path = f"user_credentials/{user_id}.json"
        creds_data = json.loads(credentials.to_json())
        
        with open(creds_path, 'w') as f:
            json.dump(creds_data, f)
            
        return True
    except Exception as e:
        logger.error(f"Error saving credentials: {str(e)}")
        return False

def get_gmail_service(credentials):
    """Build and return the Gmail API service"""
    try:
        return build('gmail', 'v1', credentials=credentials)
    except Exception as e:
        logger.error(f"Error building Gmail service: {str(e)}")
        return None

def parse_gmail_message(message):
    """Parse a Gmail message into a standardized format"""
    try:
        # Get headers
        headers = {header['name'].lower(): header['value'] for header in message['payload']['headers']}
        
        # Extract basic info
        email_data = {
            'id': message['id'],
            'threadId': message['threadId'],
            'snippet': message.get('snippet', ''),
            'date': headers.get('date', ''),
            'from': headers.get('from', ''),
            'to': headers.get('to', ''),
            'subject': headers.get('subject', ''),
            'content': '',
            'body': ''
        }
        
        # Extract body content
        parts = message['payload'].get('parts', [])
        if not parts:
            # Handle simple messages
            if 'body' in message['payload'] and 'data' in message['payload']['body']:
                body_data = message['payload']['body']['data']
                decoded_data = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')
                email_data['content'] = decoded_data
                email_data['body'] = decoded_data
        else:
            # Handle multipart messages
            for part in parts:
                if part['mimeType'] == 'text/plain' and 'data' in part['body']:
                    body_data = part['body']['data']
                    decoded_data = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')
                    email_data['content'] = decoded_data
                elif part['mimeType'] == 'text/html' and 'data' in part['body']:
                    body_data = part['body']['data']
                    decoded_data = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')
                    email_data['body'] = decoded_data
        
        return email_data
    except Exception as e:
        logger.error(f"Error parsing Gmail message: {str(e)}")
        return {
            'id': message['id'],
            'snippet': message.get('snippet', ''),
            'error': f"Error parsing message: {str(e)}"
        }

# Routes
@inbox_bp.route('/connection', methods=['GET'])
@jwt_required()
def check_connection():
    """Check if user is connected to Gmail"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
            
        user_id = user['id']
        credentials = get_user_credentials(user_id)
        
        if not credentials:
            return jsonify({
                "connected": False,
                "message": "Not connected to Gmail"
            })
            
        # If expired and cannot refresh, report disconnected
        if credentials.expired and not credentials.refresh_token:
            return jsonify({
                "connected": False, 
                "message": "Gmail connection expired"
            })
            
        return jsonify({
            "connected": True,
            "message": "Connected to Gmail"
        })
    except Exception as e:
        logger.error(f"Error checking connection: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/connect', methods=['GET'])
@jwt_required()
def connect_gmail():
    """Start OAuth flow to connect to Gmail"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
            
        # Create OAuth flow
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=CLIENT_CONFIG['web']['redirect_uris'][0]
        )
        
        # Store user ID in session for callback
        session_data = {'user_id': user['id']}
        
        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=json.dumps(session_data)
        )
        
        return jsonify({
            "auth_url": auth_url,
            "message": "Please authorize access to your Gmail"
        })
    except Exception as e:
        logger.error(f"Error connecting to Gmail: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/oauth2callback', methods=['GET'])
def oauth2callback():
    """Handle OAuth callback from Gmail"""
    try:
        # Get state and authorization code
        state = request.args.get('state')
        code = request.args.get('code')
        
        if not state or not code:
            return jsonify({"error": "Missing state or authorization code"}), 400
            
        # Parse state to get user ID
        session_data = json.loads(state)
        user_id = session_data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user ID in state"}), 400
            
        # Create OAuth flow
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=CLIENT_CONFIG['web']['redirect_uris'][0],
            state=state
        )
        
        # Exchange authorization code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save credentials for the user
        save_user_credentials(user_id, credentials)
        
        # Redirect to inbox page
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/inbox?connected=true")
    except Exception as e:
        logger.error(f"Error in OAuth callback: {str(e)}")
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/inbox?error=true")

@inbox_bp.route('/emails', methods=['GET'])
@jwt_required()
def get_emails():
    """Get emails from user's Gmail account"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
            
        user_id = user['id']
        credentials = get_user_credentials(user_id)
        
        if not credentials:
            return jsonify({
                "error": "Not connected to Gmail",
                "connected": False
            }), 403
            
        # Get query parameters
        limit = min(int(request.args.get('limit', 50)), 100)  # Limit to 100 emails max
        query = request.args.get('query', '')
        skip_if_cached = request.args.get('skipIfCached', 'false').lower() == 'true'
        
        # Check if client wants to use cached data
        if skip_if_cached:
            # Add cache control headers to allow client-side caching
            response = jsonify({
                "emails": [],
                "total": 0,
                "cached": True,
                "timestamp": None
            })
            response.headers['Cache-Control'] = 'private, max-age=300'  # Cache for 5 minutes
            return response
        
        # Ensure valid credentials before building service
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                save_user_credentials(user_id, credentials)
            except Exception as refresh_error:
                logger.error(f"Failed to refresh credentials when fetching emails: {str(refresh_error)}")
                return jsonify({"error": "Failed to refresh Gmail credentials"}), 401
        
        # Get Gmail service
        gmail = get_gmail_service(credentials)
        if not gmail:
            return jsonify({"error": "Failed to connect to Gmail API"}), 500
            
        # List messages
        result = gmail.users().messages().list(
            userId='me',
            maxResults=limit,
            q=query
        ).execute()
        
        messages = result.get('messages', [])
        
        # Get details for each message
        emails = []
        for msg in messages[:limit]:
            message = gmail.users().messages().get(
                userId='me',
                id=msg['id'],
                format='full'
            ).execute()
            
            # Parse message
            email_data = parse_gmail_message(message)
            emails.append(email_data)
        
        # Create response with cache headers
        response = jsonify({
            "emails": emails,
            "total": result.get('resultSizeEstimate', len(emails)),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Add cache control headers
        response.headers['Cache-Control'] = 'private, max-age=300'  # Cache for 5 minutes
        
        return response
    except Exception as e:
        logger.error(f"Error getting emails: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/emails/<email_id>', methods=['GET'])
@jwt_required()
def get_email(email_id):
    """Get a single email by ID"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 401
        
        user_id = user['id']
        credentials = get_user_credentials(user_id)
        if not credentials:
            return jsonify({"error": "Not connected to Gmail"}), 403
        
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                save_user_credentials(user_id, credentials)
            except Exception as refresh_error:
                logger.error(f"Failed to refresh credentials when fetching email: {str(refresh_error)}")
                return jsonify({"error": "Failed to refresh Gmail credentials"}), 401
        
        gmail = get_gmail_service(credentials)
        if not gmail:
            return jsonify({"error": "Failed to connect to Gmail API"}), 500
        
        message = gmail.users().messages().get(
            userId='me',
            id=email_id,
            format='full'
        ).execute()
        email_data = parse_gmail_message(message)
        return jsonify(email_data)
    except Exception as e:
        logger.error(f"Error getting email: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/scan/<email_id>', methods=['POST'])
@jwt_required()
def scan_gmail_email(email_id):
    """Scan a Gmail email for phishing"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
            
        user_id = user['id']
        credentials = get_user_credentials(user_id)
        
        if not credentials:
            return jsonify({"error": "Not connected to Gmail"}), 403
            
        # Get Gmail service
        gmail = get_gmail_service(credentials)
        if not gmail:
            return jsonify({"error": "Failed to connect to Gmail API"}), 500
            
        # Get message
        message = gmail.users().messages().get(
            userId='me',
            id=email_id,
            format='full'
        ).execute()
        
        # Parse message
        email_data = parse_gmail_message(message)
        
        # Get email content for scanning
        email_content = email_data.get('content', '') or email_data.get('body', '') or email_data.get('snippet', '')
        
        # Add a request property to indicate this is from connected Gmail
        setattr(request, 'is_connected_account', True)
        
        # Call scan controller with user credentials
        result = ScanController.scan_email_content(email_content, user)
        
        # Ensure confidence is correctly formatted
        if 'confidence' in result:
            if isinstance(result['confidence'], (int, float)) and result['confidence'] > 100:
                logger.warning(f"Fixing abnormal confidence value in Gmail scan: {result['confidence']}")
                result['confidence'] = min(float(result['confidence']), 100.0)
        
        # Add email metadata to result
        result['email_id'] = email_id
        result['subject'] = email_data.get('subject')
        result['from'] = email_data.get('from')
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error scanning Gmail email: {str(e)}")
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/scan-result/<email_id>', methods=['GET'])
@jwt_required()
def get_scan_result(email_id):
    """Get scan results for a Gmail email"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
            
        # This is a placeholder - in a real app, we would store and retrieve 
        # scan results from a database based on email_id and user_id
        return jsonify({
            "error": "Scan result not found. Please scan this email first."
        }), 404
    except Exception as e:
        logger.error(f"Error getting scan result: {str(e)}")
        return jsonify({"error": str(e)}), 500 

@inbox_bp.route('/disconnect', methods=['POST'])
@jwt_required()
def disconnect_gmail():
    """Disconnect Gmail by deleting stored credentials for the current user"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 401
        user_id = user['id']
        creds_path = f"user_credentials/{user_id}.json"
        if os.path.exists(creds_path):
            os.remove(creds_path)
        return jsonify({"disconnected": True})
    except Exception as e:
        logger.error(f"Error disconnecting Gmail: {str(e)}")
        return jsonify({"error": str(e)}), 500 