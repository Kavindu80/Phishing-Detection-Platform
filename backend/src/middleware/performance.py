import time
import logging
from functools import wraps
from flask import request, g

logger = logging.getLogger(__name__)

def monitor_performance(f):
    """Decorator to monitor endpoint performance"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        # Store start time in Flask g object
        g.start_time = start_time
        
        try:
            result = f(*args, **kwargs)
            return result
        finally:
            # Calculate response time
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            # Log performance metrics
            logger.info(f"Performance: {request.endpoint} - {response_time:.2f}ms - {request.method} {request.path}")
            
            # Log slow requests
            if response_time > 1000:  # More than 1 second
                logger.warning(f"Slow request detected: {request.endpoint} took {response_time:.2f}ms")
    
    return decorated_function

class PerformanceMiddleware:
    """Middleware to track application performance"""
    
    def __init__(self, app):
        self.app = app
        
    def __call__(self, environ, start_response):
        # Start timing
        start_time = time.time()
        
        # Call the application
        def custom_start_response(status, headers, exc_info=None):
            # Calculate response time
            response_time = (time.time() - start_time) * 1000
            
            # Add performance header
            headers.append(('X-Response-Time', f'{response_time:.2f}ms'))
            
            # Log performance
            path = environ.get('PATH_INFO', '')
            method = environ.get('REQUEST_METHOD', '')
            logger.info(f"Request: {method} {path} - {response_time:.2f}ms")
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response) 