import re
import tldextract
import requests
import logging
from urllib.parse import urlparse
import time
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for URL verification results
URL_VERIFICATION_CACHE = {}
CACHE_EXPIRY = 86400  # 24 hours

# Official domain patterns for major services
OFFICIAL_DOMAIN_PATTERNS = {
    'google': {
        'domains': ['google.com', 'gmail.com', 'youtube.com', 'googledrive.com', 'googleusercontent.com'],
        'subdomains': ['accounts', 'mail', 'drive', 'docs', 'calendar', 'photos', 'myaccount', 'support'],
        'paths': ['/accounts/', '/drive/', '/docs/', '/calendar/', '/photos/']
    },
    'microsoft': {
        'domains': ['microsoft.com', 'office.com', 'live.com', 'outlook.com', 'microsoftonline.com', 'office365.com'],
        'subdomains': ['login', 'account', 'portal', 'www', 'outlook', 'teams'],
        'paths': ['/login/', '/account/', '/portal/', '/teams/']
    },
    'apple': {
        'domains': ['apple.com', 'icloud.com', 'me.com', 'mac.com'],
        'subdomains': ['id', 'www', 'support', 'appleid', 'icloud'],
        'paths': ['/id/', '/support/', '/icloud/']
    },
    'paypal': {
        'domains': ['paypal.com', 'paypal.co.uk', 'paypal.ca', 'paypal.de', 'paypal.fr'],
        'subdomains': ['www', 'account', 'business'],
        'paths': ['/signin/', '/myaccount/', '/business/']
    },
    'amazon': {
        'domains': ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it'],
        'subdomains': ['www', 'smile', 'aws', 'signin', 'account'],
        'paths': ['/signin/', '/account/', '/gp/', '/dp/']
    },
    'facebook': {
        'domains': ['facebook.com', 'fb.com', 'messenger.com', 'instagram.com'],
        'subdomains': ['www', 'm', 'business', 'developers'],
        'paths': ['/login/', '/business/', '/developers/']
    },
    'linkedin': {
        'domains': ['linkedin.com'],
        'subdomains': ['www', 'business', 'learning'],
        'paths': ['/comm/', '/pulse/', '/learning/', '/business/']
    },
    'banking': {
        'domains': ['chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com', 'hsbc.com'],
        'subdomains': ['www', 'online', 'secure', 'mobile'],
        'paths': ['/online/', '/secure/', '/login/']
    }
}

# Known URL shortener services (legitimate)
LEGITIMATE_SHORTENERS = {
    'bit.ly': 'Bitly',
    'tinyurl.com': 'TinyURL', 
    't.co': 'Twitter',
    'goo.gl': 'Google (deprecated)',
    'youtu.be': 'YouTube',
    'amzn.to': 'Amazon',
    'fb.me': 'Facebook',
    'lnkd.in': 'LinkedIn',
    'ow.ly': 'Hootsuite'
}

def verify_url_legitimacy(url: str) -> Dict:
    """
    Verify if a URL is legitimate by checking against known patterns and services
    
    Args:
        url (str): The URL to verify
        
    Returns:
        dict: Verification result with legitimacy status and details
    """
    # Check cache first
    current_time = time.time()
    cache_key = url[:200]  # Limit key size
    
    if cache_key in URL_VERIFICATION_CACHE:
        cache_time, result = URL_VERIFICATION_CACHE[cache_key]
        if current_time - cache_time < CACHE_EXPIRY:
            return result
    
    result = {
        'is_legitimate': False,
        'confidence': 0.0,
        'service': None,
        'reasons': [],
        'warnings': [],
        'verification_type': 'unknown'
    }
    
    try:
        # Parse URL
        parsed = urlparse(url)
        extracted = tldextract.extract(url)
        
        domain = f"{extracted.domain}.{extracted.suffix}"
        subdomain = extracted.subdomain
        path = parsed.path.lower()
        
        # Check against official domain patterns
        for service, patterns in OFFICIAL_DOMAIN_PATTERNS.items():
            if _check_service_legitimacy(domain, subdomain, path, patterns):
                result['is_legitimate'] = True
                result['confidence'] = 0.95
                result['service'] = service
                result['verification_type'] = 'official_domain'
                result['reasons'].append(f"Matches official {service} domain pattern")
                break
        
        # Check for legitimate URL shorteners
        if not result['is_legitimate']:
            shortener_service = _check_url_shortener(domain)
            if shortener_service:
                result['is_legitimate'] = True
                result['confidence'] = 0.8  # Lower confidence for shorteners
                result['service'] = f"{shortener_service} (URL Shortener)"
                result['verification_type'] = 'url_shortener'
                result['reasons'].append(f"Legitimate URL shortener: {shortener_service}")
                result['warnings'].append("URL shortener hides final destination")
        
        # Additional checks for suspicious patterns
        _check_suspicious_patterns(url, domain, subdomain, result)
        
        # Cache the result
        URL_VERIFICATION_CACHE[cache_key] = (current_time, result)
        
    except Exception as e:
        logger.error(f"Error verifying URL {url}: {str(e)}")
        result['warnings'].append(f"Verification error: {str(e)}")
    
    return result

def _check_service_legitimacy(domain: str, subdomain: str, path: str, patterns: Dict) -> bool:
    """Check if domain/subdomain/path matches official service patterns"""
    
    # Check main domains
    if domain in patterns['domains']:
        # If it's a main domain, check subdomain legitimacy
        if not subdomain:
            return True  # Root domain is always legitimate
        
        # Check if subdomain is in allowed list
        if subdomain in patterns.get('subdomains', []):
            return True
    
    # Check path patterns for additional validation
    if path and patterns.get('paths'):
        for allowed_path in patterns['paths']:
            if path.startswith(allowed_path):
                return True
    
    return False

def _check_url_shortener(domain: str) -> str:
    """Check if domain is a legitimate URL shortener"""
    return LEGITIMATE_SHORTENERS.get(domain)

def _check_suspicious_patterns(url: str, domain: str, subdomain: str, result: Dict):
    """Check for suspicious patterns that might indicate phishing"""
    
    # Check for homograph attacks (look-alike domains)
    suspicious_chars = ['xn--', '0', '1', 'l', 'i']
    for service, patterns in OFFICIAL_DOMAIN_PATTERNS.items():
        for official_domain in patterns['domains']:
            if _is_similar_domain(domain, official_domain):
                result['warnings'].append(f"Domain similar to {service} official domain: {official_domain}")
    
    # Check for suspicious subdomains
    suspicious_subdomains = ['secure', 'login', 'verify', 'update', 'confirm', 'account']
    if subdomain and subdomain in suspicious_subdomains:
        # Only suspicious if it's not from a known legitimate service
        if not result['is_legitimate']:
            result['warnings'].append(f"Suspicious subdomain: {subdomain}")
    
    # Check for IP addresses
    ip_pattern = r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'
    if re.search(ip_pattern, url):
        result['warnings'].append("URL contains IP address instead of domain name")
    
    # Check for encoded characters
    if '%' in url:
        result['warnings'].append("URL contains encoded characters")
    
    # Check for suspicious TLDs
    suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.click', '.download']
    tld = f".{domain.split('.')[-1]}"
    if tld in suspicious_tlds:
        result['warnings'].append(f"Suspicious top-level domain: {tld}")

def _is_similar_domain(domain1: str, domain2: str) -> bool:
    """Check if two domains are suspiciously similar (potential homograph attack)"""
    if domain1 == domain2:
        return False
    
    # Check character substitutions
    substitutions = {
        'o': '0', 'i': '1', 'l': '1', 'e': '3', 'a': '4', 's': '5'
    }
    
    # Create variations of the official domain
    variations = [domain2]
    for char, replacement in substitutions.items():
        if char in domain2:
            variations.append(domain2.replace(char, replacement))
    
    # Check if the suspicious domain matches any variation
    return domain1 in variations

def bulk_verify_urls(urls: List[str]) -> Dict[str, Dict]:
    """
    Verify multiple URLs efficiently
    
    Args:
        urls: List of URLs to verify
        
    Returns:
        dict: Mapping of URL to verification result
    """
    results = {}
    
    for url in urls:
        try:
            results[url] = verify_url_legitimacy(url)
        except Exception as e:
            logger.error(f"Error verifying URL {url}: {str(e)}")
            results[url] = {
                'is_legitimate': False,
                'confidence': 0.0,
                'service': None,
                'reasons': [],
                'warnings': [f"Verification failed: {str(e)}"],
                'verification_type': 'error'
            }
    
    return results

def get_verification_summary(verification_results: Dict[str, Dict]) -> Dict:
    """
    Generate a summary of URL verification results
    
    Args:
        verification_results: Results from bulk_verify_urls
        
    Returns:
        dict: Summary statistics
    """
    total_urls = len(verification_results)
    legitimate_count = sum(1 for result in verification_results.values() if result['is_legitimate'])
    suspicious_count = sum(1 for result in verification_results.values() if result['warnings'])
    
    return {
        'total_urls': total_urls,
        'legitimate_urls': legitimate_count,
        'suspicious_urls': suspicious_count,
        'legitimacy_rate': legitimate_count / total_urls if total_urls > 0 else 0,
        'warning_rate': suspicious_count / total_urls if total_urls > 0 else 0
    } 