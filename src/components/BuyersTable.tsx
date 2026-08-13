"use client";

import { useState } from "react";
import { Search, AlertCircle, Clock } from "lucide-react";

interface IntentItem {
  id: string;
  externalPostId?: string;
  title: string;
  summary: string;
  originalText: string;
  translatedText: string;
  platform: string;
  postUrl: string;
  confidenceScore: number;
  publishedAt: number;
  buyer?: {
    id: string;
    name: string;
    profileUrl: string;
    avatarUrl?: string;
    platform: string;
  };
}

interface BuyersTableProps {
  intents: IntentItem[];
  onSelectIntent: (intent: IntentItem) => void;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "recently";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function BuyersTable({ intents, onSelectIntent }: BuyersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Deduplicate items by originalText or externalPostId
  const seenKeys = new Set<string>();
  const uniqueIntents = intents.filter((item) => {
    const key = item.externalPostId || (item.originalText || "").trim().toLowerCase();
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const filteredIntents = uniqueIntents.filter((item) => {
    const text = item.originalText || item.title || "";
    return (
      text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.buyer?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getPlatformBadge = (platform: string) => {
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded">
        {platform === "twitter" ? "X / Twitter" : platform}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search buyers, demand keywords, or names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-black/60 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="py-3 px-4 sm:px-6">Person</th>
              <th className="py-3 px-4 sm:px-6">What They Want</th>
              <th className="py-3 px-4 sm:px-6 text-right">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
            {filteredIntents.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-zinc-500">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <AlertCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-600 mb-2" />
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">No matching buyers found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIntents.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectIntent(item)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                  {/* Person Column */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-xs shrink-0">
                        {item.buyer?.avatarUrl ? (
                          <img
                            src={item.buyer.avatarUrl}
                            alt={item.buyer.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (item.buyer?.name || "B").substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors block text-xs">
                          {item.buyer?.name || "Anonymous Buyer"}
                        </span>
                        <div className="mt-1">
                          {getPlatformBadge(item.platform)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* What They Want Column */}
                  <td className="py-3.5 px-4 sm:px-6">
                    <p
                      dir="auto"
                      className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed hebrew-text group-hover:text-black dark:group-hover:text-white transition-colors"
                    >
                      {item.originalText || item.title}
                    </p>
                  </td>

                  {/* Posted Date (Relative) */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400 text-right">
                    <div className="flex items-center justify-end space-x-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>{formatRelativeTime(item.publishedAt)}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
