import React from 'react';
import { formatConfidence } from '../../utils/formatUtils';

const TestDataDisplay = () => {
  const testData = [
    { name: 'Backend decimal (0.96)', value: 0.96 },
    { name: 'Backend decimal (0.01)', value: 0.01 },
    { name: 'Backend decimal (1.0)', value: 1.0 },
    { name: 'Old percentage (96)', value: 96 },
    { name: 'Old percentage (1)', value: 1 },
    { name: 'String decimal ("0.85")', value: "0.85" },
    { name: 'String percentage ("85")', value: "85" },
  ];

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h4 className="font-bold mb-3">Confidence Format Test</h4>
      <div className="space-y-2 text-sm">
        {testData.map((test, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-gray-600">{test.name}:</span>
            <span className="font-mono font-bold">{formatConfidence(test.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestDataDisplay; 