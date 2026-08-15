"use client";

import { useState } from "react";
import { Plus, ExternalLink, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Clock, ShieldCheck, HelpCircle } from "lucide-react";

interface SourceItem {
  id: string;
  name: string;
  platform: string;
  url: string;
  externalId: string;
  status: string;
  checkIntervalMinutes?: number;
  minIntervalMinutes?: number;
  maxIntervalMinutes?: number;
  decayMultiplier?: number;
  consecutiveEmptyScrapes?: number;
  lastScrapedAt?: number;
  nextScheduledScanAt?: number;
  totalPostsScanned?: number;
  totalIntentsFound?: number;
  createdAt?: number;
}

interface SourceSchedulerProps {
  sources: SourceItem[];
  onAddSource: (newSource: Partial<SourceItem>) => void;
}

type SortField = "name" | "platform" | "totalPostsScanned" | "totalIntentsFound" | "nextScheduledScanAt";

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

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "recently";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

function validateSourceInput(platform: string, name: string, rawUrl: string): {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
  externalId?: string;
} {
  if (!name.trim()) {
    return { valid: false, error: "Please enter a channel or group name." };
  }

  const cleanUrl = rawUrl.trim();
  if (!cleanUrl) {
    return { valid: false, error: "Please enter a valid link." };
  }

  if (platform === "facebook") {
    const match = cleanUrl.match(/(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\/groups\/([^\/\?\s]+)/i);
    if (!match || !match[1]) {
      return {
        valid: false,
        error: "Invalid Facebook Group URL. Example: https://www.facebook.com/groups/1657329921376731",
      };
    }
    return {
      valid: true,
      normalizedUrl: `https://www.facebook.com/groups/${match[1]}`,
      externalId: match[1],
    };
  }

  if (platform === "whatsapp") {
    const match = cleanUrl.match(/(?:https?:\/\/)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_\-]+)/i);
    if (!match || !match[1] || match[1].length < 8) {
      return {
        valid: false,
        error: "Invalid WhatsApp Group Invite Link. Example: https://chat.whatsapp.com/G5g2mJXb23A",
      };
    }
    return {
      valid: true,
      normalizedUrl: `https://chat.whatsapp.com/${match[1]}`,
      externalId: match[1],
    };
  }

  if (platform === "reddit") {
    const match = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([A-Za-z0-9_]+)/i) || cleanUrl.match(/^r\/([A-Za-z0-9_]+)$/i);
    if (!match || !match[1]) {
      return {
        valid: false,
        error: "Invalid Subreddit link or name. Example: https://reddit.com/r/freelance or r/freelance",
      };
    }
    return {
      valid: true,
      normalizedUrl: `https://reddit.com/r/${match[1]}`,
      externalId: match[1],
    };
  }

  return {
    valid: true,
    normalizedUrl: cleanUrl,
    externalId: cleanUrl.split("/").pop() || "source_01",
  };
}

export default function SourceScheduler({
  sources,
  onAddSource,
}: SourceSchedulerProps) {
  const [sourcesTab, setSourcesTab] = useState<"monitored" | "pending">("monitored");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("nextScheduledScanAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [platform, setPlatform] = useState<"facebook" | "whatsapp" | "reddit">("facebook");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const monitoredSources = sources.filter((s) => s.status !== "pending_review");
  const pendingSources = sources.filter((s) => s.status === "pending_review");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredMonitoredSources = monitoredSources.filter((s) => {
    return platformFilter === "all" || s.platform.toLowerCase() === platformFilter.toLowerCase();
  });

  const sortedMonitoredSources = [...filteredMonitoredSources].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = (valB || "").toLowerCase();
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    valA = valA || 0;
    valB = valB || 0;
    return sortDir === "asc" ? valA - valB : valB - valA;
  });

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const check = validateSourceInput(platform, name, url);
    if (!check.valid) {
      setValidationError(check.error || "Please provide valid source information.");
      return;
    }

    onAddSource({
      platform,
      name: name.trim(),
      url: check.normalizedUrl!,
      externalId: check.externalId || "suggested_source",
      status: "pending_review",
      checkIntervalMinutes: 60,
      minIntervalMinutes: 15,
      maxIntervalMinutes: 1440,
      decayMultiplier: 1.5,
      consecutiveEmptyScrapes: 0,
      totalPostsScanned: 0,
      totalIntentsFound: 0,
      createdAt: Date.now(),
    });

    setShowSuggestModal(false);
    setName("");
    setUrl("");
    setValidationError(null);
    setSourcesTab("pending");
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-zinc-400 dark:text-zinc-600 inline ml-1 opacity-50" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-black dark:text-white inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-black dark:text-white inline ml-1" />
    );
  };

  const getPlatformBadge = (plat: string) => {
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded font-semibold">
        {plat}
      </span>
    );
  };

  const getPlaceholder = () => {
    if (platform === "facebook") return "https://www.facebook.com/groups/1657329921376731";
    if (platform === "whatsapp") return "https://chat.whatsapp.com/AbCdEf123456789";
    if (platform === "reddit") return "https://reddit.com/r/freelance or r/freelance";
    return "https://...";
  };

  const getUrlLabel = () => {
    if (platform === "facebook") return "Facebook Group Link";
    if (platform === "whatsapp") return "WhatsApp Group Invite Link";
    if (platform === "reddit") return "Subreddit URL / Name";
    return "Channel URL";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Sub-Tabs (Monitored Sources vs Pending Team Review) */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSourcesTab("monitored")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${
              sourcesTab === "monitored"
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Monitored Sources</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
              {monitoredSources.length}
            </span>
          </button>

          <button
            onClick={() => setSourcesTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1.5 ${
              sourcesTab === "pending"
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Team Review</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
              {pendingSources.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            setShowSuggestModal(true);
            setValidationError(null);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Suggest Channel</span>
        </button>
      </div>

      {/* Filter Bar (Only for Monitored Tab) */}
      {sourcesTab === "monitored" && (
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between">
          <div className="flex bg-zinc-100 dark:bg-black p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            {["all", "facebook", "reddit", "whatsapp"].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1 rounded capitalize font-medium text-xs transition-all ${
                  platformFilter === p
                    ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monitored Sources Table */}
      {sourcesTab === "monitored" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-black/60 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>Channel / Group</span>
                  {renderSortIcon("name")}
                </th>
                <th
                  onClick={() => handleSort("platform")}
                  className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>Social Network</span>
                  {renderSortIcon("platform")}
                </th>
                <th
                  onClick={() => handleSort("totalPostsScanned")}
                  className="py-3 px-4 sm:px-6 text-center cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>Posts Scanned</span>
                  {renderSortIcon("totalPostsScanned")}
                </th>
                <th
                  onClick={() => handleSort("totalIntentsFound")}
                  className="py-3 px-4 sm:px-6 text-center cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>Buyer Matches</span>
                  {renderSortIcon("totalIntentsFound")}
                </th>
                <th
                  onClick={() => handleSort("nextScheduledScanAt")}
                  className="py-3 px-4 sm:px-6 text-right cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>Next Poll</span>
                  {renderSortIcon("nextScheduledScanAt")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
              {sortedMonitoredSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <AlertCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-600 mb-2" />
                      <p className="font-medium text-zinc-600 dark:text-zinc-400">No monitored sources found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedMonitoredSources.map((source) => {
                  const isWa = source.platform === "whatsapp";
                  const isDue = Date.now() >= (source.nextScheduledScanAt || 0);
                  return (
                    <tr
                      key={source.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-2">
                          <span
                            dir="auto"
                            className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs hebrew-text"
                          >
                            {source.name}
                          </span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-black dark:hover:text-white shrink-0"
                            title="Open Social Channel"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {getPlatformBadge(source.platform)}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {source.totalPostsScanned || 0}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-semibold text-black dark:text-white">
                        {source.totalIntentsFound || 0}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 font-mono whitespace-nowrap text-right">
                        {isWa ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                            Webhook (Live)
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                              isDue
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            }`}
                          >
                            {formatNextPollTime(source.nextScheduledScanAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Team Review Table */}
      {sourcesTab === "pending" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-black/60 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-4 sm:px-6">Channel / Group</th>
                <th className="py-3 px-4 sm:px-6">Platform</th>
                <th className="py-3 px-4 sm:px-6">Link / Invite</th>
                <th className="py-3 px-4 sm:px-6">Suggested</th>
                <th className="py-3 px-4 sm:px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
              {pendingSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="max-w-md mx-auto flex flex-col items-center space-y-2">
                      <HelpCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">No suggestions pending review</p>
                      <p className="text-[11px] text-zinc-400">
                        Click &quot;Suggest Channel&quot; above to suggest a Facebook group, WhatsApp invite, or Subreddit.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingSources.map((source) => (
                  <tr
                    key={source.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        dir="auto"
                        className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs hebrew-text block"
                      >
                        {source.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      {getPlatformBadge(source.platform)}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white inline-flex items-center space-x-1 max-w-xs truncate"
                      >
                        <span className="truncate">{source.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                      {formatRelativeTime(source.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 inline-flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Pending Review</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Suggest Channel Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <h3 className="text-base font-bold mb-1">Suggest Channel for Review</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Submit a social group or channel for our team to review and add to coverage.
            </p>

            {validationError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSuggestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value as any);
                    setValidationError(null);
                  }}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="facebook">Facebook Group</option>
                  <option value="whatsapp">WhatsApp Group (Invite Link)</option>
                  <option value="reddit">Reddit Subreddit</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">Channel / Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. AI Startups & Freelancers"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">{getUrlLabel()}</label>
                <input
                  type="text"
                  placeholder={getPlaceholder()}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-[11px]"
                  required
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  {platform === "facebook" && "Must be a direct link to the Facebook group."}
                  {platform === "whatsapp" && "Must be a valid WhatsApp invite link (https://chat.whatsapp.com/...)"}
                  {platform === "reddit" && "Must be a subreddit URL (https://reddit.com/r/...) or name (r/...)"}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Submit Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
