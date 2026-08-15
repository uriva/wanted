"use client";

import { useState } from "react";
import { Send, Sparkles, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";

interface WebhookSimulatorProps {
  onPostSubmitted: () => void;
}

export default function WebhookSimulator({ onPostSubmitted }: WebhookSimulatorProps) {
  const [platform, setPlatform] = useState("whatsapp");
  const [authorName, setAuthorName] = useState("Noam Cohen");
  const [authorExternalId, setAuthorExternalId] = useState("wa_user_97250");
  const [text, setText] = useState(
    "מחפשת לבנות בוט לפרסום ממומן בפייסבוק - להקמת קמפיינים וניהול מלא אוטונומי. אשמח להצעות ולבעלי ניסיון בתחום 🌸🙏🏼"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          authorName,
          authorExternalId,
          text,
          postUrl: "https://web.whatsapp.com",
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.matched) {
        onPostSubmitted();
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center space-x-2 mb-2">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-white">Inbound Lead Simulator (WhatsApp / Webhook)</h2>
      </div>
      <p className="text-xs text-slate-400 mb-6">
        Simulate an incoming raw post in any language (Hebrew, English, Spanish, etc.) from WhatsApp, webhooks, or custom crawlers. The AI classifier will evaluate buyer intent, extract demand, and add it to the reverse marketplace.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Inbound Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="whatsapp">WhatsApp Group</option>
              <option value="facebook">Facebook Post</option>
              <option value="reddit">Reddit Post</option>
              <option value="telegram">Telegram Channel</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Author / Buyer Name</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Author External ID / Phone</label>
            <input
              type="text"
              value={authorExternalId}
              onChange={(e) => setAuthorExternalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">Raw Message / Social Media Post</label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all inline-flex items-center space-x-2 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Classifying & Ingesting..." : "Process Inbound Message"}</span>
        </button>
      </form>

      {/* Result Display */}
      {result && (
        <div className="mt-6 p-4 rounded-xl border bg-slate-950 text-xs space-y-2 border-slate-800">
          <div className="flex items-center space-x-2">
            {result.matched ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-bold text-slate-200">
              {result.matched
                ? "Buyer Intent Detected & Added to Marketplace!"
                : "Processed (No Buyer Intent Detected)"}
            </span>
          </div>

          {result.analysis && (
            <div className="p-3 bg-slate-900 rounded-lg space-y-1.5 text-slate-300 font-mono">
              <p>
                <strong className="text-indigo-400">English Title:</strong> {result.analysis.titleEn}
              </p>
              <p>
                <strong className="text-indigo-400">Category:</strong> {result.analysis.category} |{" "}
                <strong className="text-indigo-400">Type:</strong> {result.analysis.intentType}
              </p>
              <p>
                <strong className="text-indigo-400">Confidence Score:</strong>{" "}
                {(result.analysis.confidenceScore * 100).toFixed(0)}%
              </p>
              <p>
                <strong className="text-indigo-400">Matched Keywords:</strong>{" "}
                {JSON.stringify(result.analysis.matchedKeywords)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
