"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";
import Link from "next/link";

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [copied, setCopied] = useState("");
  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    // טען את הקמפיין מ-localStorage
    const campaigns = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
    const found = campaigns.find((c) => c.id === params.id);
    if (found) {
      setCampaign(found);
      // טען insights
      loadInsights(found);
    }
  }, [params.id]);

  const loadInsights = async (camp) => {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/adigo/campaign/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: camp.headline,
          body: camp.body,
          cta: camp.cta,
          businessName: camp.businessName,
          businessCategory: camp.businessCategory,
          targetAudience: camp.targetAudience,
        }),
      });
      const data = await res.json();
      setInsights(data.insights);
    } catch (error) {
      console.error("שגיאה בטעינת insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopied(section);
    setTimeout(() => setCopied(""), 2000);
  };

  const startEdit = (section, value) => {
    setEditMode(section);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editMode && campaign) {
      const updated = { ...campaign, [editMode]: editValue };
      setCampaign(updated);

      // עדכן ב-localStorage
      const campaigns = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
      const index = campaigns.findIndex((c) => c.id === campaign.id);
      if (index !== -1) {
        campaigns[index] = updated;
        localStorage.setItem("adigoCampaigns", JSON.stringify(campaigns));
      }

      setEditMode(null);
    }
  };

  if (!campaign) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  const renderSection = ({ title, content, section, icon }) => (
    <div
      key={section}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-l from-blue-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-lg">{title}</h3>
        <span>{icon}</span>
      </div>
      <div className="p-6">
        {editMode === section ? (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
              rows="4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditMode(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                שמור
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => startEdit(section, content)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                ✏️ עריכה
              </button>
              <button
                onClick={() => copyToClipboard(content, section)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                {copied === section ? "✓ הועתק" : "📋 העתק"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/adigo/create"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              ← חזור
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            ✨ הקמפיין שלך מוכן!
          </h1>
          <p className="text-gray-600">
            {campaign.businessName} • {new Date(campaign.createdAt).toLocaleString("he-IL")}
          </p>
        </div>

        {/* Campaign Sections */}
        <div className="space-y-6">
          {[
            { title: "כותרת המודעה", section: "headline", icon: "📌" },
            { title: "גוף המודעה", section: "body", icon: "📝" },
            { title: "קריאה לפעולה", section: "cta", icon: "🎯" },
            { title: "לחלוקה ב-WhatsApp", section: "whatsapp", icon: "💬" },
            { title: "לחלוקה ב-Instagram", section: "instagram", icon: "📸" },
            { title: "רעיון סרטון קצר", section: "videoIdea", icon: "🎥" },
          ].map((s) =>
            renderSection({ ...s, content: campaign[s.section] })
          )}
        </div>

        {/* Image Section */}
        {campaign.imageUrl && (
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">🎨 תמונת המודעה</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={campaign.imageUrl}
                alt={campaign.businessName}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = campaign.imageUrl;
                link.download = `${campaign.businessName}-ad.png`;
                link.click();
              }}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
            >
              ⬇️ הורד תמונה
            </button>
          </div>
        )}

        {/* Preview Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold mb-6">👀 תצוגה מקדימה לפייסבוק</h2>
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="font-bold text-lg mb-3">{campaign.headline}</div>
            <div className="text-gray-700 whitespace-pre-wrap mb-4">
              {campaign.body}
            </div>
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-center inline-block">
              {campaign.cta}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex gap-4 flex-col sm:flex-row">
          <button
            onClick={() => {
              const dataStr = JSON.stringify(campaign, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${campaign.businessName}-campaign.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
          >
            💾 ייצא JSON
          </button>
          <button
            onClick={() => router.push(`/adigo/variations?campaignId=${campaign.id}`)}
            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-orange-700 transition"
          >
            🔄 גרסאות נוספות
          </button>
          <button
            onClick={() => router.push(`/adigo/editor/${campaign.id}`)}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition"
          >
            🎨 עורך עיצוב
          </button>
          <button
            onClick={() => router.push("/adigo/create")}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
          >
            ✨ קמפיין נוסף
          </button>
          <Link
            href="/adigo/dashboard"
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold text-lg hover:bg-gray-300 transition text-center"
          >
            📊 לדשבורד
          </Link>
        </div>

        {/* AI Insights */}
        {insights && (
          <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">🤖 הערות אישור מ-AI</h3>
              <button
                onClick={() => loadInsights(campaign)}
                disabled={loadingInsights}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                {loadingInsights ? "⏳ טוען..." : "🔄 רענן"}
              </button>
            </div>
            <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
              {insights}
            </div>
          </div>
        )}

        {/* Tip Box */}
        <div className="mt-12 bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="font-semibold mb-3">💡 טיפ: כיצד להשתמש בקמפיין?</h3>
          <ul className="space-y-2 text-gray-700">
            <li>
              ✓ <strong>Facebook:</strong> העתק את הכותרת + גוף המודעה ו-CTA
            </li>
            <li>
              ✓ <strong>Instagram:</strong> שתוף את הטקסט עם ה-Emojis
            </li>
            <li>
              ✓ <strong>WhatsApp:</strong> שלח ישירות לחברים או ערוצי ההודעות שלך
            </li>
            <li>
              ✓ <strong>סרטון:</strong> השתמש ברעיון כדי ליצור סרטון TikTok או Reel
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
