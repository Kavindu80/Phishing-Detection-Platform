import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
  showIcon = true,
  ...props
}) => {
  const types = {
    info: {
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      textColor: 'text-primary-800',
      icon: <FiInfo className="h-5 w-5 text-primary-500" />,
    },
    success: {
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      textColor: 'text-success-800',
      icon: <FiCheckCircle className="h-5 w-5 text-success-500" />,
    },
    warning: {
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      textColor: 'text-warning-800',
      icon: <FiAlertTriangle className="h-5 w-5 text-warning-500" />,
    },
    danger: {
      bgColor: 'bg-danger-50',
      borderColor: 'border-danger-200',
      textColor: 'text-danger-800',
      icon: <FiAlertCircle className="h-5 w-5 text-danger-500" />,
    },
  };

  const { bgColor, borderColor, textColor, icon } = types[type] || types.info;

  return (
    <div
      className={`rounded-md border p-4 ${bgColor} ${borderColor} ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex">
        {showIcon && <div className="flex-shrink-0">{icon}</div>}
        <div className={`${showIcon ? 'ml-3' : ''} flex-1`}>
          {title && <h3 className={`text-sm font-medium ${textColor}`}>{title}</h3>}
          {message && (
            <div className={`${title ? 'mt-2' : ''} text-sm ${textColor}`}>
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-50 focus:ring-${type}-500`}
              >
                <span className="sr-only">Dismiss</span>
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert; 