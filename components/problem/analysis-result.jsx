'use client';

export function AnalysisResult({ analysis, title }) {
    return (
        <div className="space-y-6">
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6">
                <div className="text-green-300 font-bold text-lg mb-2">✅ הנתחנו את הבעיה שלך!</div>
                <p className="text-green-200 text-sm">
                    סוג השירות המומלץ: <strong>{analysis.serviceTypes?.[0] || 'טכנאי כללי'}</strong>
                </p>
            </div>

            <div>
                <h3 className="text-2xl font-bold mb-4">🎯 סוגי שירותים שאנחנו ממליצים</h3>
                <div className="space-y-3">
                    {analysis.serviceTypes?.map((service, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-lg border ${
                                idx === 0
                                    ? 'bg-green-500/20 border-green-500/50'
                                    : 'bg-white/5 border-white/10'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg">🔧 {service}</h4>
                                <div className="text-xs bg-blue-600/30 px-2 py-1 rounded">
                                    דיוק: {analysis.relevanceScore}%
                                </div>
                            </div>
                            <p className="opacity-80 text-sm">
                                {idx === 0 ? 'זה בדיוק מה שאתה צריך!' : 'אפשרות שנייה'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold mb-4">❓ מה כדאי לך לבדוק לפני שאתה מזמין שירות?</h3>
                <div className="bg-yellow-500/20 border-l-4 border-yellow-500 rounded-lg p-6">
                    <div className="font-bold text-yellow-300 mb-4">✅ רשימת בדיקה חשובה</div>
                    <div className="space-y-3">
                        {analysis.checklist?.map((item, idx) => (
                            <label key={idx} className="flex items-start cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-5 h-5 accent-yellow-400"
                                />
                                <span className="mr-3 text-white/90 group-hover:text-white">
                                    {item}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {analysis.tips && analysis.tips.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold mb-4">💡 טיפים חכמים</h3>
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
                        <ul className="space-y-3">
                            {analysis.tips.map((tip, idx) => (
                                <li key={idx} className="flex items-start">
                                    <span className="text-blue-300 font-bold mr-3">→</span>
                                    <span className="text-white/90">{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {analysis.estimatedCost && (
                <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                    <p className="text-purple-300">
                        <strong>💵 עלות משוערת:</strong> {analysis.estimatedCost}
                    </p>
                </div>
            )}

            {analysis.isUrgent && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-300 font-bold">
                        ⚠️ זו בעיה דחופה! מומלץ להתחיל בחיפוש טכנאי בהקדם.
                    </p>
                </div>
            )}
        </div>
    );
}
