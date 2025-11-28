import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const HeartRateChart = ({ heartRateHistory, patientCondition }) => {
  const chartRef = useRef();

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.update('none');
    }
  }, [heartRateHistory]);

  const getHeartRateColor = (heartRate) => {
    if (heartRate < 60) return 'rgb(239, 68, 68)'; // Red for bradycardia
    if (heartRate > 100) return 'rgb(245, 158, 11)'; // Orange for tachycardia
    return 'rgb(34, 197, 94)'; // Green for normal
  };

  const data = {
    labels: heartRateHistory.slice(-15).map(reading => new Date(reading.timestamp)),
    datasets: [
      {
        label: 'Heart Rate (bpm)',
        data: heartRateHistory.slice(-15).map(reading => reading.heart_rate),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: heartRateHistory.slice(-15).map(reading => getHeartRateColor(reading.heart_rate)),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Real-time Heart Rate Monitoring',
        color: 'rgb(75, 85, 99)',
        font: {
          size: 14,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const heartRate = Math.round(context.parsed.y);
            return `Heart Rate: ${heartRate} bpm`;
          },
          afterLabel: function(context) {
            const heartRate = context.parsed.y;
            if (heartRate < 60) return '⚠️ Bradycardia';
            if (heartRate > 100) return '⚠️ Tachycardia';
            return '✅ Normal';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: false,
        min: 40,
        max: 180,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 11
          },
          stepSize: 20
        },
        title: {
          display: true,
          text: 'Heart Rate (bpm)',
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    }
  };

  // Heart rate zone backgrounds
  const plugins = [
    {
      id: 'heartRateZones',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        
        if (!chartArea) return;

        const yScale = chart.scales.y;
        
        // Normal zone (60-100 bpm) - light green
        const normalTop = yScale.getPixelForValue(100);
        const normalBottom = yScale.getPixelForValue(60);
        
        ctx.save();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fillRect(chartArea.left, normalTop, chartArea.right - chartArea.left, normalBottom - normalTop);
        
        // Bradycardia zone (<60 bpm) - light blue
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(chartArea.left, normalBottom, chartArea.right - chartArea.left, chartArea.bottom - normalBottom);
        
        // Tachycardia zone (>100 bpm) - light red
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, normalTop - chartArea.top);
        
        ctx.restore();
      }
    }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 rounded-2xl border border-gray-200 shadow-lg">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-pink-600 flex items-center gap-2">
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
          Real-time Heart Rate Monitor
          <div className="w-8 h-0.5 bg-pink-500 rounded-full"></div>
        </h3>
        {patientCondition && (
          <div className="bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
            <span className="text-sm font-bold text-purple-700">
              {patientCondition.condition} - {(patientCondition.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Chart Container */}
      <div className="h-80 bg-white rounded-xl p-3 shadow-inner border border-gray-100">
        <Line ref={chartRef} data={data} options={options} plugins={plugins} />
      </div>
      
      {/* Status Indicators */}
      {patientCondition && (
        <div className="mt-4 flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              patientCondition.abnormality ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`}></div>
            <span className="text-gray-700 font-medium">
              Data Source: CSV File
            </span>
            {patientCondition.current_file && (
              <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                {patientCondition.current_file}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Last Update: {new Date(patientCondition.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
      
      {/* Heart Rate Zones Legend */}
      <div className="mt-4 bg-gray-50 p-3 rounded-xl">
        <h4 className="text-sm font-bold text-gray-700 mb-2">Heart Rate Zones</h4>
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-green-400 rounded"></div>
            <span>Normal (60-100 bpm)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-red-400 rounded"></div>
            <span>Bradycardia (&lt;60 bpm)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-yellow-400 rounded"></div>
            <span>Tachycardia (&gt;100 bpm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeartRateChart;

const HeartRateChart = ({ heartRateHistory, patientCondition }) => {
  const chartRef = useRef();

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      // Update chart when new data comes in
      chart.update('none'); // No animation for real-time updates
    }
  }, [heartRateHistory]);

  const getHeartRateColor = (heartRate) => {
    if (heartRate < 60) return 'rgb(239, 68, 68)'; // Red for bradycardia
    if (heartRate > 100) return 'rgb(245, 158, 11)'; // Orange for tachycardia
    return 'rgb(34, 197, 94)'; // Green for normal
  };

  const data = {
    labels: heartRateHistory.slice(-15).map(reading => new Date(reading.timestamp)),
    datasets: [
      {
        label: 'Heart Rate (bpm)',
        data: heartRateHistory.slice(-15).map(reading => reading.heart_rate),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 4,
        pointBackgroundColor: heartRateHistory.slice(-15).map(reading => getHeartRateColor(reading.heart_rate)),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 8,
        pointHoverRadius: 12,
        pointHoverBackgroundColor: heartRateHistory.slice(-15).map(reading => getHeartRateColor(reading.heart_rate)),
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 4,
        tension: 0.4,
        fill: {
          target: 'origin',
          above: 'rgba(59, 130, 246, 0.2)',
        },
        segment: {
          borderColor: ctx => {
            const heartRate = ctx.p1.parsed.y;
            return getHeartRateColor(heartRate);
          },
        }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Real-time Heart Rate Monitoring',
        color: 'rgb(75, 85, 99)',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: function(context) {
            const heartRate = context.parsed.y;
            const limitedHistory = heartRateHistory.slice(-30);
            const abnormality = limitedHistory[context.dataIndex]?.abnormality;
            let label = `Heart Rate: ${heartRate} bpm`;
            if (abnormality) {
              label += ` (${abnormality.type})`;
            }
            return label;
          },
          afterLabel: function(context) {
            const limitedHistory = heartRateHistory.slice(-30);
            const reading = limitedHistory[context.dataIndex];
            if (reading?.abnormality) {
              return `⚠️ ${reading.abnormality.message}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            second: 'HH:mm:ss',
            minute: 'HH:mm',
          },
          tooltipFormat: 'PPpp'
        },
        title: {
          display: true,
          text: 'Time',
          color: 'rgb(75, 85, 99)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: 'rgb(75, 85, 99)',
          maxTicksLimit: 8,
        }
      },
      y: {
        beginAtZero: false,
        min: 40,
        max: 180,
        title: {
          display: true,
          text: 'Heart Rate (bpm)',
          color: 'rgb(75, 85, 99)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: 'rgb(75, 85, 99)',
          stepSize: 20,
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8,
      }
    },
    animation: {
      duration: 0, // Disable animations for real-time data
    }
  };

  // Add reference lines for normal heart rate range
  const plugins = [
    {
      id: 'heartRateZones',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const yScale = chart.scales.y;
        
        // Save the current state
        ctx.save();
        
        // Draw normal range background (60-100 bpm)
        const normalMin = yScale.getPixelForValue(60);
        const normalMax = yScale.getPixelForValue(100);
        
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fillRect(
          chartArea.left,
          normalMax,
          chartArea.right - chartArea.left,
          normalMin - normalMax
        );
        
        // Draw zone lines
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Normal range lines
        ctx.beginPath();
        ctx.moveTo(chartArea.left, normalMin);
        ctx.lineTo(chartArea.right, normalMin);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(chartArea.left, normalMax);
        ctx.lineTo(chartArea.right, normalMax);
        ctx.stroke();
        
        // Restore the state
        ctx.restore();
      }
    }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-8 rounded-3xl border-2 border-gray-200 shadow-2xl hover:shadow-3xl transition-all duration-500 backdrop-blur-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 flex items-center gap-3">
          <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
          Real-time Heart Rate Monitor
          <div className="w-12 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
        </h3>
        {patientCondition && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-xl border border-purple-200 shadow-md">
            <span className="text-sm font-bold text-purple-700">
              {patientCondition.condition} - {(patientCondition.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Chart Container */}
      <div className="h-[500px] bg-white rounded-2xl p-4 shadow-inner border border-gray-100">
        <Line ref={chartRef} data={data} options={options} plugins={plugins} />
      </div>
      
      {/* Current status indicator */}
      {patientCondition && (
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shadow-lg ${
                patientCondition.abnormality ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'
              }`}></div>
              <span className="text-gray-700 font-semibold">
                Data Source: {patientCondition.data_source === 'csv_file' ? 'CSV File' : 'Real-time'}
              </span>
              {patientCondition.current_file && (
                <span className="text-xs text-gray-600 bg-gray-200 px-3 py-1 rounded-full font-medium">
                  {patientCondition.current_file}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 bg-blue-100 px-3 py-1 rounded-full">
              Last Update: {new Date(patientCondition.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Legend */}
      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-2xl border border-gray-200 shadow-lg">
        <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">Heart Rate Zones</h4>
        <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-md">
            <div className="w-6 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm"></div>
            <span className="font-semibold">Normal (60-100 bpm)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-md">
            <div className="w-6 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-sm"></div>
            <span className="font-semibold">Bradycardia (&lt;60 bpm)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-md">
            <div className="w-6 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-sm"></div>
            <span className="font-semibold">Tachycardia (&gt;100 bpm)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeartRateChart;