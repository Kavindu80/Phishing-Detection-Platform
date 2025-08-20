import React from 'react';

const TopPhishingDomains = ({ data }) => {
  const domains = data?.topPhishingDomains || [];
  
  if (!domains.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No phishing domains detected
      </div>
    );
  }
  
  return (
    <ul className="divide-y divide-gray-200">
      {domains.map((item, index) => (
        <li key={index} className="py-3 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-gray-800 font-mono text-sm">{item.domain}</span>
          </div>
          <div className="flex items-center">
            <span className="bg-danger-100 text-danger-800 text-xs px-2 py-1 rounded">
              {item.count} detections
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TopPhishingDomains; 