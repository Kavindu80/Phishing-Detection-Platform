import re
import logging
import dns.resolver
import socket
from urllib.parse import urlparse
import tldextract

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Legitimate service providers with their official domains
TRUSTED_PROVIDERS = {
    'google': ['google.com', 'gmail.com', 'googlemail.com', 'accounts.google.com', 'youtube.com', 'google.co.uk', 'docs.google.com', 'drive.google.com', 'mail.google.com'],
    'microsoft': ['microsoft.com', 'office.com', 'live.com', 'outlook.com', 'hotmail.com', 'msn.com', 'office365.com', 'sharepoint.com', 'teams.microsoft.com'],
    'apple': ['apple.com', 'icloud.com', 'me.com', 'itunes.com', 'appleid.apple.com'],
    'amazon': ['amazon.com', 'amazon.co.uk', 'amazonaws.com', 'a.co', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'amazon.in'],
    'facebook': ['facebook.com', 'fb.com', 'instagram.com', 'whatsapp.com', 'messenger.com', 'fbcdn.net', 'cdninstagram.com'],
    'twitter': ['twitter.com', 'x.com', 't.co'],
    'linkedin': ['linkedin.com', 'lnkd.in'],
    'paypal': ['paypal.com', 'paypal.co.uk', 'paypal.ca', 'paypal.de'],
    'netflix': ['netflix.com', 'nflx.com', 'nflxext.com', 'nflximg.com', 'nflxvideo.net'],
    'adobe': ['adobe.com', 'acrobat.com', 'typekit.com', 'behance.net'],
    'dropbox': ['dropbox.com', 'dropboxusercontent.com'],
    'github': ['github.com', 'githubusercontent.com', 'githubassets.com'],
    'bank': ['chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com', 'usbank.com']
}

# Add common corporate domains that might be sending legitimate emails
COMMON_CORPORATE_DOMAINS = [
    'salesforce.com', 'zendesk.com', 'mailchimp.com', 'sendgrid.net', 'hubspot.com', 
    'stripe.com', 'shopify.com', 'slack.com', 'atlassian.com', 'zoom.us'
]

# Add these common corporate domains to the trusted providers list
TRUSTED_PROVIDERS['business_services'] = COMMON_CORPORATE_DOMAINS

# Common no-reply and service email patterns for legitimate services
LEGITIMATE_SERVICE_PATTERNS = [
    r'no-?reply@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'security@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'support@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'notification@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'info@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'service@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'account@[\w.-]+\.(google|gmail|microsoft|apple|amazon|facebook|twitter|linkedin|paypal|netflix)\.com',
    r'@(accounts\.google\.com)'
]

def is_trusted_provider(email_sender):
    """
    Check if an email sender belongs to a trusted provider
    
    Args:
        email_sender (str): The email sender address or domain
        
    Returns:
        tuple: (is_trusted, provider_name)
    """
    try:
        # Special case for Google-related emails which are very common
        if 'google' in email_sender.lower() or 'gmail' in email_sender.lower():
            logger.info(f"Google-related sender detected: {email_sender}")
            return True, 'google'
            
        # Extract domain from email
        domain = extract_domain_from_email(email_sender)
        if not domain:
            # Try to check if sender name contains a provider name
            for provider, _ in TRUSTED_PROVIDERS.items():
                if provider.lower() in email_sender.lower():
                    # Do additional verification for sender name
                    if provider.lower() == 'google' and 'google' in email_sender.lower():
                        return True, 'google'
            return False, None
            
        # Check if domain is in our trusted providers list
        for provider, domains in TRUSTED_PROVIDERS.items():
            for trusted_domain in domains:
                if domain == trusted_domain or domain.endswith('.' + trusted_domain):
                    return True, provider
                    
        return False, None
    except Exception as e:
        logger.error(f"Error checking trusted provider: {str(e)}")
        return False, None

def extract_domain_from_email(email):
    """Extract domain from email address"""
    try:
        match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', email)
        if match:
            return match.group(1).lower()
        return None
    except Exception as e:
        logger.error(f"Error extracting domain from email: {str(e)}")
        return None

def matches_legitimate_pattern(email_sender):
    """
    Check if an email sender matches known legitimate service email patterns
    
    Args:
        email_sender (str): The email sender address
        
    Returns:
        bool: True if matches legitimate pattern
    """
    try:
        for pattern in LEGITIMATE_SERVICE_PATTERNS:
            if re.search(pattern, email_sender, re.IGNORECASE):
                return True
        
        # Additional check specifically for Google's no-reply format
        if 'no-reply@accounts.google.com' in email_sender:
            return True
        
        # Check if it's from Google with a legitimate format
        if 'google' in email_sender.lower() and '@google.com' in email_sender.lower():
            return True
            
        return False
    except Exception as e:
        logger.error(f"Error checking legitimate patterns: {str(e)}")
        return False

def verify_email_authentication(email_data):
    """
    Verify if the email passes authentication checks (SPF, DKIM)
    This is a simplified version - in production you'd use libraries 
    that can check email headers for these authentication results
    
    Args:
        email_data (dict): The parsed email data
        
    Returns:
        dict: Authentication results
    """
    results = {
        'spf_passed': False,
        'dkim_passed': False,
        'dmarc_passed': False,
        'has_authentication': False
    }
    
    # In a real implementation, you would check the email headers
    # for Authentication-Results header which contains SPF, DKIM and DMARC results
    headers = email_data.get('headers', {})
    
    # Look for authentication headers
    auth_results = headers.get('Authentication-Results', '')
    
    if auth_results:
        results['has_authentication'] = True
        
        # Check SPF
        if 'spf=pass' in auth_results.lower():
            results['spf_passed'] = True
            
        # Check DKIM
        if 'dkim=pass' in auth_results.lower():
            results['dkim_passed'] = True
            
        # Check DMARC
        if 'dmarc=pass' in auth_results.lower():
            results['dmarc_passed'] = True
    
    return results

def check_sender_domain_reputation(sender_domain):
    """
    Check the reputation of the sender's domain
    In a real implementation, this would query reputation databases
    
    Args:
        sender_domain (str): The sender's domain
        
    Returns:
        dict: Domain reputation information
    """
    reputation_info = {
        'is_trusted': False,
        'is_newly_registered': False,
        'provider_name': None
    }
    
    # Check if it's a trusted provider
    is_trusted, provider = is_trusted_provider(sender_domain)
    reputation_info['is_trusted'] = is_trusted
    reputation_info['provider_name'] = provider
    
    # In a real implementation, you would also check:
    # - Domain age (newly registered domains are suspicious)
    # - Domain reputation from services like Google Safe Browsing
    # - Presence in spam blacklists
    
    return reputation_info

def check_url_legitimacy(url):
    """
    Check if a URL belongs to a legitimate service
    
    Args:
        url (str): The URL to check
        
    Returns:
        dict: URL legitimacy information
    """
    result = {
        'is_legitimate': False,
        'matches_sender': False,
        'provider': None,
        'is_suspicious': False,
        'reason': None
    }
    
    try:
        extracted = tldextract.extract(url)
        domain = f"{extracted.domain}.{extracted.suffix}"
        
        # Check if domain belongs to a trusted provider
        for provider, domains in TRUSTED_PROVIDERS.items():
            if domain in domains or any(domain.endswith('.' + d) for d in domains):
                result['is_legitimate'] = True
                result['provider'] = provider
                break
        
        # Check for suspicious URL patterns
        parsed_url = urlparse(url)
        
        # Check for IP address in URL
        ip_pattern = r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'
        if re.match(ip_pattern, url):
            result['is_suspicious'] = True
            result['reason'] = "URL contains IP address instead of domain name"
        
        # Check for unusual port numbers
        if parsed_url.port and parsed_url.port not in [80, 443]:
            result['is_suspicious'] = True
            result['reason'] = f"URL uses unusual port number ({parsed_url.port})"
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking URL legitimacy: {str(e)}")
        result['is_suspicious'] = True
        result['reason'] = "Error analyzing URL"
        return result

def analyze_urls_in_email(email_data):
    """
    Analyze all URLs in an email to determine if they belong to legitimate services
    
    Args:
        email_data (dict): Parsed email data
    
    Returns:
        dict: Analysis results
    """
    urls = email_data.get('urls', [])
    if not urls:
        return {'legitimate_urls': 0, 'suspicious_urls': 0, 'urls_analyzed': 0}
    
    legitimate_urls = 0
    suspicious_urls = 0
    
    for url in urls:
        url_check = check_url_legitimacy(url)
        if url_check['is_legitimate'] and not url_check['is_suspicious']:
            legitimate_urls += 1
        else:
            suspicious_urls += 1
    
    # Calculate the percentage of legitimate URLs
    total_urls = len(urls)
    legitimate_percentage = (legitimate_urls / total_urls) * 100 if total_urls > 0 else 0
    
    return {
        'legitimate_urls': legitimate_urls,
        'suspicious_urls': suspicious_urls,
        'urls_analyzed': total_urls,
        'legitimate_percentage': legitimate_percentage
    }

def detect_google_email_patterns(email_data):
    """
    Special detection for legitimate Google email patterns
    
    Args:
        email_data (dict): Parsed email data
    
    Returns:
        bool: True if it matches Google's legitimate email patterns
    """
    sender = email_data.get('from', '').lower()
    subject = email_data.get('subject', '').lower()
    body = email_data.get('body', '').lower()
    
    # Always trust emails from Google domains
    sender_details = email_data.get('sender_details', {})
    sender_domain = sender_details.get('domain', '')
    
    if sender_domain and ('google.com' in sender_domain or 'gmail.com' in sender_domain):
        logger.info(f"Google domain detected in sender: {sender_domain}")
        return True
    
    # Check sender name
    if 'google' in sender:
        logger.info("Google found in sender name")
        # If it has Google in the name and the email looks like an official notification, trust it
        return True
    
    # Check URLs - legitimate Google emails typically contain google.com domains
    urls = email_data.get('urls', [])
    google_urls = 0
    
    for url in urls:
        if 'google.com' in url or 'accounts.google.com' in url or 'myaccount.google.com' in url:
            google_urls += 1
    
    # If it has Google-related keywords in the subject/body and Google URLs, likely legitimate
    google_keywords = [
        'google account', 'google drive', 'google docs', 'google calendar', 
        'gmail', 'google security', 'account activity', 'security alert',
        'google meet', 'google classroom'
    ]
    
    has_google_keyword = any(keyword in subject.lower() or keyword in body.lower() 
                            for keyword in google_keywords)
    
    if has_google_keyword and google_urls > 0:
        logger.info("Google keywords and URLs detected")
        return True
        
    return False

def verify_email_legitimacy(email_data):
    """
    Comprehensive verification of email legitimacy
    
    Args:
        email_data (dict): The parsed email data
        
    Returns:
        dict: Legitimacy verification results
    """
    results = {
        'is_legitimate': False,
        'confidence': 0.0,
        'trusted_provider': None,
        'authentication_passed': False,
        'reasons': []
    }
    
    try:
        sender = email_data.get('from', '')
        sender_details = email_data.get('sender_details', {})
        sender_domain = sender_details.get('domain')
        
        # Special case for all Gmail-related emails
        if sender_domain and ('gmail.com' in sender_domain or 'google.com' in sender_domain):
            results['is_legitimate'] = True
            results['confidence'] = 0.95
            results['trusted_provider'] = 'google'
            results['reasons'].append(f"Email from trusted Google domain: {sender_domain}")
            logger.info(f"Verified Gmail/Google domain: {sender_domain}")
            return results
            
        # Special case for Google emails which are commonly flagged incorrectly
        is_google_email = detect_google_email_patterns(email_data)
        if is_google_email:
            results['is_legitimate'] = True
            results['confidence'] = 0.95
            results['trusted_provider'] = 'google'
            results['reasons'].append("Verified legitimate Google email pattern")
            logger.info("Verified Google email pattern")
            return results
            
        # Check if sender is from a trusted provider
        is_trusted, provider = is_trusted_provider(sender)
        results['trusted_provider'] = provider
        
        # If it's a trusted provider, significantly increase legitimacy confidence
        if is_trusted:
            results['is_legitimate'] = True
            results['confidence'] = 0.9  # High confidence
            results['reasons'].append(f"Sender is from trusted provider: {provider}")
            logger.info(f"Trusted provider detected: {provider}")
            
        # Check if any URLs in the email are from trusted domains
        url_analysis = analyze_urls_in_email(email_data)
        if url_analysis['legitimate_urls'] > 0 and url_analysis['suspicious_urls'] == 0:
            # If all URLs are legitimate and we already determined it's from a trusted provider,
            # this is almost certainly a legitimate email
            if is_trusted:
                results['confidence'] = 0.98
                results['reasons'].append("All URLs belong to trusted domains")
        
        # If we have a trusted provider with high confidence, return early
        if results['is_legitimate'] and results['confidence'] > 0.9:
            return results
            
        # Continue with additional checks if not yet determined to be legitimate...
        # Check authentication
        auth_results = verify_email_authentication(email_data)
        if auth_results.get('has_authentication'):
            auth_score = 0
            if auth_results.get('spf_passed'):
                auth_score += 1
                results['reasons'].append("SPF authentication passed")
            if auth_results.get('dkim_passed'):
                auth_score += 1
                results['reasons'].append("DKIM authentication passed")
            if auth_results.get('dmarc_passed'):
                auth_score += 1
                results['reasons'].append("DMARC authentication passed")
                
            if auth_score >= 2:
                results['authentication_passed'] = True
                results['confidence'] = max(results['confidence'], 0.8)
                results['is_legitimate'] = True
                    
        return results
        
    except Exception as e:
        logger.error(f"Error verifying email legitimacy: {str(e)}")
        results['reasons'].append(f"Error during verification: {str(e)}")
        return results 