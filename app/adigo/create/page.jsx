"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [offerDescription, setOfferDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // טען את פרטי העסק מ-localStorage
    const saved = localStorage.getItem("adigoBusiness");
    if (saved) {
      setBusiness(JSON.parse(saved));
    } else {
      // אם אין עסק, חזור להגדרה
      router.push("/adigo/setup");
    }
  }, [router]);

  const handleGenerateCampaign = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!offerDescription.trim()) {
      setError("אנא תאר את המבצע או ההצעה");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/adigo/campaign/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: business.businessName,
          businessCategory: business.businessCategory,
          targetAudience: business.targetAudience,
          offerDescription: offerDescription,
          channel: "all",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "שגיאה בשרת");
      }

      const campaign = await response.json();

      // שמור את הקמפיין בהיסטוריה
      const campaigns = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
      campaigns.unshift(campaign);
      localStorage.setItem("adigoCampaigns", JSON.stringify(campaigns));

      // עבור לתצוגת הקמפיין
      router.push(`/adigo/campaign/${campaign.id}`);
    } catch (err) {
      setError(err.message || "שגיאה בעת יצירת הקמפיין");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!business) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">צור קמפיין חדש</h1>
          <p className="text-gray-600">
            {business.businessName} | {business.businessCategory}
          </p>
        </div>

        <form onSubmit={handleGenerateCampaign} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Offer Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              תאר את המבצע או ההצעה *
            </label>
            <p className="text-gray-600 text-sm mb-3">
              למשל: "קפה וקרואסון ב-15 ₪ עד יום חמישי" או "הנחה של 30% על כל
              הפרודוקטים"
            </p>
            <textarea
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              placeholder="כתוב את המבצע שלך כאן..."
              rows="5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right resize-none"
              disabled={loading}
            />
            <p className="text-gray-500 text-xs mt-2">
              {offerDescription.length} / 500 תווים
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !offerDescription.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                יוצר מודעה...
              </>
            ) : (
              <>✨ יצור מודעה</>
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold mb-3">💡 כיצד לתאר את המבצע?</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ "קפה וקרואסון ב-15 ₪ בלבד"</li>
            <li>✓ "הנחה של 40% על טיפול ספא זוגי"</li>
            <li>✓ "כל קנייה זוכה בתרומלה לנסיעה"</li>
            <li>✓ "חנוכה זיכרון לעיר - הנחות ענקיות"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
