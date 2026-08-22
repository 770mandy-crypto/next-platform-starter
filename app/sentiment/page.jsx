import SentimentDashboard from '@/components/sentiment-dashboard';

export const metadata = {
  title: 'Crypto Sentiment Analyzer',
  description: 'Real-time sentiment analysis from Twitter, Reddit & Discord',
};

export default function SentimentPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <SentimentDashboard />
      </div>
    </main>
  );
}
