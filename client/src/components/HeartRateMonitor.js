import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HeartRateMonitor = ({ currentHeartRate = 72 }) => {
  const [heartRateData, setHeartRateData] = useState([]);
  const [labels, setLabels] = useState([]);
  const [displayedHeartRate, setDisplayedHeartRate] = useState(currentHeartRate);
  const lastUpdateTimeRef = useRef(Date.now());
  const dataUpdateIntervalRef = useRef(null);
  const wavePositionRef = useRef(0);

  // Generate a complete ECG cycle
  const generateECGCycle = (baseRate) => {
    // Create a complete ECG cycle with proper timing
    const cycle = [];
    const variability = Math.random() * 3; // Reduced randomness for less flickering

    // Baseline (flat part)
    for (let i = 0; i < 10; i++) {
      cycle.push(baseRate - 15 + (Math.random() * 2 - 1)); // Small random noise
    }

    // P wave (small bump)
    cycle.push(baseRate - 12 + variability);
    cycle.push(baseRate - 8 + variability);
    cycle.push(baseRate - 5 + variability);

    // PR segment (small flat part)
    cycle.push(baseRate - 10 + (Math.random() * 2 - 1));
    cycle.push(baseRate - 10 + (Math.random() * 2 - 1));

    // QRS complex (big spike)
    cycle.push(baseRate - 15 + variability); // Q
    cycle.push(baseRate + 40 + variability); // R peak
    cycle.push(baseRate - 25 + variability); // S dip

    // ST segment
    cycle.push(baseRate - 10 + (Math.random() * 2 - 1));
    cycle.push(baseRate - 8 + (Math.random() * 2 - 1));

    // T wave (medium bump)
    cycle.push(baseRate - 5 + variability);
    cycle.push(baseRate + 10 + variability);
    cycle.push(baseRate + 5 + variability);
    cycle.push(baseRate - 5 + variability);

    // Return to baseline
    for (let i = 0; i < 5; i++) {
      cycle.push(baseRate - 15 + (Math.random() * 2 - 1)); // Small random noise
    }

    return cycle;
  };

  // Initialize data
  useEffect(() => {
    // Generate initial data
    const initialData = [];
    const initialLabels = [];

    // Generate 3 complete cycles for initial data
    for (let i = 0; i < 3; i++) {
      const cycle = generateECGCycle(currentHeartRate);
      initialData.push(...cycle);

      // Generate labels
      for (let j = 0; j < cycle.length; j++) {
        initialLabels.push(j.toString());
      }
    }

    setHeartRateData(initialData);
    setLabels(initialLabels);

    // Set up interval for data updates (less frequent to reduce flickering)
    dataUpdateIntervalRef.current = setInterval(() => {
      // Update heart rate with small random changes
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 2000) { // Update heart rate every 2 seconds
        const newHeartRate = Math.floor(
          displayedHeartRate + (Math.random() * 10 - 5) // Random change between -5 and +5
        );
        // Keep heart rate within reasonable bounds
        setDisplayedHeartRate(Math.max(60, Math.min(100, newHeartRate)));
        lastUpdateTimeRef.current = now;
      }

      // Add new data points
      setHeartRateData(prevData => {
        const newCycle = generateECGCycle(displayedHeartRate);
        const newData = [...prevData.slice(newCycle.length), ...newCycle];
        return newData;
      });

      // Update wave position for decorative waves
      wavePositionRef.current = (wavePositionRef.current + 1) % 100;

    }, 500); // Update every 500ms for smoother animation

    return () => {
      if (dataUpdateIntervalRef.current) {
        clearInterval(dataUpdateIntervalRef.current);
      }
    };
  }, []);

  // Update chart data with current values
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: heartRateData,
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointRadius: 0, // Hide points for smoother line
        tension: 0.2, // Reduced curve for more realistic ECG
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Disable animation for smoother real-time updates
    },
    scales: {
      x: {
        display: false, // Hide x-axis for cleaner look
        type: 'category',
        ticks: {
          maxTicksLimit: 10, // Limit number of ticks to reduce flickering
        }
      },
      y: {
        min: displayedHeartRate - 50, // Wider range for better visualization
        max: displayedHeartRate + 50,
        grid: {
          color: 'rgba(200, 200, 200, 0.1)', // Lighter grid
          drawBorder: false,
        },
        ticks: {
          display: false, // Hide y-axis ticks for cleaner look
        }
      },
    },
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      tooltip: {
        enabled: false, // Disable tooltips for better performance
      },
    },
    elements: {
      line: {
        tension: 0.2, // Smoother line
        borderJoinStyle: 'round',
      },
      point: {
        radius: 0, // Hide points completely
      }
    },
  };

  return (
    <div className="heart-rate-monitor">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-red-500 mr-2 animate-heart-beat"
            style={{ animationDuration: `${60/displayedHeartRate}s` }} // Animation speed based on heart rate
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm text-gray-600">Heart Rate</p>
            <p className="text-lg font-bold text-red-600">{displayedHeartRate} bpm</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-full animate-pulse-slow">Real-time</div>
      </div>

      <div className="h-32 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg shadow-inner p-2 relative overflow-hidden">
        {/* Decorative wave elements that move with heart rate */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {/* Create multiple wave lines with different speeds based on heart rate */}
          <div
            className="absolute h-0.5 bg-red-400"
            style={{
              top: '30%',
              left: 0,
              right: 0,
              transform: `translateX(${-wavePositionRef.current * (displayedHeartRate/60)}%)`,
              transition: 'transform 0.5s linear'
            }}
          >
            <div className="absolute inset-0 w-[200%] h-full" style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 10%, rgba(239, 68, 68, 0.7) 50%, transparent 90%, transparent 100%)',
              backgroundSize: '200px 100%',
              backgroundRepeat: 'repeat-x'
            }}></div>
          </div>

          <div
            className="absolute h-0.5 bg-red-400"
            style={{
              top: '50%',
              left: 0,
              right: 0,
              transform: `translateX(${-wavePositionRef.current * (displayedHeartRate/50)}%)`,
              transition: 'transform 0.5s linear'
            }}
          >
            <div className="absolute inset-0 w-[200%] h-full" style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 10%, rgba(239, 68, 68, 0.7) 50%, transparent 90%, transparent 100%)',
              backgroundSize: '150px 100%',
              backgroundRepeat: 'repeat-x'
            }}></div>
          </div>

          <div
            className="absolute h-0.5 bg-red-400"
            style={{
              top: '70%',
              left: 0,
              right: 0,
              transform: `translateX(${-wavePositionRef.current * (displayedHeartRate/70)}%)`,
              transition: 'transform 0.5s linear'
            }}
          >
            <div className="absolute inset-0 w-[200%] h-full" style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 10%, rgba(239, 68, 68, 0.7) 50%, transparent 90%, transparent 100%)',
              backgroundSize: '180px 100%',
              backgroundRepeat: 'repeat-x'
            }}></div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative z-10 h-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default HeartRateMonitor;
