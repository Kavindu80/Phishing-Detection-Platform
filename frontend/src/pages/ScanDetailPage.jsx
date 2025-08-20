import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import apiService from '../services/api';

const ScanDetailPage = () => {
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await apiService.getScanDetail(scanId);
        setScan(data);
        setError('');
      } catch (e) {
        console.error('Failed to load scan detail', e);
        setError('Failed to load scan detail');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [scanId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scan Detail</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm" to="/analytics?tab=history">Back to History</Button>
          <Button variant="outline" size="sm" to="/dashboard">Back to Dashboard</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading scan...</span>
        </div>
      ) : error ? (
        <div className="bg-danger-50 text-danger-700 p-4 rounded-md border border-danger-200">{error}</div>
      ) : !scan ? (
        <div className="text-gray-600">No data.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Email Details">
              <div className="space-y-2 text-sm text-gray-700">
                <div><span className="font-medium">Subject:</span> {scan.subject || 'No subject'}</div>
                <div><span className="font-medium">From:</span> {scan.sender || 'Unknown'}</div>
                <div><span className="font-medium">Date:</span> {scan.date ? new Date(scan.date).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Email Text</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words break-all text-sm">
                    {scan.email_text || 'No content available.'}
                  </pre>
                </div>
              </div>
            </Card>

            {Array.isArray(scan.suspicious_elements) && scan.suspicious_elements.length > 0 && (
              <Card title="Suspicious Elements">
                <ul className="space-y-2 text-sm">
                  {scan.suspicious_elements.map((el, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{el.type}</span>
                      <span className="font-mono bg-gray-50 px-1 rounded border border-gray-200 max-w-full break-all overflow-hidden text-ellipsis">
                        {el.value}
                      </span>
                      <span className="text-gray-600 break-words">{el.reason}</span>
                    </li>)
                  )}
                </ul>
              </Card>
            )}

            {scan.explanation && (
              <Card title="Analysis">
                <p className="text-gray-700 text-sm break-words">{scan.explanation}</p>
              </Card>
            )}

            {scan.recommended_action && (
              <Card title="Recommended Action">
                <p className="text-gray-700 text-sm break-words">{scan.recommended_action}</p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card title="Verdict">
              <div className="text-sm text-gray-700 space-y-1">
                <div><span className="font-medium">Verdict:</span> <span className="capitalize">{scan.verdict}</span></div>
                <div><span className="font-medium">Confidence:</span> {(() => {
                  const c = scan.confidence;
                  if (typeof c === 'number') {
                    return c <= 1 ? `${Math.round(c * 100)}%` : `${Math.round(c)}%`;
                  }
                  const parsed = parseFloat(c);
                  if (isNaN(parsed)) return 'N/A';
                  return parsed <= 1 ? `${Math.round(parsed * 100)}%` : `${Math.round(parsed)}%`;
                })()}
                </div>
                {scan.language && (
                  <div><span className="font-medium">Language:</span> {scan.language}</div>
                )}
                {typeof scan.feedback === 'boolean' && (
                  <div><span className="font-medium">Feedback:</span> {scan.feedback ? 'Helpful' : 'Not helpful'}</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanDetailPage; 