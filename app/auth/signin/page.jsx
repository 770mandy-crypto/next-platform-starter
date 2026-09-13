"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/adigo" });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">✨ Adigo</h1>
          <p className="text-gray-600">עוזר AI ליצירת מודעות שיווקיות</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">התחבר כדי להתחיל</h2>
          <p className="text-gray-700 mb-4">
            התחבר עם חשבון Google שלך כדי:
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ שמור את הקמפיינים שלך בעננן</li>
            <li>✓ גישה מכל מכשיר</li>
            <li>✓ צפה בהיסטוריה של המודעות שלך</li>
            <li>✓ ערוך ושנה את העיצוב בכל עת</li>
          </ul>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              התחבר...
            </>
          ) : (
            <>
              <span>🔐</span>
              התחבר עם Google
            </>
          )}
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            🔒 התחברותך מאובטחת ומוצפנת
          </p>
          <p className="text-xs text-gray-600 text-center mt-2">
            אנו לא מאחסנים את סיסמתך
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            אין לך חשבון?{" "}
            <button
              onClick={handleSignIn}
              className="text-blue-600 font-bold hover:underline"
            >
              צור אחד בחינם עכשיו
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
