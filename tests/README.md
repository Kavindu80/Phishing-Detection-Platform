# PhishGuard Test Suite
# Industrial-grade testing framework using pytest

This folder contains automated test cases for the PhishGuard system.

## Structure
```
tests/
├── conftest.py              # Shared fixtures
├── pytest.ini               # pytest configuration
├── functional/              # Functional test cases
│   ├── test_email_scan.py
│   ├── test_authentication.py
│   ├── test_history.py
│   └── test_analytics.py
├── api/                     # API test cases
│   ├── test_scan_api.py
│   ├── test_auth_api.py
│   └── test_analytics_api.py
├── database/                # Database test cases
│   └── test_database.py
└── non_functional/          # Non-functional tests
    ├── test_performance.py
    └── test_security.py
```

## Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific module
pytest tests/functional/test_email_scan.py

# Run with verbose output
pytest -v
```
