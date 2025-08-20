import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  to,
  href,
  onClick,
  isLoading = false,
  fullWidth = false,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-button shadow-button hover:shadow-button-hover transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white focus:ring-primary-500 disabled:bg-gray-300 disabled:text-gray-500 border border-primary-600 hover:border-primary-700 disabled:border-gray-300',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 hover:text-white focus:ring-secondary-500 disabled:bg-gray-300 disabled:text-gray-500 border border-secondary-600 hover:border-secondary-700 disabled:border-gray-300',
    accent: 'bg-accent-600 text-white hover:bg-accent-700 hover:text-white focus:ring-accent-500 disabled:bg-gray-300 disabled:text-gray-500 border border-accent-600 hover:border-accent-700 disabled:border-gray-300',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 hover:text-white focus:ring-danger-500 disabled:bg-gray-300 disabled:text-gray-500 border border-danger-600 hover:border-danger-700 disabled:border-gray-300',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 hover:text-white focus:ring-warning-500 disabled:bg-gray-300 disabled:text-gray-500 border border-warning-600 hover:border-warning-700 disabled:border-gray-300',
    success: 'bg-success-600 text-white hover:bg-success-700 hover:text-white focus:ring-success-500 disabled:bg-gray-300 disabled:text-gray-500 border border-success-600 hover:border-success-700 disabled:border-gray-300',
    outline: 'border-2 border-primary-600 bg-white text-primary-600 hover:bg-primary-50 hover:border-primary-700 hover:text-primary-700 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-300',
    ghost: 'bg-transparent text-primary-600 hover:bg-primary-50 hover:text-primary-700 focus:ring-primary-500 disabled:text-gray-400 border border-transparent',
  };
  
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm font-semibold',
    lg: 'px-8 py-3 text-base font-semibold',
    xl: 'px-10 py-4 text-lg font-semibold',
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`;
  
  const content = (
    <>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </>
  );
  
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button; 