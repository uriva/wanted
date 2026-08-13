"use client";

import { useState } from "react";
import { Plus, ExternalLink, AlertCircle } from "lucide-react";

interface SourceItem {
  id: string;
  name: string;
  platform: string;
  url: string;
  externalId: string;
  status: string;
  checkIntervalMinutes: number;
  consecutiveEmptyScrapes: number;
  lastScrapedAt: number;
  nextScheduledScanAt: number;
  totalPostsScanned: number;
  totalIntentsFound: number;
}

interface SourceSchedulerProps {
  sources: SourceItem[];
  onAddSource: (newSource: Partial<SourceItem>) => void;
}

function formatNextPollTime(nextScanTimestamp?: number): string {
  if (!nextScanTimestamp) return "Ready";
  const diffMs = nextScanTimestamp - Date.now();
  if (diffMs <= 0) return "Due now";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return `in ${diffSecs}s`;
  if (diffMins < 60) return `in ${diffMins}m`;
  const remainingMins = diffMins % 60;
  return remainingMins > 0 ? `in ${diffHours}h ${remainingMins}m` : `in ${diffHours}h`;
}

export default function SourceScheduler({
  sources,
  onAddSource,
}: SourceSchedulerProps) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [platform, setPlatform] = useState("facebook");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [externalId, setExternalId] = useState("");

  const filteredSources = sources.filter((s) => {
    return platformFilter === "all" || s.platform.toLowerCase() === platformFilter.toLowerCase();
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    onAddSource({
      platform,
      name,
      url,
      externalId: externalId || url.split("/").pop() || "source_01",
      status: "active",
      checkIntervalMinutes: 15,
      minIntervalMinutes: 15,
      maxIntervalMinutes: 1440,
      decayMultiplier: 1.5,
      consecutiveEmptyScrapes: 0,
    } as any);
    setShowAddModal(false);
    setName("");
    setUrl("");
    setExternalId("");
  };

  const getPlatformBadge = (platform: string) => {
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded">
        {platform === "twitter" ? "X / Twitter" : platform}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Filter Bar & Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Social Media Network Filter */}
        <div className="flex bg-zinc-100 dark:bg-black p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
          {["all", "facebook", "reddit", "twitter", "whatsapp"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1 rounded capitalize font-medium text-xs transition-all ${
                platformFilter === p
                  ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {p === "twitter" ? "X/Twitter" : p}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Channel</span>
        </button>
      </div>

      {/* Minimal Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-black/60 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="py-3 px-4 sm:px-6">Channel / Group</th>
              <th className="py-3 px-4 sm:px-6 text-center">Posts Scanned</th>
              <th className="py-3 px-4 sm:px-6 text-center">Buyer Matches</th>
              <th className="py-3 px-4 sm:px-6 text-right">Next Poll</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-500">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <AlertCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-600 mb-2" />
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">No monitored sources found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSources.map((source) => {
                const isDue = Date.now() >= (source.nextScheduledScanAt || 0);
                return (
                  <tr
                    key={source.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Channel Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              {source.name}
                            </span>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-400 hover:text-black dark:hover:text-white"
                              title="Open Social Channel"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="mt-1">{getPlatformBadge(source.platform)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Posts Scanned */}
                    <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {source.totalPostsScanned || 0}
                    </td>

                    {/* Buyer Matches */}
                    <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-black dark:text-white">
                      {source.totalIntentsFound || 0}
                    </td>

                    {/* Next Poll */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono whitespace-nowrap text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isDue
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {formatNextPollTime(source.nextScheduledScanAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <h3 className="text-base font-bold mb-4">Add Monitored Channel</h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="facebook">Facebook Group</option>
                  <option value="reddit">Reddit Subreddit</option>
                  <option value="twitter">X / Twitter Search</option>
                  <option value="whatsapp">WhatsApp Group / Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">Channel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Israeli AI Startups & Buyers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://www.facebook.com/groups/1657329921376731"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">External ID / Subreddit</label>
                <input
                  type="text"
                  placeholder="e.g. 1657329921376731"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
