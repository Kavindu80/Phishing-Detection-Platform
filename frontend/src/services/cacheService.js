/**
 * Cache Service
 * Provides caching functionality for various app data to improve navigation performance
 */

const CACHE_KEYS = {
  INBOX_EMAILS: 'inbox_emails',
  ANALYTICS_DATA: 'analytics_data',
  SCAN_HISTORY: 'scan_history'
};

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * Set data in the cache with expiry time
 * @param {string} key - Cache key 
 * @param {any} data - Data to cache
 */
export const setCache = (key, data) => {
  if (!data) return;
  
  const cacheItem = {
    data,
    timestamp: Date.now()
  };
  
  try {
    sessionStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`Cached data for ${key}`);
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

/**
 * Get data from cache if not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/not found
 */
export const getCache = (key) => {
  try {
    const cachedItem = sessionStorage.getItem(key);
    if (!cachedItem) return null;
    
    const { data, timestamp } = JSON.parse(cachedItem);
    const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
    
    if (isExpired) {
      console.log(`Cache expired for ${key}`);
      sessionStorage.removeItem(key);
      return null;
    }
    
    console.log(`Using cached data for ${key}`);
    return data;
  } catch (error) {
    console.error('Error retrieving cache:', error);
    return null;
  }
};

/**
 * Clear a specific cache item
 * @param {string} key - Cache key
 */
export const clearCache = (key) => {
  sessionStorage.removeItem(key);
};

/**
 * Clear all cached data
 */
export const clearAllCache = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    sessionStorage.removeItem(key);
  });
};

export default {
  CACHE_KEYS,
  setCache,
  getCache,
  clearCache,
  clearAllCache
}; 