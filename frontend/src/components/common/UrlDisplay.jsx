import React, { useState } from 'react';
import { extractDomain } from '../../utils/formatUtils';
import { FiExternalLink, FiChevronDown, FiChevronUp } from 'react-icons/fi';

/**
 * Component for displaying URLs in a user-friendly way
 */
const UrlDisplay = ({ url, showDomain = true, showControls = true }) => {
  const [expanded, setExpanded] = useState(false);
  const domain = extractDomain(url);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Determine if URL is long enough to need expansion
  const isLongUrl = url.length > 60;
  
  return (
    <div className="url-display-wrapper">
      <div className="w-full max-w-full rounded-md overflow-hidden border border-gray-200 bg-white">
        {/* Domain header */}
        {showDomain && domain && (
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center min-w-0">
            <div className="font-medium text-sm text-gray-700 truncate min-w-0 flex-1">
              {domain}
            </div>
            {showControls && (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-800 ml-2 text-xs flex items-center flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <FiExternalLink className="mr-1" size={14} />
                <span className="hidden sm:inline">Open</span>
              </a>
            )}
          </div>
        )}

        {/* URL content */}
        <div className="relative min-w-0 max-w-full">
          <div 
            className={`bg-gray-100 p-3 min-w-0 max-w-full ${
              !expanded && isLongUrl 
                ? 'max-h-20 overflow-hidden' 
                : 'overflow-x-auto'
            }`}
          >
            <code 
              className="text-sm text-gray-800 font-mono url-text-container"
            >
              {url}
            </code>
          </div>
          
          {/* Gradient overlay for collapsed state */}
          {!expanded && isLongUrl && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none">
            </div>
          )}
        </div>
        
        {/* Expand/collapse control */}
        {isLongUrl && (
          <button 
            onClick={toggleExpand}
            className="w-full text-xs text-primary-600 hover:text-primary-800 bg-gray-50 py-1.5 flex items-center justify-center border-t border-gray-200 hover:bg-gray-100 transition-colors"
            type="button"
          >
            {expanded ? (
              <>
                <FiChevronUp className="mr-1" size={14} /> 
                Show less
              </>
            ) : (
              <>
                <FiChevronDown className="mr-1" size={14} />
                Show full URL
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default UrlDisplay; 