"""
Whitelist utility to prevent false positives for legitimate emails from major companies
"""
import re
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Major email providers that should not trigger phishing detection
EMAIL_PROVIDERS = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'mail.com',
    'zoho.com',
    'yandex.com'
]

# Major legitimate sender domains that should be trusted
TRUSTED_SENDER_DOMAINS = {
    # Email and cloud providers
    'google.com': ['no-reply', 'account', 'noreply', 'mail', 'drive', 'calendar', 'meet', 'youtube', 'support', 'team'],
    'microsoft.com': ['noreply', 'account', 'office365', 'security', 'outlook'],
    'apple.com': ['noreply', 'id', 'itunes', 'appleid', 'support'],
    'amazonses.com': ['no-reply', 'notification', 'shipment', 'order', 'account'],
    'amazon.com': ['no-reply', 'notification', 'shipment', 'order', 'account'],
    
    # Social media
    'facebook.com': ['notification', 'security', 'noreply', 'facebookmail'],
    'twitter.com': ['notify', 'info', 'security'],
    'linkedin.com': ['notifications', 'connections', 'jobs'],
    'instagram.com': ['noreply', 'security'],
    
    # Financial services
    'paypal.com': ['service', 'account', 'noreply'],
    'stripe.com': ['support', 'notify', 'noreply'],
    
    # E-commerce
    'ebay.com': ['ebay'],
    'shopify.com': ['notification', 'noreply'],
    'aliexpress.com': ['promotion', 'service', 'order', 'notification', 'noreply', 'support', 'info'],
    'walmart.com': ['notification', 'info', 'service', 'order'],
    'target.com': ['noreply', 'service', 'order'],
    'bestbuy.com': ['notification', 'noreply', 'info'],
    'etsy.com': ['notification', 'transaction', 'noreply'],
    
    # Business services
    'salesforce.com': ['noreply'],
    'slack.com': ['notifications', 'noreply'],
    'zoom.us': ['no-reply'],
    'zendesk.com': ['support', 'noreply'],
    'dropbox.com': ['no-reply', 'info'],
    'github.com': ['noreply', 'notifications'],
    'asana.com': ['noreply', 'team'],
    
    # Travel and Hospitality
    'airbnb.com': ['noreply', 'reservation'],
    'booking.com': ['customer', 'noreply', 'info'],
    'expedia.com': ['noreply', 'confirmation'],
    'uber.com': ['uber', 'receipts'],
    'lyft.com': ['no-reply', 'info'],
}

# Enhanced verification patterns for legitimate emails
LEGITIMATE_EMAIL_PATTERNS = [
    # Notifications about security and accounts
    r'security alert',
    r'your account',
    r'password (changed|reset|update)',
    r'sign-?in (alert|notification)',
    r'verify your',
    r'confirm your',
    r'authorization code',
    r'verification code',
    
    # Receipts and orders
    r'order confirmation',
    r'receipt',
    r'invoice',
    r'payment (confirmation|received)',
    r'shipping (confirmation|update)',
    r'tracking number',
    r'order #\d+',
    r'your (order|package) (is|has been) (shipped|delivered)',
    
    # Common subscription messages
    r'subscription',
    r'newsletter',
    r'welcome to',
    
    # Common email marketing phrases
    r'unsubscribe',
    r'privacy policy',
    r'terms (of|and) (service|use)',
    r'view (in|this email in) (browser|web)',
    
    # Authentication
    r'two-?factor',
    r'2fa',
    r'one-?time (code|password)',
    r'authentication code',
    r'security code',
    r'verification code',
    
    # Meetings and calendar events
    r'meeting (invitation|reminder)',
    r'calendar (event|notification|invite)',
    r'invitation to collaborate',
    
    # Customer service
    r'thank you for your (order|purchase)',
    r'customer (service|support)',
    r'feedback',
    r'survey',
    r'how was your experience',
]

# Dictionary of trusted senders and domains
TRUSTED_DOMAINS = {
    'google.com': {
        'description': 'Google',
        'confidence': 0.95
    },
    'gmail.com': {
        'description': 'Gmail',
        'confidence': 0.92
    },
    'microsoft.com': {
        'description': 'Microsoft',
        'confidence': 0.95
    },
    'outlook.com': {
        'description': 'Microsoft Outlook',
        'confidence': 0.92
    },
    'apple.com': {
        'description': 'Apple',
        'confidence': 0.95
    },
    'amazon.com': {
        'description': 'Amazon',
        'confidence': 0.90
    },
    'paypal.com': {
        'description': 'PayPal',
        'confidence': 0.90
    },
    'facebook.com': {
        'description': 'Facebook',
        'confidence': 0.90
    },
    'instagram.com': {
        'description': 'Instagram',
        'confidence': 0.90
    },
    'twitter.com': {
        'description': 'Twitter',
        'confidence': 0.90
    },
    'linkedin.com': {
        'description': 'LinkedIn',
        'confidence': 0.90
    }
}

# Specific trusted email addresses
TRUSTED_EMAILS = {
    'noreply@github.com': {
        'description': 'GitHub notifications',
        'confidence': 0.95
    },
    'security-noreply@linkedin.com': {
        'description': 'LinkedIn security',
        'confidence': 0.95
    },
    'no-reply@accounts.google.com': {
        'description': 'Google account security',
        'confidence': 0.95
    }
}

def is_whitelisted_domain(sender_email):
    """
    Check if email comes from a whitelisted domain
    
    Args:
        sender_email (str): Email address of the sender
        
    Returns:
        tuple: (is_whitelisted, provider)
    """
    try:
        # Extract domain from email
        match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$', sender_email.lower())
        if not match:
            return False, None
            
        domain = match.group(1)
        
        # Check if it's a major email provider
        if domain in EMAIL_PROVIDERS:
            return True, domain
        
        # Check trusted sender domains
        for trusted_domain, prefixes in TRUSTED_SENDER_DOMAINS.items():
            if domain.endswith(trusted_domain):
                # Extract prefix (e.g. noreply@example.com -> noreply)
                prefix_match = re.search(r'^([a-zA-Z0-9.-]+)@', sender_email.lower())
                if prefix_match:
                    prefix = prefix_match.group(1)
                    
                    # If this is a common trusted prefix for this domain
                    if any(trusted_prefix in prefix for trusted_prefix in prefixes):
                        logger.info(f"Trusted sender pattern matched: {prefix}@{trusted_domain}")
                        return True, trusted_domain
                
                # If domain matches but prefix doesn't, still boost trust but not as much
                return True, trusted_domain
                
        return False, None
    
    except Exception as e:
        logger.error(f"Error in whitelist check: {str(e)}")
        return False, None

def matches_legitimate_pattern(subject, body):
    """
    Check if email content matches patterns of legitimate emails
    
    Args:
        subject (str): Email subject
        body (str): Email body
        
    Returns:
        tuple: (matches, matched_patterns)
    """
    try:
        text_to_check = (subject + " " + body).lower()
        matched_patterns = []
        
        for pattern in LEGITIMATE_EMAIL_PATTERNS:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                matched_patterns.append(pattern)
                
        return len(matched_patterns) > 0, matched_patterns
        
    except Exception as e:
        logger.error(f"Error checking legitimate patterns: {str(e)}")
        return False, []

def check_email_headers(email_data):
    """
    Check email headers for authentication indicators
    
    Args:
        email_data (dict): Parsed email data
    
    Returns:
        dict: Header check results
    """
    results = {
        'has_authentication': False,
        'auth_methods': [],
        'confidence': 0.0
    }
    
    try:
        # Check for common email authentication headers
        headers = email_data.get('headers', {})
        
        # Check for SPF results
        spf_header = headers.get('Authentication-Results-spf', '') or headers.get('Received-SPF', '')
        if 'pass' in spf_header.lower():
            results['has_authentication'] = True
            results['auth_methods'].append('SPF')
            results['confidence'] += 0.2
        
        # Check for DKIM results
        dkim_header = headers.get('Authentication-Results-dkim', '') or headers.get('DKIM-Signature', '')
        if dkim_header and ('pass' in dkim_header.lower() or 'signature' in dkim_header.lower()):
            results['has_authentication'] = True
            results['auth_methods'].append('DKIM') 
            results['confidence'] += 0.25
        
        # Check for DMARC results
        dmarc_header = headers.get('Authentication-Results-dmarc', '')
        if 'pass' in dmarc_header.lower():
            results['has_authentication'] = True
            results['auth_methods'].append('DMARC')
            results['confidence'] += 0.3
        
        return results
    except Exception as e:
        logger.error(f"Error checking email headers: {str(e)}")
        return results

def verify_sender_domain(sender, url_domains):
    """
    Verify if URL domains match the sender domain for additional legitimacy checks
    
    Args:
        sender (str): Email sender address
        url_domains (list): List of domains from URLs in the email
        
    Returns:
        dict: Domain verification results
    """
    results = {
        'domains_match': False,
        'confidence': 0.0,
        'primary_domain': None,
        'matching_domains': []
    }
    
    try:
        # Extract sender domain
        sender_match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$', sender.lower())
        if not sender_match:
            return results
            
        sender_domain = sender_match.group(1)
        results['primary_domain'] = sender_domain
        
        # Extract base domain (e.g., example.com from mail.example.com)
        sender_base_parts = sender_domain.split('.')
        if len(sender_base_parts) > 2:
            # For subdomains, take the main domain + TLD
            sender_base_domain = '.'.join(sender_base_parts[-2:])
        else:
            sender_base_domain = sender_domain
            
        # Compare with URL domains
        for url_domain in url_domains:
            url_base_parts = url_domain.split('.')
            if len(url_base_parts) > 2:
                url_base_domain = '.'.join(url_base_parts[-2:])
            else:
                url_base_domain = url_domain
                
            # Check for direct match or subdomain match
            if (url_domain == sender_domain or 
                url_base_domain == sender_base_domain or
                url_domain.endswith('.' + sender_base_domain)):
                
                results['domains_match'] = True
                results['matching_domains'].append(url_domain)
                results['confidence'] = 0.9
                break
                
        return results
    except Exception as e:
        logger.error(f"Error verifying sender domain: {str(e)}")
        return results

def check_whitelist(email_data):
    """
    Check if an email is from a trusted sender
    
    Args:
        email_data (dict): Email data from parser
        
    Returns:
        dict: Whitelist check results
    """
    sender = email_data.get('from', '').lower()
    sender_domain = None
    
    # Extract domain from sender if present
    domain_match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', sender)
    if domain_match:
        sender_domain = domain_match.group(1).lower()
    
    # Check specific trusted emails first
    for trusted_email, info in TRUSTED_EMAILS.items():
        if trusted_email.lower() in sender:
            return {
                'is_whitelisted': True,
                'provider': info['description'],
                'confidence': info['confidence'],
                'reasons': [f"Matched trusted email: {trusted_email}"]
            }
    
    # Check trusted domains
    if sender_domain:
        for trusted_domain, info in TRUSTED_DOMAINS.items():
            if sender_domain.endswith(trusted_domain):
                # Check additional verification factors if available
                reasons = [f"Sender domain ({sender_domain}) matches trusted domain: {trusted_domain}"]
                confidence = info['confidence']
                
                # Check DKIM, SPF, DMARC if available
                auth = email_data.get('authentication', {})
                if auth:
                    if auth.get('dkim') == 'pass':
                        reasons.append("DKIM authentication passed")
                        confidence = min(confidence + 0.03, 0.99)
                    if auth.get('spf') == 'pass':
                        reasons.append("SPF check passed")
                        confidence = min(confidence + 0.03, 0.99)
                    if auth.get('dmarc') == 'pass':
                        reasons.append("DMARC verification passed")
                        confidence = min(confidence + 0.03, 0.99)
                
                return {
                    'is_whitelisted': True,
                    'provider': info['description'],
                    'confidence': confidence,
                    'reasons': reasons
                }
    
    # Not whitelisted
    return {
        'is_whitelisted': False,
        'provider': None,
        'confidence': 0.0,
        'reasons': []
    }

def is_email_whitelisted(email_data):
    """
    Check if an email is whitelisted
    
    Args:
        email_data (dict): Email data from parser
        
    Returns:
        tuple: (is_whitelisted, whitelist_match)
    """
    try:
        whitelist_check = check_whitelist(email_data)
        is_whitelisted = whitelist_check['is_whitelisted']
        whitelist_match = whitelist_check.get('provider', '')
        
        # Only consider as whitelisted if confidence is high enough
        if is_whitelisted and whitelist_check['confidence'] < 0.9:
            is_whitelisted = False
            
        return is_whitelisted, whitelist_match
    except Exception as e:
        logger.error(f"Error checking whitelist: {str(e)}")
        return False, "" 