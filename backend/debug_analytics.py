#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.config.database import get_db
from bson import ObjectId
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_database():
    """Debug the database state and analytics data"""
    try:
        db = get_db()
        
        print("=== DATABASE ANALYSIS ===")
        
        # Check users
        users_count = db.users.count_documents({})
        print(f"Users: {users_count}")
        
        if users_count > 0:
            sample_user = db.users.find_one({})
            user_id = sample_user["_id"]
            print(f"Sample user ID: {user_id}")
            print(f"Sample user email: {sample_user.get('email', 'No email')}")
            
            # Check scans for this user
            user_scans = db.scans.count_documents({"user_id": user_id})
            print(f"Scans for user {user_id}: {user_scans}")
            
            if user_scans > 0:
                # Get recent scans
                recent_scans = list(db.scans.find(
                    {"user_id": user_id}, 
                    sort=[("date", -1)], 
                    limit=5
                ))
                
                print("Recent scans:")
                for scan in recent_scans:
                    print(f"  - {scan.get('date', 'No date')} | {scan.get('verdict', 'No verdict')} | {scan.get('subject', 'No subject')}")
                
                # Check verdict distribution
                pipeline = [
                    {"$match": {"user_id": user_id}},
                    {"$group": {"_id": "$verdict", "count": {"$sum": 1}}}
                ]
                verdict_dist = list(db.scans.aggregate(pipeline))
                print(f"Verdict distribution for user: {verdict_dist}")
                
                # Check language distribution
                lang_pipeline = [
                    {"$match": {"user_id": user_id}},
                    {"$group": {"_id": "$language", "count": {"$sum": 1}}}
                ]
                lang_dist = list(db.scans.aggregate(lang_pipeline))
                print(f"Language distribution: {lang_dist}")
                
                # Check date range
                date_pipeline = [
                    {"$match": {"user_id": user_id}},
                    {"$group": {
                        "_id": None,
                        "min_date": {"$min": "$date"},
                        "max_date": {"$max": "$date"}
                    }}
                ]
                date_range = list(db.scans.aggregate(date_pipeline))
                print(f"Date range: {date_range}")
            
            # Check user analytics
            user_analytics = db.user_analytics.find_one({"user_id": user_id})
            if user_analytics:
                print(f"User analytics found:")
                print(f"  - Total scans: {user_analytics.get('total_scans', 0)}")
                print(f"  - Safe count: {user_analytics.get('safe_count', 0)}")
                print(f"  - Suspicious count: {user_analytics.get('suspicious_count', 0)}")
                print(f"  - Phishing count: {user_analytics.get('phishing_count', 0)}")
                print(f"  - Languages: {user_analytics.get('languages', {})}")
            else:
                print("No user analytics found")
        
        # Total scans
        total_scans = db.scans.count_documents({})
        print(f"\nTotal scans in database: {total_scans}")
        
        # Total analytics
        total_analytics = db.user_analytics.count_documents({})
        print(f"Total user analytics records: {total_analytics}")
        
        print("\n=== SUCCESS ===")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

def test_analytics_controller():
    """Test the analytics controller with real user"""
    try:
        from src.controllers.analytics_controller import AnalyticsController
        from flask import Flask
        
        app = Flask(__name__)
        
        with app.app_context():
            # Get a real user
            db = get_db()
            user = db.users.find_one({})
            if not user:
                print("No users found - creating test data first")
                return
            
            # Create a mock current_user dict
            current_user = {
                'id': str(user['_id']),
                'username': user.get('username', 'test'),
                'email': user.get('email', 'test@example.com')
            }
            
            print(f"\n=== TESTING ANALYTICS FOR USER {current_user['id']} ===")
            
            # Mock request args
            import flask
            with app.test_request_context('/?timeRange=30d'):
                result = AnalyticsController.get_analytics(current_user)
                print(f"Analytics result status: {result[1] if isinstance(result, tuple) else 'Unknown'}")
                
                if isinstance(result, tuple) and len(result) >= 1:
                    data = result[0].get_json() if hasattr(result[0], 'get_json') else result[0]
                    print(f"Analytics data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                    
                    if isinstance(data, dict):
                        print(f"Total scans: {data.get('totalScans', 'Missing')}")
                        print(f"Verdict distribution: {data.get('verdictDistribution', 'Missing')}")
                        print(f"Is error fallback: {data.get('isErrorFallback', False)}")
        
    except Exception as e:
        print(f"ERROR testing analytics controller: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_database()
    test_analytics_controller() 