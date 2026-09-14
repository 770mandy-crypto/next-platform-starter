"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-700 text-lg">{message}</p>
      </div>
    </div>
  );
}

export default function VariationsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="טוען..." />}>
      <VariationsContent />
    </Suspense>
  );
}

function VariationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");

  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [campaignData, setCampaignData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // טען את נתוני הקמפיין מ-localStorage
        const saved = localStorage.getItem(`campaign_${campaignId}`);
        if (saved) {
          const data = JSON.parse(saved);
          setCampaignData(data);

          // צור גרסאות
          const res = await fetch("/api/adigo/campaign/variations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessName: data.businessName,
              businessCategory: data.businessCategory,
              targetAudience: data.targetAudience,
              offerDescription: data.offerDescription,
            }),
          });

          const result = await res.json();
          setVariations(result.variations || []);
        }
      } catch (error) {
        console.error("שגיאה בטעינת גרסאות:", error);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      loadData();
    }
  }, [campaignId]);

  const handleSelectVariation = () => {
    if (variations[selectedIndex]) {
      // שמור את הגרסה הנבחרת
      const selected = variations[selectedIndex];
      localStorage.setItem(
        `campaign_${campaignId}`,
        JSON.stringify({
          ...campaignData,
          ...selected,
        })
      );
      router.push(`/adigo/campaign/${campaignId}`);
    }
  };

  if (loading) {
    return <LoadingScreen message="יוצר גרסאות המודעה..." />;
  }

  if (!variations.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-lg mb-4">לא הצלחנו ליצור גרסאות</p>
          <Link
            href={`/adigo/campaign/${campaignId}`}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            חזור לקמפיין
          </Link>
        </div>
      </div>
    );
  }

  const selected = variations[selectedIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* כותרת */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 text-right">
            בחר גרסה של המודעה
          </h1>
          <p className="text-gray-600 text-right">
            בחרנו לך 3 גרסאות שונות - בחר את המועדפת עליך
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {variations.map((variation, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`p-6 rounded-lg border-2 transition-all text-right cursor-pointer ${
                selectedIndex === index
                  ? "border-blue-600 bg-blue-50 shadow-lg"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-600">
                  גרסה {index + 1}
                </div>
                {selectedIndex === index && (
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">כותרת</div>
                  <div className="font-semibold text-gray-900 line-clamp-2">
                    {variation.headline}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 mb-1">גוף</div>
                  <div className="text-gray-700 line-clamp-2">
                    {variation.body}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 mb-1">קריאה לפעולה</div>
                  <div className="text-blue-600 font-medium line-clamp-1">
                    {variation.cta}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* תצוגה מלאה של הגרסה הנבחרת */}
        {selected && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-right">
              תצוגה של הגרסה הנבחרת
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* עמודה שמאלית */}
              <div className="space-y-6 text-right order-2 md:order-1">
                <div>
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    כותרת
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selected.headline}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    גוף המודעה
                  </div>
                  <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                    {selected.body}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    קריאה לפעולה
                  </div>
                  <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 w-full">
                    {selected.cta}
                  </button>
                </div>
              </div>

              {/* עמודה ימנית */}
              <div className="space-y-6 order-1 md:order-2">
                <div className="bg-gray-50 p-4 rounded-lg text-right">
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    📱 WhatsApp
                  </div>
                  <div className="text-gray-700 text-sm">
                    {selected.whatsapp}
                  </div>
                </div>

                <div className="bg-pink-50 p-4 rounded-lg text-right">
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    📸 Instagram
                  </div>
                  <div className="text-gray-700 text-sm">
                    {selected.instagram}
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg text-right">
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    🎬 רעיון סרטון
                  </div>
                  <div className="text-gray-700 text-sm">
                    {selected.videoIdea}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* כפתורים */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSelectVariation}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            בחר גרסה זו
          </button>
          <Link
            href={`/adigo/campaign/${campaignId}`}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            חזור לקמפיין
          </Link>
        </div>
      </div>
    </div>
  );
}
