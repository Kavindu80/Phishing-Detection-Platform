import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  title, 
  subtitle, 
  footer,
  noPadding = false,
  border = false,
  hover = false,
  ...props 
}) => {
  return (
    <div 
      className={`
        bg-white rounded-lg 
        ${border ? 'border border-gray-200' : 'shadow-card'} 
        ${hover ? 'hover:shadow-card-hover transition-shadow duration-200' : ''}
        ${className}
      `}
      {...props}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 