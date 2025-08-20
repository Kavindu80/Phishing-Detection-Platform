"""
Diagnostic tool to validate confidence calculations across the system
"""

import sys
import os
import logging
import json
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the parent directory to the path to allow imports
sys.path.append(str(Path(__file__).parent))

# Import the necessary components
from src.ml_model import PhishingDetector
from src.utils.email_parser import parse_email
from src.utils.url_analyzer import analyze_urls
from src.controllers.scan_controller import normalize_confidence

# Test cases with raw confidence values that might occur
TEST_CASES = [
    {"name": "Normal probability", "value": 0.438, "expected_percentage": 43.8},
    {"name": "Zero probability", "value": 0.0, "expected_percentage": 0.0},
    {"name": "Full probability", "value": 1.0, "expected_percentage": 100.0},
    {"name": "Already percentage", "value": 43.8, "expected_percentage": 43.8},
    {"name": "Out of range high (but under 100)", "value": 4.38, "expected_percentage": 4.38},
    {"name": "Out of range low", "value": -0.5, "expected_percentage": 0.0},
    {"name": "Invalid string", "value": "invalid", "expected_percentage": 50.0},
    {"name": "None value", "value": None, "expected_percentage": 50.0},
    {"name": "Invalid huge value", "value": 6487, "expected_percentage": 100.0},
    {"name": "Edge case: almost 1", "value": 0.9999, "expected_percentage": 99.99}
]

def test_normalize_confidence():
    """Test the normalize_confidence function with various inputs"""
    print("\n" + "="*60)
    print("TESTING CONFIDENCE NORMALIZATION")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for test in TEST_CASES:
        name = test["name"]
        value = test["value"]
        expected = test["expected_percentage"]
        
        # Test the normalization function
        try:
            result = normalize_confidence(value)
            success = abs(result - expected) < 0.01  # Allow small floating point differences
            
            status = "PASS" if success else "FAIL"
            passed += 1 if success else 0
            failed += 1 if not success else 0
            
            print(f"{status} - {name}: input={value}, output={result}, expected={expected}")
        except Exception as e:
            print(f"ERROR - {name}: input={value}, exception={str(e)}")
            failed += 1
    
    print("\nSummary:")
    print(f"Total tests: {len(TEST_CASES)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success rate: {round((passed / len(TEST_CASES)) * 100, 2)}%")

def test_end_to_end_confidence():
    """Test the end-to-end confidence calculation from ML model to display"""
    print("\n" + "="*60)
    print("TESTING END-TO-END CONFIDENCE CALCULATION")
    print("="*60)
    
    detector = PhishingDetector()
    
    if not detector.model_loaded:
        print("ERROR: Model failed to load, skipping end-to-end tests")
        return
    
    # Test with the simple email samples
    test_emails = [
        "Hello, this is a normal email without any suspicious content.",
        "URGENT: Your account has been COMPROMISED! Verify your identity IMMEDIATELY or your account will be SUSPENDED!",
        "Your PayPal account has been limited. Click here to verify: http://paypa1-secure.com/login"
    ]
    
    for i, email in enumerate(test_emails):
        print(f"\nTest Email #{i+1}")
        print("-" * 40)
        print(f"Content: {email[:50]}...")
        
        # Step 1: Get raw prediction from model
        prediction, raw_confidence, features = detector.predict(email)
        print(f"Step 1: ML Model Raw Confidence = {raw_confidence}")
        
        # Step 2: Run through controller's normalization
        normalized = normalize_confidence(raw_confidence)
        print(f"Step 2: Normalized for Display = {normalized}%")
        
        # Validate final result
        is_valid = 0 <= normalized <= 100
        print(f"Validation: {'VALID' if is_valid else 'INVALID'} (confidence must be between 0-100%)")

if __name__ == "__main__":
    print("Running confidence calculation diagnostics...")
    test_normalize_confidence()
    test_end_to_end_confidence()
    print("\nDiagnostics completed.") 