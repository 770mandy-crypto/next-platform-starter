"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/adigo/navbar";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    avgHeadlineLength: 0,
    topCategories: []
  });

  useEffect(() => {
    // טען קמפיינים מ-localStorage
    const saved = JSON.parse(localStorage.getItem("adigoCampaigns") || "[]");
    setCampaigns(saved.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

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

    // חשב קטגוריות הנפוצות ביותר
    const categoryCount = {};
    saved.forEach((c) => {
      categoryCount[c.businessCategory] = (categoryCount[c.businessCategory] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => ({ category: cat, count }));

    // חשב אורך כותרת ממוצע
    const avgHeadline = saved.length > 0
      ? Math.round(saved.reduce((sum, c) => sum + (c.headline?.length || 0), 0) / saved.length)
      : 0;

    setStats({
      total: saved.length,
      today: todayCount,
      thisWeek: weekCount,
      avgHeadlineLength: avgHeadline,
      topCategories: topCategories,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium">אורך כותרת ממוצע</p>
                <p className="text-3xl font-bold mt-2">{stats.avgHeadlineLength}</p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        {stats.topCategories.length > 0 && (
          <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">🏆 קטגוריות הנפוצות</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.topCategories.map((item, idx) => (
                <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">#{idx + 1}</div>
                  <div className="font-semibold text-gray-900">{item.category}</div>
                  <div className="text-sm text-gray-500 mt-2">{item.count} קמפיינים</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-12 flex gap-4 flex-wrap">
          <Link
            href="/adigo/create"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
          >
            + קמפיין חדש
          </Link>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(campaigns, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `adigo-campaigns-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:bg-gray-400"
            disabled={campaigns.length === 0}
          >
            💾 ייצא JSON
          </button>
          <button
            onClick={() => {
              // Export as CSV
              const headers = ['שם עסק', 'קטגוריה', 'קהל יעד', 'כותרת', 'גוף', 'CTA', 'תאריך'];
              const rows = campaigns.map(c => [
                c.businessName,
                c.businessCategory,
                c.targetAudience,
                c.headline,
                c.body,
                c.cta,
                new Date(c.createdAt).toLocaleDateString('he-IL'),
              ]);

              // כל תא עטוף במרכאות ומרכאות פנימיות מוכפלות — אחרת פסיק או
              // שורה חדשה בתוך טקסט המודעה שובר את כל הטבלה
              const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
              const csv = [headers, ...rows]
                .map((row) => row.map(quote).join(','))
                .join('\r\n');

              // BOM כדי ש-Excel יזהה את העברית כ-UTF-8
              const dataBlob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `adigo-campaigns-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition disabled:bg-gray-400"
            disabled={campaigns.length === 0}
          >
            📊 ייצא Excel
          </button>
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
