"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });

  useEffect(() => {
    // טען קמפיינים מ-localStorage
    const saved = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
    setCampaigns(saved);

    // חשב סטטיסטיקות
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayCount = saved.filter((c) => {
      const cDate = new Date(c.createdAt);
      const cDateNormalized = new Date(
        cDate.getFullYear(),
        cDate.getMonth(),
        cDate.getDate()
      );
      return cDateNormalized.getTime() === today.getTime();
    }).length;

    const weekCount = saved.filter((c) => {
      const cDate = new Date(c.createdAt);
      return cDate >= weekAgo;
    }).length;

    setStats({
      total: saved.length,
      today: todayCount,
      thisWeek: weekCount,
    });
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">📊 הדשבורד שלך</h1>
          <p className="text-gray-600">סיכום כל הקמפיינים שלך</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium">סה"כ קמפיינים</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="text-4xl">✨</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium">היום</p>
                <p className="text-3xl font-bold mt-2">{stats.today}</p>
              </div>
              <div className="text-4xl">📅</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium">שבוע זה</p>
                <p className="text-3xl font-bold mt-2">{stats.thisWeek}</p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-12">
          <Link
            href="/adigo/create"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
          >
            + קמפיין חדש
          </Link>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg mb-6">עדיין אין קמפיינים 😢</p>
            <Link
              href="/adigo/create"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
            >
              צור קמפיין ראשון
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">כל הקמפיינים</h2>
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/adigo/campaign/${campaign.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">
                      {campaign.businessName}
                    </h3>
                    <p className="text-gray-600 mb-2">{campaign.headline}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleString("he-IL")}
                    </p>
                  </div>
                  <div className="flex-shrink-0 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-medium">
                    צפה
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
