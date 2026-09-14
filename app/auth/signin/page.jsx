"use client";

import { signIn, getProviders } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(null);

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleReady(Boolean(providers?.google)))
      .catch(() => setGoogleReady(false));
  }, []);

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

        {googleReady === false ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <h2 className="font-bold text-lg mb-2">האתר עובד ללא התחברות</h2>
              <p className="text-gray-700 text-sm leading-relaxed">
                התחברות עם Google עוד לא הוגדרה באתר הזה. אפשר להשתמש בכל
                התכונות עכשיו — המודעות נשמרות בדפדפן הזה בלבד.
              </p>
            </div>
            <Link
              href="/adigo/setup"
              className="block w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition text-center"
            >
              המשך לאתר
            </Link>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="font-bold text-lg mb-4">התחבר כדי להתחיל</h2>
              <p className="text-gray-700 mb-4">
                התחבר עם חשבון Google שלך כדי:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ לשמור את הקמפיינים שלך בענן</li>
                <li>✓ לגשת אליהם מכל מכשיר</li>
                <li>✓ לצפות בהיסטוריית המודעות שלך</li>
                <li>✓ לערוך את העיצוב בכל עת</li>
              </ul>
            </div>

            <button
              onClick={handleSignIn}
              disabled={loading || googleReady === null}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  מתחבר...
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
                🔒 ההתחברות מאובטחת ומוצפנת
              </p>
              <p className="text-xs text-gray-600 text-center mt-2">
                איננו מאחסנים את הסיסמה שלך
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
