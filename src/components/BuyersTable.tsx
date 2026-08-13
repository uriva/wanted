"use client";

import { useState } from "react";
import { Search, ExternalLink, Filter, Sparkles, AlertCircle, Clock, Tag, MessageSquare, ArrowUpRight } from "lucide-react";

interface IntentItem {
  id: string;
  externalPostId?: string;
  title: string;
  summary: string;
  originalText: string;
  translatedText: string;
  platform: string;
  postUrl: string;
  intentType: string;
  category: string;
  budget?: string;
  urgency?: string;
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

export default function BuyersTable({ intents, onSelectIntent }: BuyersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [intentTypeFilter, setIntentTypeFilter] = useState("all");

  // Deduplicate items by originalText or externalPostId
  const seenKeys = new Set<string>();
  const uniqueIntents = intents.filter((item) => {
    const key = item.externalPostId || (item.originalText || "").trim().toLowerCase();
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const filteredIntents = uniqueIntents.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.buyer?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform =
      platformFilter === "all" || item.platform.toLowerCase() === platformFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesIntentType =
      intentTypeFilter === "all" || item.intentType.toLowerCase() === intentTypeFilter.toLowerCase();

    return matchesSearch && matchesPlatform && matchesCategory && matchesIntentType;
  });

  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md">Facebook</span>;
      case "reddit":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded-md">Reddit</span>;
      case "twitter":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-600/20 text-sky-400 border border-sky-500/30 rounded-md">X / Twitter</span>;
      case "whatsapp":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-md">WhatsApp</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600 rounded-md">{platform}</span>;
    }
  };

  const getIntentTypeBadge = (intentType: string) => {
    switch (intentType) {
      case "custom_build":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded">Custom Build</span>;
      case "hire":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded">Hiring</span>;
      case "service_request":
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">Service Req</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">Buying</span>;
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    if (urgency === "high") {
      return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">High Urgency</span>;
    }
    return <span className="px-2 py-0.5 text-[10px] text-slate-400 bg-slate-800 border border-slate-700 rounded">Standard</span>;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search buyers, demand, keywords, or profile names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform Filter */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {["all", "facebook", "reddit", "twitter", "whatsapp"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    platformFilter === p
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p === "twitter" ? "X/Twitter" : p}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Software & AI">Software & AI</option>
              <option value="Design & Marketing">Design & Marketing</option>
              <option value="Services">Services</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Consulting">Consulting</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4 sm:px-6">Buyer & Profile</th>
              <th className="py-3.5 px-4 sm:px-6">What They Want (English Demand)</th>
              <th className="py-3.5 px-4 sm:px-6">Category & Type</th>
              <th className="py-3.5 px-4 sm:px-6">Budget / Urgency</th>
              <th className="py-3.5 px-4 sm:px-6">Posted Date</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredIntents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">No matching buyers found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing search filters or click "Scan All Sources Now" above to fetch latest posts.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIntents.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectIntent(item)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  {/* Buyer & Profile Column */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
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
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                            {item.buyer?.name || "Anonymous Buyer"}
                          </span>
                          {item.buyer?.profileUrl && (
                            <a
                              href={item.buyer.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-500 hover:text-indigo-400"
                              title="Open Buyer Profile"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          {getPlatformBadge(item.platform)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Demand Title & Summary Column */}
                  <td className="py-4 px-4 sm:px-6 max-w-md">
                    <p className="font-medium text-slate-200 line-clamp-1 group-hover:text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {item.summary}
                    </p>
                  </td>

                  {/* Category & Type */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-slate-300">
                        {item.category}
                      </span>
                      <div>{getIntentTypeBadge(item.intentType)}</div>
                    </div>
                  </td>

                  {/* Budget & Urgency */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-semibold text-amber-300">
                        {item.budget || "Flexible / Unspecified"}
                      </span>
                      <div>{getUrgencyBadge(item.urgency)}</div>
                    </div>
                  </td>

                  {/* Posted Date */}
                  <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-xs text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                    <button className="px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 rounded-lg transition-all">
                      View Raw Post
                    </button>
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
