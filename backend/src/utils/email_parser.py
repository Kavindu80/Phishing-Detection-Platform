import re
import email
from email import policy
from email.parser import Parser
from io import StringIO
import html
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_email(email_text):
    """
    Parse an email string into its components.
    
    Args:
        email_text (str): The raw email text
        
    Returns:
        dict: A dictionary containing email components
    """
    try:
        # Try to parse as a proper email with headers
        parser = Parser(policy=policy.default)
        msg = parser.parsestr(email_text)
        
        # Extract email components
        email_data = {
            'subject': msg.get('Subject', ''),
            'from': msg.get('From', ''),
            'to': msg.get('To', ''),
            'cc': msg.get('Cc', ''),
            'date': msg.get('Date', ''),
            'content_type': msg.get_content_type(),
            'headers': extract_headers(msg),
        }
        
        # Extract Reply-To if present
        if msg.get('Reply-To'):
            email_data['reply_to'] = msg.get('Reply-To')
        
        # Get the body based on content type
        body_text = ''
        html_content = ''
        
        if msg.is_multipart():
            # Handle multipart emails
            body_parts = []
            for part in msg.walk():
                content_type = part.get_content_type()
                
                if content_type == 'text/plain':
                    try:
                        text = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
                        body_parts.append(text)
                    except Exception as e:
                        logger.warning(f"Error decoding plain text part: {str(e)}")
                
                elif content_type == 'text/html':
                    try:
                        html_part = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
                        html_content = html_part
                    except Exception as e:
                        logger.warning(f"Error decoding HTML part: {str(e)}")
            
            email_data['body'] = '\n'.join(body_parts)
        else:
            # Handle single part emails
            content_type = msg.get_content_type()
            try:
                content = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='replace')
                
                if content_type == 'text/html':
                    html_content = content
                    # Extract text from HTML
                    email_data['body'] = html_to_text(content)
                else:
                    email_data['body'] = content
            except Exception as e:
                logger.warning(f"Error decoding email content: {str(e)}")
                email_data['body'] = msg.get_payload()
        
        # Add HTML content if available
        if html_content:
            email_data['html'] = html_content
        
        # Extract URLs from the email body and HTML content
        email_data['urls'] = extract_urls(email_data['body'])
        if html_content:
            html_urls = extract_urls_from_html(html_content)
            # Merge URLs without duplicates
            email_data['urls'] = list(set(email_data['urls'] + html_urls))
        
        # Parse sender details for better verification
        email_data['sender_details'] = parse_sender(email_data['from'])
        
        # Extract authentication results
        if 'Authentication-Results' in email_data['headers']:
            email_data['authentication'] = parse_authentication_results(
                email_data['headers']['Authentication-Results']
            )
        
    except Exception as e:
        # If parsing fails, treat the entire text as the body
        logger.error(f"Error parsing email: {str(e)}. Treating as plain text.")
        email_data = {
            'subject': extract_subject(email_text),
            'from': extract_sender(email_text),
            'to': '',
            'date': '',
            'content_type': 'text/plain',
            'body': email_text,
            'urls': extract_urls(email_text),
            'headers': {},
            'sender_details': parse_sender(extract_sender(email_text)),
        }
    
    return email_data

def extract_headers(msg):
    """Extract all headers from email message"""
    headers = {}
    for key in msg.keys():
        headers[key] = msg[key]
    return headers

def parse_authentication_results(auth_header):
    """
    Parse authentication results header to extract SPF, DKIM, and DMARC results
    
    Args:
        auth_header (str): Authentication-Results header value
        
    Returns:
        dict: Authentication results
    """
    results = {
        'spf': 'none',
        'dkim': 'none',
        'dmarc': 'none'
    }
    
    try:
        auth_lower = auth_header.lower()
        
        # Check SPF
        spf_match = re.search(r'spf=(\w+)', auth_lower)
        if spf_match:
            results['spf'] = spf_match.group(1)
        
        # Check DKIM
        dkim_match = re.search(r'dkim=(\w+)', auth_lower)
        if dkim_match:
            results['dkim'] = dkim_match.group(1)
        
        # Check DMARC
        dmarc_match = re.search(r'dmarc=(\w+)', auth_lower)
        if dmarc_match:
            results['dmarc'] = dmarc_match.group(1)
            
    except Exception as e:
        logger.error(f"Error parsing authentication results: {str(e)}")
        
    return results

def parse_sender(from_field):
    """
    Parse sender details from From field
    
    Args:
        from_field (str): From header value
        
    Returns:
        dict: Sender details
    """
    sender = {
        'name': None,
        'email': None,
        'domain': None
    }
    
    try:
        # Extract name and email
        name_match = re.search(r'^([^<]+)', from_field)
        if name_match:
            sender['name'] = name_match.group(1).strip()
        
        email_match = re.search(r'<([^>]+)>', from_field)
        if email_match:
            sender['email'] = email_match.group(1).strip()
        else:
            # If no angle brackets, the whole field might be an email
            email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', from_field)
            if email_match:
                sender['email'] = email_match.group(1).strip()
        
        # Extract domain from email
        if sender['email']:
            domain_match = re.search(r'@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', sender['email'])
            if domain_match:
                sender['domain'] = domain_match.group(1).strip().lower()
    
    except Exception as e:
        logger.error(f"Error parsing sender details: {str(e)}")
    
    return sender

def html_to_text(html_content):
    """
    Convert HTML to plain text (simple implementation)
    
    Args:
        html_content (str): HTML content
        
    Returns:
        str: Plain text version
    """
    # First decode HTML entities
    text = html.unescape(html_content)
    
    # Remove scripts and style elements
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
    
    # Replace <br>, <p>, <div> tags with newlines
    text = re.sub(r'<br[^>]*>', '\n', text)
    text = re.sub(r'</p>\s*<p[^>]*>', '\n\n', text)
    text = re.sub(r'<div[^>]*>', '\n', text)
    text = re.sub(r'</div>', '\n', text)
    
    # Remove all other tags
    text = re.sub(r'<[^>]*>', '', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    
    return text.strip()

def extract_subject(text):
    """Extract a potential subject from plain text"""
    # Look for lines that might be a subject
    lines = text.split('\n')
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if line.lower().startswith('subject:'):
            return line[8:].strip()
    
    # If no explicit subject, use the first non-empty line
    for line in lines:
        line = line.strip()
        if line and len(line) < 100:  # Reasonable subject length
            return line
    
    return 'No Subject'

def extract_sender(text):
    """Extract a potential sender from plain text"""
    # Look for lines that might contain a sender
    lines = text.split('\n')
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip().lower()
        if line.startswith('from:'):
            sender = line[5:].strip()
            # Extract email address if present
            email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', sender)
            if email_match:
                return email_match.group(0)
            return sender
    
    # Look for any email address in the text
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    if email_match:
        return email_match.group(0)
    
    return 'Unknown Sender'

def extract_urls(text):
    """Extract URLs from text"""
    url_pattern = r'https?://[^\s<>"\'\(\)\[\]{}|\\^`]+|www\.[^\s<>"\'\(\)\[\]{}|\\^`]+'
    return re.findall(url_pattern, text)

def extract_urls_from_html(html_content):
    """Extract URLs from HTML content, focusing on href attributes"""
    urls = []
    
    # Look for href attributes
    href_pattern = r'href=[\'"]?([^\'" >]+)'
    for url in re.findall(href_pattern, html_content):
        if url.startswith('http') or url.startswith('www'):
            urls.append(url)
    
    return urls 