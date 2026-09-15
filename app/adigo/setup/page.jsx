"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";

const MAX_LOGO_PX = 512;

// הלוגו נשמר בדפדפן כ-data URL, ולכן חייב להיות קטן. מקטינים לפני שמירה,
// אחרת localStorage מתמלא ושמירת העסק נכשלת.
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_PX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const keepsTransparency = file.type === "image/png";
        resolve(
          keepsTransparency
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.85)
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const CATEGORIES = [
  "בית קפה",
  "מסעדה",
  "מאפייה",
  "צרכנייה או מכולת",
  "חנות בגדים",
  "חנות נעליים",
  "חנות פרחים",
  "מספרה",
  "מכון יופי",
  "חדר כושר",
  "מכבסה",
  "מוסך",
  "רופא שיניים",
  "קליניקה פרטית",
  "עורך דין",
  "רואה חשבון",
  "גן ילדים או חוגים",
  "הובלות ושליחויות",
  "שיפוצים ובנייה",
  "אחר",
];

export default function BusinessSetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: "",
    businessCategory: "",
    targetAudience: "",
    logoUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
  });
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef(null);

  // טוענים פרטים קיימים כדי שעריכה לא תתחיל מטופס ריק
  useEffect(() => {
    try {
      const saved = localStorage.getItem("adigoBusiness");
      if (saved) setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {
      // פרטים פגומים בדפדפן - ממשיכים עם טופס ריק
    }
  }, []);

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError("");

    if (!file.type.startsWith("image/")) {
      setLogoError("צריך לבחור קובץ תמונה (JPG, PNG או WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoError("התמונה גדולה מדי. בחרו קובץ עד 10MB.");
      return;
    }

    try {
      const dataUrl = await shrinkImage(file);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch {
      setLogoError("לא הצלחנו לקרוא את התמונה. נסו קובץ אחר.");
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: "" }));
    setLogoError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveError("");

    try {
      localStorage.setItem("adigoBusiness", JSON.stringify(formData));
      router.push("/adigo/create");
    } catch {
      setSaveError(
        "אין מספיק מקום בדפדפן לשמור את הלוגו. נסו תמונה קטנה יותר, או הסירו אותה."
      );
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">הגדר את העסק שלך</h1>
        <p className="text-gray-600 mb-8">
          נחוצים לנו כמה פרטים כדי ליצור מודעות שמתאימות לך בדיוק
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              שם העסק *
            </label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              placeholder="למשל: קפה פלוס"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              קטגוריה *
            </label>
            <select
              name="businessCategory"
              value={formData.businessCategory}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
            >
              <option value="">בחר קטגוריה</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              קהל יעד *
            </label>
            <textarea
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleInputChange}
              placeholder="למשל: נשים צעירות בגילים 25-40, משפחות, תיירים"
              required
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              הלוגו שלך (אופציונלי)
            </label>

            {formData.logoUrl ? (
              <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-lg bg-white">
                <img
                  src={formData.logoUrl}
                  alt="הלוגו שהעליתם"
                  className="h-20 w-20 object-contain rounded bg-gray-50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-1">הלוגו נשמר ✓</p>
                  <p className="text-sm text-gray-600">
                    הוא יופיע על המודעות שתיצרו.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium shrink-0"
                >
                  הסר
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition">
                <span className="text-3xl">📷</span>
                <span className="font-medium">בחרו תמונה מהמחשב או מהטלפון</span>
                <span className="text-sm text-gray-600">
                  JPG, PNG או WEBP — עד 10MB
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFile}
                  className="hidden"
                />
              </label>
            )}

            {logoError && (
              <p className="mt-2 text-sm text-red-700">{logoError}</p>
            )}
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                צבע ראשי
              </label>
              <input
                type="color"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleInputChange}
                className="w-full h-12 p-1 border border-gray-300 rounded-lg cursor-pointer bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                צבע משני
              </label>
              <input
                type="color"
                name="secondaryColor"
                value={formData.secondaryColor}
                onChange={handleInputChange}
                className="w-full h-12 p-1 border border-gray-300 rounded-lg cursor-pointer bg-white"
              />
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {saveError}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "טוען..." : "המשך לקמפיין ➡️"}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold mb-3">💡 טיפ</h3>
          <p className="text-gray-700">
            אפשר לשנות את הפרטים האלה בכל עת. זה רק עוזר ל-Adigo ליצור מודעות
            שמתאימות לך בדיוק.
          </p>
        </div>
      </div>
    </div>
  );
}
