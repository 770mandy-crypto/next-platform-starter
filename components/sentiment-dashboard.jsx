'use client';

import { useState, useEffect } from 'react';
import SentimentChart from './sentiment-chart';
import SentimentMeter from './sentiment-meter';

export default function SentimentDashboard() {
  const [coin, setCoin] = useState('bitcoin');
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const coins = [
    'bitcoin',
    'ethereum',
    'dogecoin',
    'solana',
    'cardano',
    'ripple',
  ];

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [coin]);

  async function fetchSentiment() {
    try {
      setLoading(true);
      const res = await fetch(`/api/sentiment?coin=${coin}`);
      const data = await res.json();
      setSentiment(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sentiment data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">Error: {error}</div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          🎯 Crypto Sentiment Analyzer
        </h1>
        <p className="text-gray-600">
          Real-time sentiment analysis from Twitter, Reddit & Discord
        </p>
      </div>

      {/* Coin Selector */}
      <div className="mb-8">
        <label className="block text-sm font-semibold mb-3">Select Coin</label>
        <div className="flex flex-wrap gap-2">
          {coins.map((c) => (
            <button
              key={c}
              onClick={() => setCoin(c)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                coin === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading sentiment data...</p>
        </div>
      ) : sentiment ? (
        <div className="space-y-8">
          {/* Overall Sentiment Score */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm opacity-90">Sentiment Score</p>
                <p className="text-4xl font-bold">
                  {sentiment.overall.score > 0 ? '+' : ''}
                  {sentiment.overall.score}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-90">Trend</p>
                <p className="text-3xl font-bold">{sentiment.overall.trend}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Timestamp</p>
                <p className="text-sm">
                  {new Date(sentiment.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Sentiment Meters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SentimentMeter
              label="Positive"
              value={sentiment.overall.positive}
              color="bg-green-500"
            />
            <SentimentMeter
              label="Neutral"
              value={sentiment.overall.neutral}
              color="bg-gray-500"
            />
            <SentimentMeter
              label="Negative"
              value={sentiment.overall.negative}
              color="bg-red-500"
            />
          </div>

          {/* Source Breakdown */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-6">Sentiment by Source</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(sentiment.sources).map(([source, data]) => (
                <div key={source} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 capitalize">{source}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Positive:</span>
                      <span className="font-semibold">
                        {Math.round(data.positive)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Neutral:</span>
                      <span className="font-semibold">
                        {Math.round(data.neutral)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Negative:</span>
                      <span className="font-semibold">
                        {Math.round(data.negative)}%
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <span className="text-gray-600">Volume:</span>
                      <span className="font-semibold ml-2">{data.volume}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Hashtags */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Trending Hashtags</h2>
            <div className="space-y-3">
              {sentiment.topHashtags.map((ht, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-semibold">{ht.tag}</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {ht.volume.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Influencers */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Top Influencers</h2>
            <div className="space-y-3">
              {sentiment.topInfluencers.map((inf, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{inf.name}</p>
                    <p className="text-sm text-gray-600">
                      {inf.followers.toLocaleString()} followers
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      inf.sentiment === 'positive'
                        ? 'bg-green-100 text-green-800'
                        : inf.sentiment === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {inf.sentiment}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <SentimentChart coin={coin} />
        </div>
      ) : null}
    </div>
  );
}
