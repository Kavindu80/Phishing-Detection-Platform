import React from 'react';
import { motion } from 'framer-motion';
import Card from '../common/Card';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  gradient,
  isLoading = false,
  onClick,
  className = ""
}) => {
  const gradientClasses = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600',
    danger: 'bg-gradient-to-br from-danger-500 to-danger-600',
    success: 'bg-gradient-to-br from-success-500 to-success-600',
    warning: 'bg-gradient-to-br from-warning-500 to-warning-600',
    info: 'bg-gradient-to-br from-blue-500 to-blue-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={`${className} h-full`}
    >
      <Card 
        className={`${gradientClasses[gradient]} text-white cursor-pointer transition-all duration-300 hover:shadow-xl h-full flex flex-col justify-between min-h-[140px]`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-4 p-1">
          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm flex-shrink-0">
            {isLoading ? (
              <div className="h-6 w-6 bg-white/30 rounded animate-pulse"></div>
            ) : (
              <Icon className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold tracking-wide uppercase opacity-90">
              {title}
            </p>
            {isLoading ? (
              <div className="h-8 w-20 bg-white/30 rounded animate-pulse mt-2"></div>
            ) : (
              <h3 className="text-3xl font-bold text-white mt-1 leading-tight">
                {value}
              </h3>
            )}
          </div>
        </div>
        {change && !isLoading && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-white/90 text-xs font-medium">
              {change}
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default StatCard; 