"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/adigo/navbar";

const QUICK_ACTIONS = [
  { label: "✍️ נסח לי הודעה", prompt: "תנסח לי הודעה קצרה ומנומסת ל" },
  { label: "📄 תסביר לי מסמך", prompt: "תסביר לי במילים פשוטות מה כתוב כאן:\n\n" },
  { label: "🌍 תרגם לי", prompt: "תרגם לאנגלית:\n\n" },
  { label: "🧮 תעזור לי בחשבון", prompt: "תעזור לי לחשב: " },
  { label: "💡 תן לי רעיונות", prompt: "תן לי 5 רעיונות ל" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "לא הצלחנו להתחבר לעוזר. נסו שוב.");
        setStreaming(false);
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: "assistant", content: answer }]);
      }
    } catch {
      setError("החיבור נקטע. בדקו את האינטרנט ונסו שוב.");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 pt-20 pb-40 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {isEmpty ? (
            <div className="pt-8 sm:pt-16">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                שלום 👋 במה אפשר לעזור?
              </h1>
              <p className="text-gray-600 mb-8 text-lg">
                שאלו אותי כל דבר — ניסוח, תרגום, הסבר, חשבון, רעיונות. בעברית.
              </p>

              <div className="flex flex-wrap gap-2 mb-10">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.prompt);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:border-blue-600 hover:text-blue-700 transition"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <Link
                href="/adigo/create"
                className="block bg-gradient-to-l from-blue-600 to-blue-500 text-white rounded-xl p-6 hover:shadow-lg transition"
              >
                <div className="text-xl font-bold mb-1">
                  ✨ צריכים מודעה לעסק?
                </div>
                <div className="text-blue-50">
                  אדיגו כותב מודעה מלאה — טקסט לפייסבוק, הודעה לוואטסאפ, פוסט
                  לאינסטגרם ורעיון לסרטון.
                </div>
              </Link>
            </div>
          ) : (
            <div className="space-y-6 pt-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user" ? "flex justify-start" : ""
                  }
                >
                  {message.role === "user" ? (
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] whitespace-pre-wrap">
                      {message.content}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 whitespace-pre-wrap leading-relaxed">
                      {message.content || (
                        <span className="text-gray-400">חושב…</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}

          {error && (
            <div className="mt-6 bg-amber-50 border border-amber-300 rounded-xl p-5">
              <p className="text-gray-800 font-medium mb-1">{error}</p>
              <p className="text-sm text-gray-600">
                אם זה אתר חדש שהעליתם — הוסיפו את המפתח בהגדרות האתר, ואז
                העוזר יתחיל לעבוד.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8 pb-5 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-gray-300 rounded-2xl shadow-sm focus-within:border-blue-600 transition">
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="כתבו כאן מה שתרצו…"
              aria-label="ההודעה שלך"
              className="w-full bg-transparent px-5 pt-4 pb-2 resize-none outline-none text-lg"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-xs text-gray-500">
                Enter לשליחה · Shift+Enter לשורה חדשה
              </span>
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {streaming ? "כותב…" : "שלח"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
