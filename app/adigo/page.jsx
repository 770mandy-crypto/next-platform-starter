"use client";

import Link from "next/link";
import Navbar from "@/components/adigo/navbar";
import { useState, useEffect } from "react";

export default function AdigoLanding() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-l from-blue-600 to-blue-500 bg-clip-text text-transparent mb-6">
            ממבצע לפרסום תוך שניות
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Adigo משנה את דרך העסקים הקטנים משלך לפרסם.
            <br />
            מבצע? הצעה? קפה בהנחה?
            <br />
            אנחנו יוצרים מודעה מקצועית בעברית טהורה תוך שניות.
          </p>

          <div className="flex gap-4 justify-center mb-12 flex-col sm:flex-row">
            <Link
              href="/adigo/setup"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg"
            >
              🚀 התחל עכשיו
            </Link>
            <Link
              href="/adigo/dashboard"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-bold text-lg hover:border-gray-400 transition"
            >
              📊 הדשבורד שלי
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="font-bold text-lg mb-2">מהיר כברק</h3>
              <p className="text-gray-600">
                מ-רעיון לפרסום מוכן בפחות מ-2 דקות
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="font-bold text-lg mb-2">בעברית טהורה</h3>
              <p className="text-gray-600">
                כל המודעות מיוצרות בעברית מקצועית ללא טעויות
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-bold text-lg mb-2">כל הערוצים</h3>
              <p className="text-gray-600">
                Facebook, Instagram, WhatsApp, וידיאו - הכל בקליק אחד
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-20 bg-blue-50 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-8">איך זה עובד?</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  1
                </div>
                <p className="font-semibold">הגדר את העסק</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  2
                </div>
                <p className="font-semibold">תאר את המבצע</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  3
                </div>
                <p className="font-semibold">Adigo יוצר</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  4
                </div>
                <p className="font-semibold">שמור והשתמש</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 py-8 px-4 text-center text-gray-600">
        <p>© 2024 Adigo - עוזר AI ליצירת מודעות שיווקיות</p>
      </footer>
    </div>
  );
}
