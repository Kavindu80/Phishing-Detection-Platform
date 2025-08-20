import pytest
import json
from unittest.mock import patch, MagicMock
from app import create_app
from src.models.user import User
from src.models.scan import Scan

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app('testing')
    return app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test that health check returns 200."""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'

class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_register_user(self, client):
        """Test user registration."""
        user_data = {
            'email': 'test@example.com',
            'password': 'testpassword123',
            'name': 'Test User'
        }
        response = client.post('/api/auth/register',
                             data=json.dumps(user_data),
                             content_type='application/json')
        assert response.status_code == 201
        
    def test_login_user(self, client):
        """Test user login."""
        # First register a user
        user_data = {
            'email': 'test@example.com',
            'password': 'testpassword123',
            'name': 'Test User'
        }
        client.post('/api/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        # Then login
        login_data = {
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        response = client.post('/api/auth/login',
                             data=json.dumps(login_data),
                             content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'token' in data

class TestScanEndpoints:
    """Test scanning endpoints."""
    
    def test_public_scan(self, client):
        """Test public email scanning."""
        scan_data = {
            'emailText': 'This is a test email content',
            'language': 'auto'
        }
        response = client.post('/api/scan',
                             data=json.dumps(scan_data),
                             content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'prediction' in data
        assert 'confidence' in data
        
    def test_authenticated_scan(self, client):
        """Test authenticated email scanning."""
        # First register and login to get token
        user_data = {
            'email': 'test@example.com',
            'password': 'testpassword123',
            'name': 'Test User'
        }
        client.post('/api/auth/register',
                   data=json.dumps(user_data),
                   content_type='application/json')
        
        login_data = {
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        login_response = client.post('/api/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        token = json.loads(login_response.data)['token']
        
        # Then perform authenticated scan
        scan_data = {
            'emailText': 'This is a test email content',
            'language': 'auto'
        }
        headers = {'Authorization': f'Bearer {token}'}
        response = client.post('/api/scan/auth',
                             data=json.dumps(scan_data),
                             content_type='application/json',
                             headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'prediction' in data
        assert 'confidence' in data

class TestAnalyticsEndpoints:
    """Test analytics endpoints."""
    
    def test_get_analytics(self, client):
        """Test getting analytics data."""
        response = client.get('/api/analytics')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'total_scans' in data
        assert 'phishing_detected' in data

class TestModelEndpoints:
    """Test ML model endpoints."""
    
    def test_model_status(self, client):
        """Test ML model status endpoint."""
        response = client.get('/api/model/status')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data
        assert 'model_loaded' in data

class TestErrorHandling:
    """Test error handling."""
    
    def test_404_error(self, client):
        """Test 404 error handling."""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        
    def test_invalid_json(self, client):
        """Test invalid JSON handling."""
        response = client.post('/api/scan',
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 400 