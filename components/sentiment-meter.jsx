export default function SentimentMeter({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-gray-600 mb-3 font-semibold">{label}</p>
      <div className="mb-4">
        <div className="text-3xl font-bold">{Math.round(value)}%</div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
