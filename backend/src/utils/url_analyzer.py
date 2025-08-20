import re
import tldextract
from urllib.parse import urlparse, unquote
import logging
import dns.resolver
import socket
from threading import Thread
from queue import Queue
import time
import requests
from urllib.parse import urlparse, parse_qs
from .url_verifier import verify_url_legitimacy, bulk_verify_urls

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of common phishing keywords in domains
SUSPICIOUS_DOMAIN_KEYWORDS = [
    'secure', 'login', 'verify', 'account', 'update', 'confirm', 'banking',
    'paypal', 'amazon', 'apple', 'microsoft', 'google', 'facebook', 'ebay',
    'netflix', 'security', 'support', 'service', 'signin', 'authorize',
    'wallet', 'password', 'recover', 'help', 'access', 'customer', 'notification'
]

# List of common legitimate TLDs
COMMON_TLDS = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'info', 'biz',
    'us', 'uk', 'ca', 'au', 'de', 'jp', 'fr', 'it', 'es', 'nl', 'ru', 'cn'
]

# Major service domains
MAJOR_SERVICES = {
    'paypal': ['paypal.com', 'paypal.co.uk'],
    'microsoft': ['microsoft.com', 'office.com', 'live.com', 'outlook.com', 'microsoftonline.com'],
    'apple': ['apple.com', 'icloud.com'],
    'amazon': ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.es'],
    'google': ['google.com', 'gmail.com', 'youtube.com'],
    'facebook': ['facebook.com', 'fb.com', 'messenger.com', 'instagram.com'],
    'netflix': ['netflix.com'],
    'bank': ['chase.com', 'bankofamerica.com', 'wellsfargo.com', 'hsbc.com', 'citibank.com', 'barclays.co.uk'],
    'aliexpress': ['aliexpress.com', 'alibaba.com', 'alipay.com'],
    'walmart': ['walmart.com', 'walmart.ca'],
    'ebay': ['ebay.com', 'ebay.co.uk', 'ebay.ca', 'ebay.de'],
    'target': ['target.com']
}

# Common official subdomains for large services
LEGITIMATE_SUBDOMAINS = {
    'amazon.com': ['smile', 'www', 'pay', 'aws', 'services'],
    'google.com': ['www', 'mail', 'drive', 'docs', 'accounts', 'myaccount'],
    'microsoft.com': ['www', 'login', 'account', 'azure', 'support', 'docs', 'office'],
    'apple.com': ['www', 'id', 'support', 'icloud', 'appleid'],
    'paypal.com': ['www', 'account'],
    'facebook.com': ['www', 'm', 'business'],
    'aliexpress.com': ['login', 'trade', 'message', 'www', 'es', 'sale']
}

# Trusted URL shortening services
TRUSTED_URL_SHORTENERS = [
    'bit.ly', 'goo.gl', 't.co', 'tinyurl.com', 'ow.ly', 'linkedin.com/sharing', 
    'youtu.be', 'amzn.to', 'fb.me', 'lnkd.in'
]

# Cache for DNS lookups to avoid repeated lookups
DNS_CACHE = {}
DNS_CACHE_EXPIRY = 3600  # 1 hour in seconds

# Cache for URL reputation checks
URL_REPUTATION_CACHE = {}
URL_REPUTATION_EXPIRY = 86400  # 24 hours

def analyze_urls(email_data):
    """
    Analyze URLs in an email for potential phishing indicators.
    
    Args:
        email_data (dict): The parsed email data containing URLs
        
    Returns:
        list: List of suspicious elements found
    """
    suspicious_elements = []
    
    # Get URLs from the email
    urls = email_data.get('urls', [])
    
    # If no explicit URLs were parsed, try to extract them from HTML content
    if not urls and 'html' in email_data:
        urls = extract_urls_from_html(email_data['html'])
    
    # Keep track of domains we've seen to avoid duplicate checks
    analyzed_domains = set()
    
    # Use a thread pool for DNS lookups to speed up analysis
    dns_results = {}
    dns_queue = Queue()
    
    # Start worker threads for DNS resolution
    for _ in range(min(5, max(1, len(urls)))):  # At least 1 thread, at most 5
        worker = Thread(target=dns_worker, args=(dns_queue, dns_results))
        worker.daemon = True
        worker.start()
    
    # Queue DNS lookups for each domain
    for url in urls:
        # Extract domain information
        extracted = tldextract.extract(url)
        domain = f"{extracted.domain}.{extracted.suffix}"
        if domain not in analyzed_domains and extracted.suffix:  # Only queue valid domains
            analyzed_domains.add(domain)
            dns_queue.put(domain)
    
    # Add sentinel values to the queue to signal workers to exit
    for _ in range(min(5, max(1, len(urls)))):
        dns_queue.put(None)
    
    # Wait for DNS lookups to complete (with timeout)
    dns_queue.join()
    time.sleep(0.1)  # Small delay to ensure workers finish
    
    # Bulk verify URLs using the new verification system
    url_verification_results = bulk_verify_urls(urls)
    
    # Analyze each URL
    for url in urls:
        # Extract domain information
        extracted = tldextract.extract(url)
        domain = f"{extracted.domain}.{extracted.suffix}"
        subdomain = extracted.subdomain
        full_domain = f"{subdomain}.{domain}" if subdomain else domain
        
        # Skip invalid URLs
        if not extracted.suffix:
            continue
        
        # Get verification result from new system
        verification_result = url_verification_results.get(url, {})
        is_verified_legitimate = verification_result.get('is_legitimate', False)
        verification_confidence = verification_result.get('confidence', 0.0)
        verification_warnings = verification_result.get('warnings', [])
        
        # Get domain reputation and URL safety score
        domain_reputation = check_domain_reputation(domain)
        url_safety = check_url_safety(url)
        
        # Check if the domain exists and has proper DNS records
        domain_exists = dns_results.get(domain, {}).get('exists', False)
        
        # Check if this is a trusted URL shortener
        is_url_shortener = any(shortener in full_domain for shortener in TRUSTED_URL_SHORTENERS)
        
        # If URL is verified as legitimate with high confidence, skip most checks
        if is_verified_legitimate and verification_confidence >= 0.9:
            # Still check for any warnings from the verification system
            for warning in verification_warnings:
                suspicious_elements.append({
                    'type': 'url_warning',
                    'value': url,
                    'reason': f"Verified legitimate but: {warning}",
                    'severity': 'low'
                })
            continue
        
        # Check for suspicious domains (but not for verified legitimate URLs)
        if not is_verified_legitimate and not is_url_shortener:
            is_suspicious, reason = is_suspicious_domain(domain, subdomain)
            if is_suspicious:
                suspicious_elements.append({
                    'type': 'domain',
                    'value': full_domain,
                    'reason': reason,
                    'severity': 'medium' if domain_reputation.get('score', 0) < 50 else 'low'
                })
        
        # Check for suspicious URL patterns
        is_suspicious, reason = is_suspicious_url(url)
        if is_suspicious and not is_verified_legitimate:
            suspicious_elements.append({
                'type': 'url',
                'value': url,
                'reason': reason,
                'severity': 'high' if url_safety.get('score', 0) < 30 else 'medium'
            })
        
        # Check for suspicious URL paths
        is_suspicious, reason = analyze_url_path(url)
        if is_suspicious and not domain_reputation.get('trusted', False) and not is_verified_legitimate:
            suspicious_elements.append({
                'type': 'url_path',
                'value': url,
                'reason': reason,
                'severity': 'low'
            })
        
        # Add verification warnings as suspicious elements
        for warning in verification_warnings:
            if not is_verified_legitimate:  # Only add warnings for unverified URLs
                suspicious_elements.append({
                    'type': 'verification_warning',
                    'value': url,
                    'reason': warning,
                    'severity': 'medium'
                })
        
        # If the domain doesn't exist, that's a major red flag
        if not domain_exists and not is_known_legitimate_domain(domain) and not is_url_shortener and not is_verified_legitimate:
            suspicious_elements.append({
                'type': 'nonexistent_domain',
                'value': domain,
                'reason': "Domain doesn't have proper DNS records",
                'severity': 'high'
            })
    
    # Check for mismatched domains in links vs. sender
    sender_domain = extract_sender_domain(email_data.get('from', ''))
    if sender_domain:
        for url in urls:
            extracted = tldextract.extract(url)
            url_domain = extracted.domain
            url_suffix = extracted.suffix
            full_url_domain = f"{url_domain}.{url_suffix}"
            
            # Skip check if it's already identified as a legitimate domain or URL shortener
            if is_known_legitimate_domain(full_url_domain) or any(shortener in full_url_domain for shortener in TRUSTED_URL_SHORTENERS):
                continue
            
            # Check if this could be a brand impersonation
            if is_impersonating_brand(sender_domain, full_url_domain):
                suspicious_elements.append({
                    'type': 'domain_mismatch',
                    'value': f"Sender: {sender_domain}, Link: {full_url_domain}",
                    'reason': f"Potential brand impersonation: Email from {sender_domain} contains links to {full_url_domain}",
                    'severity': 'high'
                })
    
    return suspicious_elements

def extract_urls_from_html(html_content):
    """Extract URLs from HTML content"""
    urls = []
    if not html_content:
        return urls
        
    # Look for href attributes
    href_pattern = r'href=[\'"]?([^\'" >]+)'
    for url in re.findall(href_pattern, html_content):
        if url.startswith('http'):
            urls.append(url)
            
    return urls

def dns_worker(queue, results):
    """Worker function for threaded DNS lookups"""
    while True:
        domain = queue.get()
        if domain is None:  # Sentinel value to exit
            queue.task_done()
            break
            
        try:
            results[domain] = check_domain_dns(domain)
        except Exception as e:
            logger.error(f"Error in DNS worker for {domain}: {str(e)}")
            results[domain] = {'exists': False, 'error': str(e)}
        
        queue.task_done()

def check_domain_dns(domain):
    """Check if a domain exists by querying DNS records"""
    # Check if we have a cached result
    current_time = time.time()
    if domain in DNS_CACHE:
        cache_time, result = DNS_CACHE[domain]
        if current_time - cache_time < DNS_CACHE_EXPIRY:
            return result
    
    result = {'exists': False, 'records': {}}
    
    try:
        # Try to resolve the domain's A record
        try:
            answers = dns.resolver.resolve(domain, 'A')
            if answers:
                result['exists'] = True
                result['records']['A'] = [answer.to_text() for answer in answers]
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
        
        # Try to resolve MX records (especially important for email domains)
        try:
            answers = dns.resolver.resolve(domain, 'MX')
            if answers:
                result['exists'] = True
                result['records']['MX'] = [answer.to_text() for answer in answers]
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            pass
            
    except Exception as e:
        logger.error(f"Error checking DNS for {domain}: {str(e)}")
    
    # Cache the result
    DNS_CACHE[domain] = (current_time, result)
    return result

def is_known_legitimate_domain(domain):
    """Check if a domain is a known legitimate service"""
    for brand, domains in MAJOR_SERVICES.items():
        if domain in domains or any(domain.endswith('.' + d) for d in domains):
            return True
    return False

def is_suspicious_domain(domain, subdomain):
    """Check if a domain appears suspicious"""
    # Check for unusual TLD
    tld = domain.split('.')[-1]
    if tld not in COMMON_TLDS:
        return True, f"Unusual top-level domain (.{tld})"
    
    # Check if this is a known legitimate domain
    if is_known_legitimate_domain(domain):
        # Check if the subdomain is a known legitimate subdomain
        if subdomain:
            for base_domain, legitimate_subs in LEGITIMATE_SUBDOMAINS.items():
                if domain == base_domain or domain.endswith('.' + base_domain):
                    if subdomain in legitimate_subs:
                        return False, ""  # This is a legitimate subdomain
        else:
            # Known domain with no subdomain is likely legitimate
            return False, ""
    
    # Check for suspicious keywords in domain
    domain_name = domain.split('.')[0].lower()
    for keyword in SUSPICIOUS_DOMAIN_KEYWORDS:
        if keyword in domain_name:
            # Check for suspicious patterns like 'paypal-secure'
            if '-' in domain_name or '_' in domain_name:
                return True, f"Suspicious domain pattern using '{keyword}'"
    
    # Check for lookalike domains for major services
    for service, domains in MAJOR_SERVICES.items():
        if domain not in domains:  # Skip if it's actually the legitimate domain
            # Check for similarity to the brand name
            if service in domain_name or domain_name_similarity(domain_name, service) > 0.7:
                # Look for specific patterns suggesting a lookalike
                if service != domain_name and (domain_name.startswith(service) or domain_name.endswith(service)):
                    return True, f"Possible lookalike domain for {service}"
    
    # Check for suspicious subdomains
    if subdomain:
        for keyword in SUSPICIOUS_DOMAIN_KEYWORDS:
            if keyword in subdomain.lower():
                return True, f"Suspicious subdomain using '{keyword}'"
        
        # Check for brand names in subdomains (could be impersonation)
        for service in MAJOR_SERVICES:
            if service in subdomain.lower() and not any(domain == d for d in MAJOR_SERVICES[service]):
                return True, f"Suspicious use of '{service}' in subdomain"
    
    return False, ""

def is_suspicious_url(url):
    """Check if a URL appears suspicious"""
    # Check for IP address in URL
    ip_pattern = r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'
    if re.match(ip_pattern, url):
        return True, "URL contains IP address instead of domain name"
    
    # Check for encoded characters in URL
    if '%' in url:
        decoded = unquote(url)
        if decoded != url:
            # Look for obfuscated protocols or domains
            if 'http' in decoded and 'http' not in url.lower():
                return True, "URL contains obfuscated protocol"
            if '@' in decoded and '@' not in url:
                return True, "URL contains obfuscated credentials"
    
    # Check for excessive subdomains
    subdomain_count = url.count('.')
    if subdomain_count > 5:  # Updated threshold
        return True, "URL contains an unusual number of subdomains"
    
    # Check for URLs with credentials
    if '@' in url:
        return True, "URL contains embedded credentials"
    
    # Check for unusual port numbers
    port_match = re.search(r':(\d+)', url)
    if port_match:
        port = int(port_match.group(1))
        if port != 80 and port != 443:
            return True, f"URL uses unusual port number ({port})"
    
    # Check for redirects in URL
    redirect_patterns = ['/redirect/', 'url=', 'redirect=', 'target=', 'link=', 'goto=']
    for pattern in redirect_patterns:
        if pattern in url.lower():
            # Verify it's not a legitimate tracking parameter
            parsed = urlparse(url)
            domain = parsed.netloc
            if not is_known_legitimate_domain(domain):
                return True, "URL appears to contain a redirect"
    
    # Check for extremely long URLs (often used to hide the real destination)
    if len(url) > 250:
        return True, "Suspiciously long URL"
        
    # Check for common URL shorteners (not necessarily suspicious, but worth noting)
    shortener_domains = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cli.gs', 'tiny.cc']
    parsed = urlparse(url)
    if parsed.netloc in shortener_domains:
        return True, "URL uses a shortening service which hides the destination"
    
    return False, ""

def analyze_url_path(url):
    """Analyze the URL path for suspicious patterns"""
    parsed = urlparse(url)
    path = parsed.path.lower()
    query = parsed.query.lower()
    
    # Check for suspicious path elements
    suspicious_paths = ['login', 'signin', 'verify', 'account', 'password', 'secure', 'update']
    for suspicious in suspicious_paths:
        if suspicious in path:
            return True, f"URL path contains '{suspicious}'"
    
    # Check for file extensions that could be used for phishing
    if any(path.endswith(ext) for ext in ['.php', '.asp']):
        # Additional check for odd patterns like login.php
        for suspicious in suspicious_paths:
            if f"{suspicious}." in path:
                return True, f"Suspicious file name pattern: '{suspicious}' with extension"
    
    # Check for suspicious query parameters
    if any(param in query for param in ['token=', 'auth=', 'session=', 'redirect=']):
        return True, "URL contains suspicious query parameters"
    
    return False, ""

def extract_sender_domain(sender):
    """Extract domain from sender email address"""
    email_match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', sender)
    if email_match:
        return email_match.group(1)
    return None

def is_impersonating_brand(sender_domain, url_domain):
    """Check if the URL could be impersonating a brand mentioned in the sender domain"""
    # Find the brand associated with the sender domain
    sender_brand = None
    for brand, domains in MAJOR_SERVICES.items():
        if any(sender_domain == domain or sender_domain.endswith('.' + domain) for domain in domains):
            sender_brand = brand
            break
    
    if not sender_brand:
        return False
        
    # Check if the URL domain is impersonating this brand
    if sender_brand:
        # Check if URL domain is not in the list of legitimate domains for this brand
        if not any(url_domain == domain or url_domain.endswith('.' + domain) for domain in MAJOR_SERVICES[sender_brand]):
            # Check if the URL domain contains the brand name or a similar string
            if sender_brand in url_domain or domain_name_similarity(url_domain.split('.')[0], sender_brand) > 0.7:
                return True
    
    return False

def domain_name_similarity(domain1, domain2):
    """Calculate similarity between two domain names"""
    # This is a very basic similarity check
    # In a real application, you might want to use more sophisticated methods
    if domain1 == domain2:
        return 1.0
    
    # Check for character substitution (e.g., 'l' -> '1')
    substitutions = {
        'l': '1', 'i': '1', 'o': '0', 'a': '4', 'e': '3', 's': '5',
        '1': 'l', '0': 'o', '4': 'a', '3': 'e', '5': 's'
    }
    
    # Create normalized versions for comparison
    domain1_norm = domain1.lower()
    domain2_norm = domain2.lower()
    
    # Check for exact match after substitutions
    for char, subst in substitutions.items():
        if char in domain1_norm:
            test_domain = domain1_norm.replace(char, subst)
            if test_domain == domain2_norm:
                return 0.9
    
    # Check for extra/missing characters (e.g., "paypal" vs "paypall")
    if domain1_norm in domain2_norm or domain2_norm in domain1_norm:
        # Length difference of 1-2 characters suggests a close match
        if abs(len(domain1_norm) - len(domain2_norm)) <= 2:
            return 0.8
    
    # Calculate character-based similarity
    shorter = min(len(domain1), len(domain2))
    longer = max(len(domain1), len(domain2))
    
    if shorter == 0:
        return 0.0
    
    # Count matching characters
    matches = sum(1 for i in range(shorter) if domain1[i].lower() == domain2[i].lower())
    
    return matches / longer

def check_domain_reputation(domain):
    """
    Check the reputation of a domain using various signals
    
    Args:
        domain (str): The domain to check
        
    Returns:
        dict: Reputation information including score and trusted status
    """
    # Check cache first
    current_time = time.time()
    if domain in URL_REPUTATION_CACHE:
        cache_time, result = URL_REPUTATION_CACHE[domain]
        if current_time - cache_time < URL_REPUTATION_EXPIRY:
            return result
    
    reputation = {
        'score': 50,  # Default neutral score
        'trusted': False
    }
    
    # Check if it's a known legitimate service
    if is_known_legitimate_domain(domain):
        reputation['score'] = 90
        reputation['trusted'] = True
        reputation['source'] = 'whitelist'
        URL_REPUTATION_CACHE[domain] = (current_time, reputation)
        return reputation
    
    # Check domain age and registration data (simulated)
    # In a real implementation, you would query WHOIS databases or domain age APIs
    try:
        # Check if DNS records exist
        dns_result = check_domain_dns(domain)
        if dns_result.get('exists', False):
            reputation['score'] += 15  # Domain exists
            
            # Check for proper MX records for email domains
            if dns_result.get('records', {}).get('MX'):
                reputation['score'] += 10  # Has MX records
    except Exception as e:
        logger.error(f"Error checking domain DNS for reputation: {str(e)}")
    
    # Check TLD reputation
    tld = domain.split('.')[-1]
    if tld in COMMON_TLDS:
        reputation['score'] += 5
    else:
        reputation['score'] -= 10  # Unusual TLD
    
    # Mark as trusted if score is very high
    if reputation['score'] >= 80:
        reputation['trusted'] = True
    
    # Cache the result
    URL_REPUTATION_CACHE[domain] = (current_time, reputation)
    return reputation

def check_url_safety(url):
    """
    Check URL safety score based on various signals
    
    Args:
        url (str): The URL to check
        
    Returns:
        dict: Safety information including score
    """
    # Check cache first
    current_time = time.time()
    cache_key = url[:250]  # Limit key size for very long URLs
    if cache_key in URL_REPUTATION_CACHE:
        cache_time, result = URL_REPUTATION_CACHE[cache_key]
        if current_time - cache_time < URL_REPUTATION_EXPIRY:
            return result
    
    safety = {
        'score': 50,  # Default neutral score
        'checks': {}
    }
    
    # Extract domain
    parsed = urlparse(url)
    extracted = tldextract.extract(url)
    domain = f"{extracted.domain}.{extracted.suffix}"
    
    # Check domain reputation
    domain_rep = check_domain_reputation(domain)
    safety['score'] = domain_rep.get('score', 50)
    safety['checks']['domain'] = domain_rep
    
    # URL pattern checks
    # Check for IP address in URL
    if re.match(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        safety['score'] -= 30
        safety['checks']['ip_address'] = True
    
    # Check for encoded characters
    if '%' in url:
        decoded = unquote(url)
        if decoded != url:
            safety['score'] -= 15
            safety['checks']['encoded'] = True
    
    # Check for credentials in URL
    if '@' in url:
        safety['score'] -= 25
        safety['checks']['credentials'] = True
    
    # Check URL length (very long URLs are suspicious)
    if len(url) > 250:
        safety['score'] -= 10
        safety['checks']['long_url'] = True
    
    # Check for unusual port
    port_match = re.search(r':(\d+)', url)
    if port_match:
        port = int(port_match.group(1))
        if port != 80 and port != 443:
            safety['score'] -= 15
            safety['checks']['unusual_port'] = True
    
    # Check path for suspicious elements
    path = parsed.path.lower()
    query = parsed.query.lower()
    suspicious_paths = ['login', 'signin', 'verify', 'account', 'password', 'secure', 'update']
    
    for suspicious in suspicious_paths:
        if suspicious in path:
            safety['score'] -= 5
            safety['checks']['suspicious_path'] = True
            break
    
    # Check for suspicious query parameters
    suspicious_params = ['token=', 'auth=', 'session=', 'redirect=']
    if any(param in query for param in suspicious_params):
        safety['score'] -= 5
        safety['checks']['suspicious_params'] = True
    
    # Check for URL shortener (not suspicious by itself but worth noting)
    shortener_domains = TRUSTED_URL_SHORTENERS
    if parsed.netloc in shortener_domains:
        safety['shortener'] = True
    
    # Mark domain as suspicious if score is very low
    if safety['score'] < 20:
        safety['suspicious'] = True
    
    # Cap score between 0-100
    safety['score'] = max(0, min(safety['score'], 100))
    
    # Cache the result
    URL_REPUTATION_CACHE[cache_key] = (current_time, safety)
    return safety 