"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* לוגו */}
          <Link href="/assistant" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-l from-blue-600 to-blue-500 bg-clip-text text-transparent">
              ✨ Adigo
            </div>
          </Link>

          {/* תפריט */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/assistant"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              עוזר
            </Link>
            <Link
              href="/adigo/dashboard"
              className="hidden sm:block text-gray-600 hover:text-gray-900 font-medium transition"
            >
              דשבורד
            </Link>
            <Link
              href="/adigo/create"
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              מודעה חדשה
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
