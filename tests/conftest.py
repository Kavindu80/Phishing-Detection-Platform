"""
PhishGuard Test Suite - Shared Fixtures
======================================
Common fixtures and configuration for all tests.
"""

import pytest
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend source to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


# =============================================================================
# pytest-html Hooks for Capturing Output
# =============================================================================

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook to capture test output and add to HTML report"""
    outcome = yield
    report = outcome.get_result()
    
    # Add captured stdout/stderr to HTML report
    if report.when == "call":
        extra = getattr(report, "extra", [])
        
        # Add test docstring as description
        if item.function.__doc__:
            from pytest_html import extras
            try:
                extra.append(extras.text(item.function.__doc__.strip()))
            except Exception:
                pass
        
        report.extra = extra


@pytest.fixture(autouse=True)
def log_test_info(request, capfd):
    """Auto-fixture to capture and log test info for each test"""
    test_name = request.node.name
    logger.info(f"Starting test: {test_name}")
    
    yield
    
    # After test completes, capture output
    captured = capfd.readouterr()
    if captured.out:
        logger.info(f"Test output: {captured.out[:200]}")


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def phishing_email_samples():
    """Known phishing email samples for testing - EP: Valid Phishing Partition"""
    return [
        {
            "text": "URGENT: Your account has been compromised! Click here immediately: http://bit.ly/security-fix to verify your identity. Act now or lose access!",
            "expected_result": "phishing",
            "min_confidence": 70
        },
        {
            "text": "Congratulations! You've won $1,000,000! Send your bank details to claim. This is not a scam, act immediately!",
            "expected_result": "phishing",
            "min_confidence": 70
        },
        {
            "text": "Dear Customer, We detected unusual activity on your PayPaI account. Login at http://paypa1-secure.com to verify.",
            "expected_result": "phishing",
            "min_confidence": 60
        }
    ]


@pytest.fixture
def legitimate_email_samples():
    """Known legitimate email samples - EP: Valid Legitimate Partition"""
    return [
        {
            "text": "Hi Team, Please find attached the meeting notes from yesterday. Let me know if you have any questions.",
            "expected_result": "legitimate",
            "max_confidence": 30
        },
        {
            "text": "Your order #12345 has been shipped and will arrive in 3-5 business days. Track your package at ups.com",
            "expected_result": "legitimate",
            "max_confidence": 40
        },
        {
            "text": "Reminder: Your dentist appointment is scheduled for tomorrow at 2 PM. Please arrive 15 minutes early.",
            "expected_result": "legitimate",
            "max_confidence": 30
        }
    ]


@pytest.fixture
def boundary_value_emails():
    """Boundary Value Analysis test data"""
    return {
        "empty": "",
        "single_char": "a",
        "min_valid": "Hello",  # Minimum valid length
        "max_length": "x" * 50000,  # Maximum expected length
        "whitespace_only": "   \t\n  ",
    }


@pytest.fixture
def special_character_emails():
    """Equivalence Partitioning - Special Characters"""
    return [
        "<script>alert('XSS')</script>",
        "SELECT * FROM users; DROP TABLE users;--",
        "Hello 你好 مرحبا こんにちは",
        "Email with emojis 🎉 🔒 ⚠️",
    ]


# ============================================================================
# User Authentication Fixtures
# ============================================================================

@pytest.fixture
def valid_user_data():
    """Valid user registration data"""
    return {
        "email": "testuser@example.com",
        "password": "SecurePass123!",
        "name": "Test User"
    }


@pytest.fixture
def invalid_emails():
    """EP: Invalid email partition"""
    return [
        "notanemail",
        "user@",
        "@domain.com",
        "user@domain",
        "user.domain.com",
        "",
        "   ",
    ]


@pytest.fixture
def password_boundary_values():
    """BVA for password length"""
    return {
        "too_short_7": "Pass12!",      # 7 chars - below minimum
        "min_valid_8": "Pass123!",      # 8 chars - at minimum
        "valid_12": "SecurePass1!",     # 12 chars - normal
        "long_50": "A" * 45 + "bcde1",  # 50 chars - long but valid
    }


@pytest.fixture
def weak_passwords():
    """EP: Weak password partition"""
    return [
        "12345678",      # No letters
        "password",      # No numbers/special
        "Password",      # No numbers/special
        "Pass1234",      # No special chars
    ]


# ============================================================================
# API Test Fixtures
# ============================================================================

@pytest.fixture
def api_base_url():
    """Base URL for API testing"""
    return "http://localhost:5000/api"


@pytest.fixture
def valid_jwt_token():
    """Mock valid JWT token for authenticated tests"""
    # In real tests, this would be generated or mocked
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token"


@pytest.fixture
def expired_jwt_token():
    """Mock expired JWT token"""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_token"


@pytest.fixture
def auth_headers(valid_jwt_token):
    """Authorization headers for authenticated requests"""
    return {"Authorization": f"Bearer {valid_jwt_token}"}


# ============================================================================
# State Transition Fixtures
# ============================================================================

@pytest.fixture
def user_session_states():
    """User session state transition data"""
    return {
        "states": ["logged_out", "logging_in", "logged_in", "session_expired"],
        "transitions": [
            {"from": "logged_out", "action": "login", "to": "logged_in"},
            {"from": "logged_in", "action": "logout", "to": "logged_out"},
            {"from": "logged_in", "action": "timeout", "to": "session_expired"},
            {"from": "session_expired", "action": "refresh", "to": "logged_in"},
        ]
    }


@pytest.fixture
def scan_status_states():
    """Scan status state transition data"""
    return {
        "states": ["pending", "processing", "completed", "failed"],
        "transitions": [
            {"from": "pending", "action": "start", "to": "processing"},
            {"from": "processing", "action": "success", "to": "completed"},
            {"from": "processing", "action": "error", "to": "failed"},
        ]
    }


# ============================================================================
# Decision Table Fixtures
# ============================================================================

@pytest.fixture
def risk_level_decision_table():
    """Decision table for risk level determination"""
    return [
        {"confidence": 0, "expected_risk": "Low"},
        {"confidence": 15, "expected_risk": "Low"},
        {"confidence": 30, "expected_risk": "Low"},
        {"confidence": 31, "expected_risk": "Medium"},
        {"confidence": 45, "expected_risk": "Medium"},
        {"confidence": 60, "expected_risk": "Medium"},
        {"confidence": 61, "expected_risk": "High"},
        {"confidence": 85, "expected_risk": "High"},
        {"confidence": 100, "expected_risk": "High"},
    ]


@pytest.fixture
def auth_decision_table():
    """Decision table for authentication outcomes"""
    return [
        {"email_valid": True, "password_valid": True, "expected": "success"},
        {"email_valid": True, "password_valid": False, "expected": "invalid_credentials"},
        {"email_valid": False, "password_valid": True, "expected": "user_not_found"},
        {"email_valid": False, "password_valid": False, "expected": "user_not_found"},
    ]


# ============================================================================
# Database Test Fixtures
# ============================================================================

@pytest.fixture
def mock_mongodb():
    """Mock MongoDB connection for testing"""
    from unittest.mock import MagicMock
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.scans = MagicMock()
    return mock_db


@pytest.fixture
def sample_user_document():
    """Sample user document for database tests"""
    from datetime import datetime
    return {
        "_id": "test_user_id",
        "email": "test@example.com",
        "password_hash": "$2b$12$hashedpassword",
        "name": "Test User",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


@pytest.fixture
def sample_scan_document():
    """Sample scan document for database tests"""
    from datetime import datetime
    return {
        "_id": "test_scan_id",
        "user_id": "test_user_id",
        "email_text": "Test email content",
        "prediction": "legitimate",
        "confidence": 25.5,
        "risk_level": "Low",
        "created_at": datetime.utcnow()
    }
