import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  areaElementClasses,
  LineChart,
  lineElementClasses,
} from '@mui/x-charts/LineChart';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Language code to name mapper (extend as needed)
const languageNameMap = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'si': 'Sinhala',
  'zh': 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ru': 'Russian',
  'ar': 'Arabic',
  'pt': 'Portuguese',
  'it': 'Italian',
  'nl': 'Dutch',
  'tr': 'Turkish',
  'none': 'Unknown'
};

function getLanguageDisplay(code) {
  const normalized = (code || '').toString();
  const name = languageNameMap[normalized] || languageNameMap[normalized.split('-')[0]] || normalized;
  // Show "Name (code)"
  return `${name} (${normalized})`;
}

export const VerdictBarChart = ({ data }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Check if data exists
      if (!data || !data.verdictDistribution) {
        // Create default data if none exists
        setChartData({
          xAxis: [{ scaleType: 'band', data: ['Safe', 'Suspicious', 'Phishing'] }],
          series: [
            {
              data: [33, 33, 34], // Default equal distribution
              label: 'Scan Results (%)',
              color: '#22c55e', // Green for mixed results
            },
          ],
        });
      } else {
        // Use the real data
        setChartData({
          xAxis: [{ scaleType: 'band', data: ['Safe', 'Suspicious', 'Phishing'] }],
          series: [
            {
              data: [
                data.verdictDistribution.safe || 0,
                data.verdictDistribution.suspicious || 0,
                data.verdictDistribution.phishing || 0,
              ],
              label: 'Scan Results (%)',
              color: '#6366f1', // Indigo color
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error preparing verdict chart data:', error);
      // Set default data on error
      setChartData({
        xAxis: [{ scaleType: 'band', data: ['Safe', 'Suspicious', 'Phishing'] }],
        series: [
          {
            data: [33, 33, 34], // Default equal distribution
            label: 'Scan Results (%)',
            color: '#6366f1',
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const barLabel = (item, context) => {
    if ((item.value ?? 0) > 50) {
      return 'High';
    }
    return context.bar.height < 40 ? null : `${item.value}%`;
  };

  return (
    <div className="w-full h-64">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      ) : !chartData ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BarChart
            xAxis={chartData.xAxis}
            series={chartData.series}
            barLabel={barLabel}
            height={240}
            margin={{ left: 50, right: 20, top: 20, bottom: 60 }}
            sx={{
              '& .MuiChartsAxis-tickLabel': {
                fontSize: '12px',
                fill: '#6b7280',
              },
              '& .MuiChartsAxis-label': {
                fontSize: '14px',
                fill: '#374151',
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export const AccuracyLineChart = ({ data }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Check if data exists
      if (!data || !data.accuracyTrend || data.accuracyTrend.length === 0) {
        setChartData(null);
      } else {
        // Transform data for MUI LineChart
        const transformedData = data.accuracyTrend.map((item, index) => {
          let formattedDate;
          try {
            const parts = item.date.split('-');
            // Hourly bucket YYYY-MM-DD-HH
            if (parts.length > 3) {
              const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:00:00`;
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                formattedDate = d;
              } else {
                formattedDate = new Date(2024, 0, index + 1); // Fallback
              }
            } else {
              // Daily bucket YYYY-MM-DD
              const d = new Date(item.date);
              if (isNaN(d.getTime())) {
                formattedDate = new Date(2024, 0, index + 1); // Fallback
              } else {
                formattedDate = d;
              }
            }
          } catch (e) {
            console.error('Error parsing date:', item.date, e);
            formattedDate = new Date(2024, 0, index + 1); // Fallback
          }
          
          return {
            date: formattedDate,
            accuracy: item.accuracy,
          };
        });
        
        setChartData(transformedData);
      }
    } catch (error) {
      console.error('Error preparing accuracy trend chart data:', error);
      // Set default data on error
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const valueFormatter = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <div className="w-full h-64">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      ) : !chartData ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <LineChart
            dataset={chartData}
            sx={{
              [`& .${lineElementClasses.root}`]: {
                strokeWidth: 3,
              },
              [`& .${areaElementClasses.root}`]: {
                fill: "url('#accuracyGradient')",
                filter: 'none',
              },
              '& .MuiChartsAxis-tickLabel': {
                fontSize: '11px',
                fill: '#6b7280',
              },
              '& .MuiChartsAxis-label': {
                fontSize: '13px',
                fill: '#374151',
              },
            }}
            xAxis={[
              {
                dataKey: 'date',
                scaleType: 'time',
                valueFormatter,
              },
            ]}
            yAxis={[
              {
                width: 60,
                min: 80,
                max: 100,
                valueFormatter: (value) => `${value}%`,
              },
            ]}
            series={[
              {
                dataKey: 'accuracy',
                area: true,
                showMark: true,
                curve: 'natural',
                color: '#6366f1',
              },
            ]}
            height={240}
            margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
          >
            <defs>
              <linearGradient id="accuracyGradient" gradientTransform="rotate(90)">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </LineChart>
        </div>
      )}
    </div>
  );
};

export const LanguagePieChart = ({ data }) => {
  const [pieData, setPieData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    try {
      if (data?.languageDistribution) {
        const languageDistribution = data.languageDistribution;
        const languageCodes = Object.keys(languageDistribution);
        const values = Object.values(languageDistribution);
        
        // Generate colors based on number of languages
        const generateColors = (count) => {
          const baseColors = [
            '#3b82f6', // Blue
            '#8b5cf6', // Purple
            '#ec4899', // Pink
            '#14b8a6', // Teal
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#10b981', // Emerald
            '#d946ef', // Fuchsia
            '#06b6d4', // Cyan
            '#6b7280', // Gray
          ];
          
          // If we have more languages than base colors, we'll reuse colors
          return Array(count).fill().map((_, i) => baseColors[i % baseColors.length]);
        };
        
        const colors = generateColors(languageCodes.length);
        
        // Transform data for MUI PieChart
        const transformedData = languageCodes.map((code, index) => ({
          id: index,
          value: values[index],
          label: getLanguageDisplay(code),
          color: colors[index],
        }));
        
        setPieData(transformedData);
      } else {
        setPieData([]);
      }
    } catch (error) {
      console.error('Error preparing language distribution data:', error);
      setPieData([]);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  // Correct valueFormatter signature for MUI X Charts (receives an object)
  const valueFormatter = (item) => `${item.value}%`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading chart data...</p>
      </div>
    );
  }

  if (!pieData || pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No language data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex items-center justify-center">
      <PieChart
        series={[
          {
            data: pieData,
            arcLabel: (item) => `${item.value}%`,
            arcLabelMinAngle: 0,
            arcLabelRadius: '60%',
            valueFormatter,
          },
        ]}
        sx={{
          [`& .${pieArcLabelClasses.root}`]: {
            fontWeight: 'bold',
            fontSize: '12px',
            fill: 'white',
          },
        }}
        width={280}
        height={200}
        margin={{ top: 20, bottom: 20, left: 20, right: 20 }}
      />
    </div>
  );
};

export const ScansTimeChart = ({ data }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // Check if data exists
      if (!data || !data.scansOverTime || data.scansOverTime.length === 0) {
        setChartData(null);
      } else {
        // Real data processing
        const labels = data.scansOverTime.map(item => {
          try {
            const parts = (item.date || '').split('-');
            // Hourly bucket YYYY-MM-DD-HH
            if (parts.length > 3) {
              const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:00:00`;
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
              }
              return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}h`;
            }
            // Weekly bucket YYYY-WW
            if (parts.length === 2 && parts[1].length <= 2) {
              return `W${parts[1]} ${parts[0]}`;
            }
            // Daily bucket
            const d = new Date(item.date);
            if (isNaN(d.getTime())) return item.date;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch {
            // Return the original date string if parsing fails
            return item.date;
          }
        });
        
        setChartData({
          xAxis: [{ scaleType: 'band', data: labels }],
          series: [
            {
              data: data.scansOverTime.map(item => item.safe || 0),
              label: 'Safe',
              stack: 'total',
              color: '#22c55e', // Green
            },
            {
              data: data.scansOverTime.map(item => item.suspicious || 0),
              label: 'Suspicious',
              stack: 'total',
              color: '#eab308', // Yellow
            },
            {
              data: data.scansOverTime.map(item => item.phishing || 0),
              label: 'Phishing',
              stack: 'total',
              color: '#dc2626', // Red
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error preparing scans over time chart data:', error);
      // Default chart on error
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const barLabel = (item, context) => {
    if ((item.value ?? 0) > 5) {
      return item.value?.toString();
    }
    return context.bar.height < 20 ? null : item.value?.toString();
  };

  return (
    <div className="w-full h-64">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      ) : !chartData ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <BarChart
            xAxis={chartData.xAxis}
            series={chartData.series}
            barLabel={barLabel}
            height={240}
            margin={{ left: 50, right: 20, top: 20, bottom: 60 }}
            sx={{
              '& .MuiChartsAxis-tickLabel': {
                fontSize: '11px',
                fill: '#6b7280',
              },
              '& .MuiChartsAxis-label': {
                fontSize: '13px',
                fill: '#374151',
              },
              '& .MuiChartsLegend-series': {
                fontSize: '12px',
              },
            }}
          />
        </div>
      )}
    </div>
  );
}; 