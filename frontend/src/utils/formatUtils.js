/**
 * Utility functions for formatting data in the frontend
 */

/**
 * Formats a confidence value to a percentage string
 * This handles both decimal probabilities (0-1) and percentages (0-100)
 * ensuring consistent display regardless of backend format changes
 * 
 * @param {number|string} confidence - The confidence value to format
 * @param {boolean} includeSymbol - Whether to include the % symbol
 * @returns {string|number} - Formatted confidence value as percentage
 */
export const formatConfidence = (confidence) => {
  if (confidence === undefined || confidence === null) {
    return 'Unknown';
  }
  
  // Handle strings
  if (typeof confidence === 'string') {
    // Try to convert to number
    const parsed = parseFloat(confidence);
    if (isNaN(parsed)) {
      return confidence; // Return original if not parseable
    }
    confidence = parsed;
  }
  
  // Handle numbers - check if it's a decimal probability (0-1) or percentage (0-100)
  if (confidence <= 1) {
    // Backend sends decimal values (0-1), convert to percentage
    return `${Math.round(confidence * 100)}%`;
  } else {
    // Already a percentage value (0-100)
    return `${Math.round(confidence)}%`;
  }
};

/**
 * Format a date string to a human-readable format
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
}; 

// Format URL for display by showing parts of long URLs in a more readable way
export const formatUrl = (url, options = {}) => {
  const { maxLength = 75, showProtocol = true, showDomain = true } = options;
  
  if (!url) return '';
  
  // If URL is short enough, return it as is
  if (url.length <= maxLength) {
    return url;
  }
  
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol;
    const hostname = parsedUrl.hostname;
    const pathname = parsedUrl.pathname;
    const search = parsedUrl.search;
    
    // Create a display version
    let displayUrl = '';
    
    // Add protocol if requested
    if (showProtocol) {
      displayUrl += protocol + '//';
    }
    
    // Always show the domain
    if (showDomain) {
      displayUrl += hostname;
    }
    
    // For the path and query, we need to be selective
    let remainingChars = maxLength - displayUrl.length - 3; // -3 for the ellipsis
    
    // If we have a long path, truncate it
    if (pathname.length > remainingChars / 2) {
      displayUrl += pathname.substring(0, Math.max(remainingChars / 2, 10)) + '...';
      remainingChars -= pathname.substring(0, Math.max(remainingChars / 2, 10)).length + 3;
    } else {
      displayUrl += pathname;
      remainingChars -= pathname.length;
    }
    
    // If we still have room and there's a query string, add part of it
    if (remainingChars > 10 && search.length > 0) {
      if (search.length > remainingChars) {
        displayUrl += search.substring(0, remainingChars) + '...';
      } else {
        displayUrl += search;
      }
    } else if (search.length > 0) {
      displayUrl += '...';
    }
    
    return displayUrl;
  } catch (error) {
    // If URL parsing fails, just truncate with ellipsis
    console.warn('Error parsing URL:', error.message);
    return url.substring(0, maxLength - 3) + '...';
  }
};

// Extract domain from URL
export const extractDomain = (url) => {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.warn('Error extracting domain from URL:', error.message);
    return '';
  }
}; 