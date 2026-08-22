'use client';

import { useEffect, useState } from 'react';

export default function SentimentChart({ coin }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Generate mock historical data
    const data = generateHistoricalData(24);
    setChartData(data);
  }, [coin]);

  if (chartData.length === 0) return null;

  const maxValue = Math.max(...chartData.map((d) => d.positive));
  const minValue = Math.min(...chartData.map((d) => d.negative));

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-6">Sentiment History (24h)</h2>

      <div className="overflow-x-auto">
        <div className="flex items-end justify-between gap-1 h-64 min-w-max p-4 bg-gray-50 rounded-lg">
          {chartData.map((data, idx) => {
            const positiveHeight = (data.positive / 100) * 200;
            const negativeHeight = (data.negative / 100) * 200;

            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5 items-end h-48">
                  {/* Positive bar */}
                  <div
                    className="w-1 bg-green-500 rounded-t transition-all"
                    style={{ height: `${positiveHeight}px` }}
                    title={`+${Math.round(data.positive)}%`}
                  />
                  {/* Neutral bar */}
                  <div
                    className="w-1 bg-gray-400 rounded-t transition-all"
                    style={{ height: `${(data.neutral / 100) * 200}px` }}
                    title={`~${Math.round(data.neutral)}%`}
                  />
                  {/* Negative bar */}
                  <div
                    className="w-1 bg-red-500 rounded-t transition-all"
                    style={{ height: `${negativeHeight}px` }}
                    title={`-${Math.round(data.negative)}%`}
                  />
                </div>
                <span className="text-xs text-gray-600 mt-2">
                  {data.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-sm">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded" />
          <span className="text-sm">Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-sm">Negative</span>
        </div>
      </div>
    </div>
  );
}

function generateHistoricalData(hours) {
  const data = [];
  for (let i = 0; i < hours; i++) {
    const hour = new Date();
    hour.setHours(hour.getHours() - (hours - i - 1));

    const positive = 30 + Math.random() * 40;
    const negative = 15 + Math.random() * 25;
    const neutral = 100 - positive - negative;

    data.push({
      time: hour.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      positive,
      neutral,
      negative,
    });
  }
  return data;
}
