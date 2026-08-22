export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin') || 'bitcoin';
  const source = searchParams.get('source') || 'all';

  // Mock sentiment data - in production this would connect to Twitter API, Reddit API, etc.
  const sentimentData = generateMockSentiment(coin);

  return Response.json(sentimentData);
}

export async function POST(request) {
  const { coin, analysis } = await request.json();

  // Store sentiment history in Netlify Blobs
  const { getStore } = await import('@netlify/blobs');
  const store = getStore('sentiment');

  const timestamp = new Date().toISOString();
  const key = `${coin}-${timestamp}`;

  await store.set(key, JSON.stringify({ coin, analysis, timestamp }));

  return Response.json({ success: true, key });
}

function generateMockSentiment(coin) {
  const sources = {
    twitter: {
      positive: Math.random() * 100,
      negative: Math.random() * 100,
      neutral: Math.random() * 100,
      volume: Math.floor(Math.random() * 10000) + 1000,
      trend: Math.random() > 0.5 ? 'up' : 'down',
    },
    reddit: {
      positive: Math.random() * 100,
      negative: Math.random() * 100,
      neutral: Math.random() * 100,
      volume: Math.floor(Math.random() * 5000) + 500,
      trend: Math.random() > 0.5 ? 'up' : 'down',
    },
    discord: {
      positive: Math.random() * 100,
      negative: Math.random() * 100,
      neutral: Math.random() * 100,
      volume: Math.floor(Math.random() * 3000) + 300,
      trend: Math.random() > 0.5 ? 'up' : 'down',
    },
  };

  // Calculate overall sentiment
  const allPositive =
    (sources.twitter.positive +
      sources.reddit.positive +
      sources.discord.positive) /
    3;
  const allNegative =
    (sources.twitter.negative +
      sources.reddit.negative +
      sources.discord.negative) /
    3;
  const allNeutral =
    (sources.twitter.neutral +
      sources.reddit.neutral +
      sources.discord.neutral) /
    3;

  return {
    coin,
    timestamp: new Date().toISOString(),
    overall: {
      positive: Math.round(allPositive * 10) / 10,
      negative: Math.round(allNegative * 10) / 10,
      neutral: Math.round(allNeutral * 10) / 10,
      score: Math.round(((allPositive - allNegative) / 100) * 100), // -100 to +100
      trend:
        allPositive > allNegative ? '📈 Bullish' : '📉 Bearish',
    },
    sources,
    topHashtags: [
      { tag: `#${coin}`, volume: 8234 },
      { tag: '#crypto', volume: 5421 },
      { tag: '#trading', volume: 3891 },
      { tag: '#pump', volume: 2134 },
    ],
    topInfluencers: [
      { name: '@CryptoGuru', followers: 125000, sentiment: 'positive' },
      { name: '@BlockchainNews', followers: 89000, sentiment: 'neutral' },
      { name: '@TradingBot', followers: 45000, sentiment: 'positive' },
    ],
  };
}
