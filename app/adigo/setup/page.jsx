"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // שמור את פרטי העסק ב-localStorage
      localStorage.setItem("adigoBusiness", JSON.stringify(formData));
      // עבור לעמוד יצירת קמפיין
      router.push("/adigo/create");
    } catch (error) {
      console.error("שגיאה:", error);
      alert("שגיאה בשמירת פרטי העסק");
    } finally {
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

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              קישור ללוגו (אופציונלי)
            </label>
            <input
              type="url"
              name="logoUrl"
              value={formData.logoUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
            />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

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
