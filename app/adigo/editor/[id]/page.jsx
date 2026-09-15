"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [design, setDesign] = useState({
    template: "modern",
    primaryColor: "#2563eb",
    secondaryColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    accentColor: "#f59e0b",
    fontSize: "medium",
    fontFamily: "sans",
    imageStyle: "photo",
  });
  const [previewMode, setPreviewMode] = useState("instagram");
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    const campaigns = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
    const found = campaigns.find((c) => c.id === params.id);
    if (found) {
      setCampaign(found);
      const savedDesign = localStorage.getItem(`design_${params.id}`);
      if (savedDesign) {
        setDesign(JSON.parse(savedDesign));
      }
    }

    try {
      const saved = localStorage.getItem("adigoBusiness");
      if (saved) setBusiness(JSON.parse(saved));
    } catch {
      // פרטי עסק פגומים - פשוט לא מציגים לוגו
    }
  }, [params.id]);

  const saveDesign = () => {
    localStorage.setItem(`design_${params.id}`, JSON.stringify(design));
    alert("✅ העיצוב נשמר!");
  };

  const resetDesign = () => {
    setDesign({
      template: "modern",
      primaryColor: "#2563eb",
      secondaryColor: "#1d4ed8",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      accentColor: "#f59e0b",
      fontSize: "medium",
      fontFamily: "sans",
      imageStyle: "photo",
    });
  };

  if (!campaign) return null;

  const fontSizes = {
    small: { headline: "24px", body: "14px", cta: "12px" },
    medium: { headline: "32px", body: "16px", cta: "14px" },
    large: { headline: "40px", body: "18px", cta: "16px" },
  };

  const fontFamilies = {
    sans: "'Segoe UI', sans-serif",
    serif: "'Georgia', serif",
    mono: "'Courier New', monospace",
  };

  const templates = {
    modern: { name: "מודרני", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    minimal: { name: "מינימליסטי", bg: "#f9fafb" },
    vibrant: { name: "צבעוני", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    dark: { name: "כהה", bg: "#1f2937" },
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">✏️ עורך עיצוב מודעה</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Editor Panel */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 h-fit sticky top-24">
              <h2 className="text-xl font-bold mb-6">🎨 עיצוב</h2>

              {/* Templates */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">טמפלט</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(templates).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setDesign({ ...design, template: key })}
                      className={`p-3 rounded border-2 transition ${
                        design.template === key
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-xs">{value.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">צבע ראשי</label>
                <input
                  type="color"
                  value={design.primaryColor}
                  onChange={(e) => setDesign({ ...design, primaryColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">צבע משנה</label>
                <input
                  type="color"
                  value={design.secondaryColor}
                  onChange={(e) => setDesign({ ...design, secondaryColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">צבע טקסט</label>
                <input
                  type="color"
                  value={design.textColor}
                  onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">צבע רקע</label>
                <input
                  type="color"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              {/* Font Size */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">גודל גופן</label>
                <select
                  value={design.fontSize}
                  onChange={(e) => setDesign({ ...design, fontSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="small">קטן</option>
                  <option value="medium">בינוני</option>
                  <option value="large">גדול</option>
                </select>
              </div>

              {/* Font Family */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">סגנון גופן</label>
                <select
                  value={design.fontFamily}
                  onChange={(e) => setDesign({ ...design, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="sans">ללא סריפים</option>
                  <option value="serif">עם סריפים</option>
                  <option value="mono">מונוספייס</option>
                </select>
              </div>

              {/* Image Style */}
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-3">סגנון תמונה</label>
                <div className="space-y-2">
                  {["photo", "illustration", "gradient"].map((style) => (
                    <button
                      key={style}
                      onClick={() => setDesign({ ...design, imageStyle: style })}
                      className={`w-full p-2 rounded border transition ${
                        design.imageStyle === style
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="text-sm">
                        {style === "photo" && "📷 תצילום"}
                        {style === "illustration" && "🎨 איור"}
                        {style === "gradient" && "🌈 גרדיאנט"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={saveDesign}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
                >
                  💾 שמור עיצוב
                </button>
                <button
                  onClick={resetDesign}
                  className="w-full bg-gray-400 text-white py-2 rounded-lg font-bold hover:bg-gray-500 transition"
                >
                  🔄 איפוס
                </button>
                <button
                  onClick={() => router.push(`/adigo/campaign/${params.id}`)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  ← חזור
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-2">
              {/* Preview Mode Selector */}
              <div className="mb-6 flex gap-3 bg-white rounded-lg p-4">
                {["instagram", "facebook", "whatsapp"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`px-4 py-2 rounded font-bold transition ${
                      previewMode === mode
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {mode === "instagram" && "📸 Instagram"}
                    {mode === "facebook" && "f Facebook"}
                    {mode === "whatsapp" && "💬 WhatsApp"}
                  </button>
                ))}
              </div>

              {/* Instagram Preview */}
              {previewMode === "instagram" && (
                <div
                  className="bg-white rounded-xl overflow-hidden shadow-lg"
                  style={{ maxWidth: "400px", margin: "0 auto" }}
                >
                  <div style={{ background: design.backgroundColor, padding: "16px" }}>
                    {business?.logoUrl && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <img
                          src={business.logoUrl}
                          alt=""
                          style={{ height: "32px", width: "32px", objectFit: "contain", borderRadius: "6px" }}
                        />
                        <span style={{ fontWeight: 600, color: design.textColor, fontSize: "14px" }}>
                          {campaign.businessName}
                        </span>
                      </div>
                    )}
                    <div style={{ background: templates[design.template].bg, borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                      <img
                        src={campaign.imageUrl || "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"}
                        alt="preview"
                        style={{ width: "100%", height: "200px", borderRadius: "8px", objectFit: "cover" }}
                      />
                    </div>
                    <h3
                      style={{
                        fontSize: fontSizes[design.fontSize].headline,
                        fontFamily: fontFamilies[design.fontFamily],
                        color: design.primaryColor,
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      {campaign.headline}
                    </h3>
                    <p
                      style={{
                        fontSize: fontSizes[design.fontSize].body,
                        fontFamily: fontFamilies[design.fontFamily],
                        color: design.textColor,
                        lineHeight: "1.6",
                        marginBottom: "12px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {campaign.body}
                    </p>
                    <button
                      style={{
                        fontSize: fontSizes[design.fontSize].cta,
                        fontFamily: fontFamilies[design.fontFamily],
                        background: design.accentColor,
                        color: "white",
                        padding: "12px 24px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {campaign.cta}
                    </button>
                  </div>
                </div>
              )}

              {/* Facebook Preview */}
              {previewMode === "facebook" && (
                <div
                  className="bg-white rounded-lg overflow-hidden shadow-lg"
                  style={{ maxWidth: "500px", margin: "0 auto" }}
                >
                  <div style={{ background: design.backgroundColor, padding: "16px" }}>
                    <img
                      src={campaign.imageUrl || "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"}
                      alt="preview"
                      style={{ width: "100%", height: "300px", borderRadius: "8px", objectFit: "cover", marginBottom: "16px" }}
                    />
                    <h3
                      style={{
                        fontSize: fontSizes[design.fontSize].headline,
                        fontFamily: fontFamilies[design.fontFamily],
                        color: design.primaryColor,
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      {campaign.headline}
                    </h3>
                    <p
                      style={{
                        fontSize: fontSizes[design.fontSize].body,
                        fontFamily: fontFamilies[design.fontFamily],
                        color: design.textColor,
                        lineHeight: "1.6",
                        marginBottom: "16px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {campaign.body}
                    </p>
                    <button
                      style={{
                        width: "100%",
                        fontSize: fontSizes[design.fontSize].cta,
                        fontFamily: fontFamilies[design.fontFamily],
                        background: design.accentColor,
                        color: "white",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {campaign.cta}
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp Preview */}
              {previewMode === "whatsapp" && (
                <div
                  className="bg-white rounded-lg overflow-hidden shadow-lg"
                  style={{ maxWidth: "350px", margin: "0 auto" }}
                >
                  <div style={{ background: "#e5ddd5", padding: "16px", borderRadius: "12px" }}>
                    <div
                      style={{
                        background: design.primaryColor,
                        color: "white",
                        padding: "12px 16px",
                        borderRadius: "18px",
                        marginBottom: "12px",
                        textAlign: "right",
                      }}
                    >
                      <p style={{ fontSize: "14px", margin: "0", whiteSpace: "pre-wrap" }}>
                        {campaign.whatsapp}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
