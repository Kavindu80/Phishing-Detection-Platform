#!/usr/bin/env python
"""
Database initialization script.
Creates an admin user and sets up initial collections.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient, IndexModel, ASCENDING, TEXT
from dotenv import load_dotenv
from flask import Flask
import bcrypt
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB connection string
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'phishing_detector')

def create_test_user():
    """Create a test user if one doesn't already exist"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # Check if test user already exists
        test_user = db.users.find_one({'email': 'test@example.com'})
        
        if not test_user:
            # Create hashed password
            hashed_pw = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt())
            
            # Create user document
            user_doc = {
                'username': 'testuser',
                'email': 'test@example.com',
                'password': hashed_pw,
                'created_at': datetime.utcnow(),
                'last_login': datetime.utcnow(),
                'role': 'user',
                'settings': {
                    'email_notifications': True,
                    'auto_scan': True
                }
            }
            
            # Insert user
            result = db.users.insert_one(user_doc)
            user_id = result.inserted_id
            
            logger.info(f"Created test user with ID: {user_id}")
            
            # Create analytics entry for test user
            analytics_doc = {
                'user_id': user_id,
                'total_scans': 0,
                'safe_count': 0,
                'suspicious_count': 0,
                'phishing_count': 0,
                'total_gmail_scans': 0,
                'gmail_safe_count': 0,
                'gmail_suspicious_count': 0,
                'gmail_phishing_count': 0,
                'languages': {'en': 10, 'es': 3, 'fr': 2},
                'phishing_domains': {'phishing-test.com': 5, 'malicious-domain.net': 3},
                'first_scan_date': datetime.utcnow() - timedelta(days=30),
                'last_scan_date': datetime.utcnow() - timedelta(days=1)
            }
            
            db.user_analytics.insert_one(analytics_doc)
            
            # Create sample scan data
            create_sample_scan_data(db, user_id)
            
        else:
            logger.info("Test user already exists")
            
    except Exception as e:
        logger.error(f"Error creating test user: {str(e)}")

def create_sample_scan_data(db, user_id):
    """Create sample scan data for the test user"""
    try:
        # Check if user already has scan data
        existing_scans = db.scans.count_documents({'user_id': user_id})
        if existing_scans > 0:
            logger.info(f"User {user_id} already has {existing_scans} scans - skipping sample data generation")
            return

        # Generate 50 sample scans over the last 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # Calculate interval between scans
        interval = timedelta(days=30) / 50
        
        # Verdicts with weighted probabilities
        verdicts = ['safe', 'suspicious', 'phishing']
        weights = [0.65, 0.20, 0.15]  # 65% safe, 20% suspicious, 15% phishing
        
        # Languages with weighted probabilities
        languages = ['en', 'es', 'fr', 'de', 'zh']
        lang_weights = [0.7, 0.1, 0.1, 0.05, 0.05]
        
        # Generate scans
        scans = []
        analytics_updates = {
            'safe_count': 0,
            'suspicious_count': 0,
            'phishing_count': 0,
            'languages': {}
        }
        
        from random import choices, uniform, randint
        import hashlib
        
        for i in range(50):
            # Calculate scan date
            scan_date = start_date + (interval * i)
            
            # Select verdict based on weights
            verdict = choices(verdicts, weights=weights)[0]
            analytics_updates[f'{verdict}_count'] += 1
            
            # Select language based on weights
            lang = choices(languages, weights=lang_weights)[0]
            
            if lang in analytics_updates['languages']:
                analytics_updates['languages'][lang] += 1
            else:
                analytics_updates['languages'][lang] = 1
            
            # Generate a fake sender email
            domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'company.net']
            sender_domain = choices(domains)[0]
            sender_name = hashlib.md5(f"sender{i}".encode()).hexdigest()[:8]
            sender_email = f"{sender_name}@{sender_domain}"
            
            # Create suspicious elements if not safe
            suspicious_elements = []
            if verdict != 'safe':
                # Add some suspicious URLs or domains
                suspicious_count = randint(1, 5)
                for j in range(suspicious_count):
                    suspicious_domain = f"suspicious-{hashlib.md5(f'domain{i}{j}'.encode()).hexdigest()[:8]}.com"
                    element_type = choices(['url', 'domain', 'keyword'], weights=[0.5, 0.3, 0.2])[0]
                    severity = choices(['low', 'medium', 'high'], weights=[0.4, 0.4, 0.2])[0]
                    
                    element = {
                        'type': element_type,
                        'value': suspicious_domain if element_type != 'keyword' else choices(['urgent', 'verify', 'account', 'password'])[0],
                        'reason': f"Suspicious {element_type} detected",
                        'severity': severity
                    }
                    suspicious_elements.append(element)
            
            # Create scan document
            scan = {
                'user_id': user_id,
                'date': scan_date,
                'subject': f"Sample Email {i+1}",
                'sender': sender_email,
                'sender_domain': sender_domain,
                'verdict': verdict,
                'confidence': uniform(0.65, 0.98),
                'language': lang,
                'email_text': f"This is sample email text for scan {i+1}.",
                'suspicious_elements': suspicious_elements,
                'explanation': f"This email was classified as {verdict} based on analysis.",
                'recommended_action': "This is a sample recommendation.",
                'source': choices(['direct_scan', 'gmail'], weights=[0.7, 0.3])[0]
            }
            
            # Add feedback to some scans
            if i % 5 == 0:
                # User agrees with verdict 85% of the time
                scan['feedback'] = choices([True, False], weights=[0.85, 0.15])[0]
            
            scans.append(scan)
        
        # Insert scans
        if scans:
            db.scans.insert_many(scans)
            logger.info(f"Created {len(scans)} sample scans for user {user_id}")
        
        # Update user analytics
        db.user_analytics.update_one(
            {'user_id': user_id},
            {'$inc': {
                'total_scans': 50,
                'safe_count': analytics_updates['safe_count'],
                'suspicious_count': analytics_updates['suspicious_count'],
                'phishing_count': analytics_updates['phishing_count'],
                **{f"languages.{lang}": count for lang, count in analytics_updates['languages'].items()}
            },
            '$set': {
                'last_scan_date': datetime.utcnow(),
                'first_scan_date': start_date
            }},
            upsert=True
        )
        
        # Add some phishing domains
        phishing_domains = {
            'phishing-example.com': 3,
            'malicious-site.net': 2,
            'fake-bank.org': 2,
            'secure-verify.net': 1,
            'bank-alerts.com': 1
        }
        
        db.user_analytics.update_one(
            {'user_id': user_id},
            {'$set': {'phishing_domains': phishing_domains}},
            upsert=True
        )
        
    except Exception as e:
        logger.error(f"Error creating sample scan data: {str(e)}")

def init_db():
    """Initialize the database with required collections and indexes"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        logger.info(f"Connected to MongoDB at {MONGO_URI}")
        logger.info(f"Using database: {DB_NAME}")
        
        # Create collections if they don't exist
        collections = ['users', 'scans', 'user_analytics', 'email_scans', 'feedback', 'whitelist']
        
        for collection_name in collections:
            if collection_name not in db.list_collection_names():
                db.create_collection(collection_name)
                logger.info(f"Created collection: {collection_name}")
        
        # Create indexes
        # Users collection
        db.users.create_index([('email', ASCENDING)], unique=True)
        db.users.create_index([('username', ASCENDING)], unique=True)
        
        # Scans collection
        db.scans.create_index([('user_id', ASCENDING)])
        db.scans.create_index([('date', ASCENDING)])
        db.scans.create_index([('verdict', ASCENDING)])
        db.scans.create_index([('language', ASCENDING)])
        db.scans.create_index([('email_text', TEXT)], default_language='english')
        
        # User analytics collection
        db.user_analytics.create_index([('user_id', ASCENDING)], unique=True)
        
        # Email scans collection
        db.email_scans.create_index([('user_id', ASCENDING), ('email_id', ASCENDING)], unique=True)
        
        # Create test user
        create_test_user()
        
        logger.info("Database initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init_db() 