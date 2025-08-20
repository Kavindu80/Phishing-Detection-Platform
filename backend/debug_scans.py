#!/usr/bin/env python3
"""
Debug script to see what scan data is in the database
"""

import os
import sys
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import json

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from config.database import get_db_connection
except ImportError:
    def get_db_connection():
        client = MongoClient('mongodb://localhost:27017/')
        return client

def debug_scans():
    """Show recent scan data to debug time issues"""
    try:
        connection = get_db_connection()
        db = connection.phishing_detector
        
        print("=== DATABASE SCAN DEBUG ===")
        print(f"Current time: {datetime.utcnow()}")
        print(f"Local time: {datetime.now()}")
        
        # Get recent scans
        recent_scans = list(db.scans.find({}, {
            '_id': 1, 'date': 1, 'subject': 1, 'sender': 1, 'verdict': 1, 'confidence': 1
        }).sort('date', -1).limit(10))
        
        print(f"\nFound {len(recent_scans)} scans:")
        
        for i, scan in enumerate(recent_scans):
            scan_date = scan['date']
            time_diff = datetime.utcnow() - scan_date
            hours_ago = time_diff.total_seconds() / 3600
            
            print(f"\n{i+1}. Scan ID: {scan['_id']}")
            print(f"   Subject: {scan.get('subject', 'No subject')}")
            print(f"   Verdict: {scan.get('verdict', 'unknown')}")
            print(f"   Date: {scan_date}")
            print(f"   Hours ago: {hours_ago:.2f}")
            print(f"   Sender: {scan.get('sender', 'Unknown')}")
        
        # Simulate API response
        print("\n=== SIMULATED API RESPONSE ===")
        api_response = []
        for scan in recent_scans[:8]:  # Limit to 8 like frontend
            api_scan = {
                'id': str(scan['_id']),
                'date': scan['date'].isoformat(),
                'subject': scan.get('subject', 'No subject'),
                'sender': scan.get('sender', 'Unknown'),
                'verdict': scan.get('verdict', 'unknown'),
                'confidence': scan.get('confidence', 0)
            }
            api_response.append(api_scan)
        
        print(json.dumps(api_response, indent=2, default=str))
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_scans() 