import re
import html
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class InputValidator:
    """Input validation and sanitization utilities"""
    
    @staticmethod
    def sanitize_text(text):
        """Sanitize text input to prevent XSS"""
        if not text:
            return ""
        
        # HTML escape
        sanitized = html.escape(str(text))
        
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            r'<script.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'on\w+\s*=',
            r'<iframe.*?</iframe>',
            r'<object.*?</object>',
            r'<embed.*?</embed>'
        ]
        
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        return sanitized.strip()
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        if not email:
            return False, "Email is required"
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return False, "Invalid email format"
        
        return True, "Valid email"
    
    @staticmethod
    def validate_url(url):
        """Validate URL format"""
        if not url:
            return False, "URL is required"
        
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False, "Invalid URL format"
    
    @staticmethod
    def validate_email_content(content):
        """Validate email content"""
        if not content:
            return False, "Email content is required"
        
        # Check for reasonable length
        if len(content) > 10000:
            return False, "Email content too long (max 10KB)"
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'password.*reset',
            r'account.*suspended',
            r'urgent.*action',
            r'click.*here',
            r'verify.*account',
            r'bank.*security'
        ]
        
        content_lower = content.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, content_lower):
                logger.warning(f"Suspicious pattern detected: {pattern}")
        
        return True, "Valid email content"
    
    @staticmethod
    def sanitize_json_input(data):
        """Sanitize JSON input data"""
        if not isinstance(data, dict):
            return {}
        
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = InputValidator.sanitize_text(value)
            elif isinstance(value, dict):
                sanitized[key] = InputValidator.sanitize_json_input(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    InputValidator.sanitize_text(item) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized 