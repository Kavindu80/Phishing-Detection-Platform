import { FiGlobe, FiRotateCw, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import Card from '../common/Card';

const LanguageInfo = ({ languageInfo, className = '' }) => {
  if (!languageInfo) return null;

  const {
    detectedLanguage,
    languageName,
    translationUsed,
    sourceLanguage,
    translationConfidence,
    translationError
  } = languageInfo;

  return (
    <Card className={`${className}`}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <FiGlobe className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-900">Language Information</h3>
        </div>

        <div className="space-y-2 text-sm">
          {/* Detected Language */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Detected Language:</span>
            <div className="flex items-center space-x-1">
              <span className="font-medium text-gray-900">
                {languageName || 'Unknown'}
              </span>
              {detectedLanguage && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                  {detectedLanguage.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Translation Status */}
          {translationUsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Translation:</span>
                <div className="flex items-center space-x-1 text-green-600">
                  <FiCheckCircle className="h-3 w-3" />
                  <span className="text-xs">Used</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Source Language:</span>
                <span className="font-medium text-gray-900">
                  {sourceLanguage?.toUpperCase() || 'Unknown'}
                </span>
              </div>

              {translationConfidence && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Translation Quality:</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-12 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full" 
                        style={{ width: `${translationConfidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(translationConfidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-start space-x-2">
                  <FiRotateCw className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    This email was automatically translated from {languageName} to English for analysis.
                    The ML model processed the translated version.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Translation:</span>
              <span className="text-xs text-gray-500">Not needed</span>
            </div>
          )}

          {/* Translation Error */}
          {translationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <div className="flex items-start space-x-2">
                <FiAlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-red-700 font-medium">Translation Error</p>
                  <p className="text-xs text-red-600 mt-1">{translationError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LanguageInfo;