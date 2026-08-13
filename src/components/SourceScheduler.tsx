"use client";

import { useState } from "react";
import { Radio, RefreshCw, Zap, Clock, Plus, ExternalLink, Activity } from "lucide-react";

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
  onScanSource: (sourceId: string) => void;
  onAddSource: (newSource: Partial<SourceItem>) => void;
}

export default function SourceScheduler({
  sources,
  onScanSource,
  onAddSource,
}: SourceSchedulerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [platform, setPlatform] = useState("facebook");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [externalId, setExternalId] = useState("");

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

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Adaptive Scheduler & Exponential Decay</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Monitored social channels adaptively scale scanning frequency based on buyer intent post density.
              If a scan returns 0 buyer intent posts, the interval increases exponentially (<code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">interval × 1.5</code>) to conserve API credits. When new buyers post, the interval immediately resets to high frequency (<code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded">15m</code>).
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Social Group / Channel</span>
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          const isDue = Date.now() >= (source.nextScheduledScanAt || 0);
          return (
            <div
              key={source.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {source.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-400 capitalize">{source.platform}</span>
                        <span className="text-slate-600">•</span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Open Group</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                      isDue
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isDue ? "Scan Due" : "Active"}
                  </span>
                </div>

                {/* Adaptive Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Current Poll</span>
                    <span className="text-sm font-bold text-amber-400">
                      {source.checkIntervalMinutes || 15}m
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Idle Decay</span>
                    <span className="text-sm font-bold text-purple-400">
                      {source.consecutiveEmptyScrapes || 0} empty
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Buyer Hits</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {source.totalIntentsFound || 0} / {source.totalPostsScanned || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Next Scan */}
              <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Next Scan: {new Date(source.nextScheduledScanAt || Date.now()).toLocaleTimeString()}</span>
                </div>

                <button
                  onClick={() => onScanSource(source.id)}
                  className="px-3 py-1.5 font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-all inline-flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-400" />
                  <span>Scan Now</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Social Channel to Monitor</h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="facebook">Facebook Group</option>
                  <option value="reddit">Reddit Subreddit</option>
                  <option value="twitter">X / Twitter Search</option>
                  <option value="whatsapp">WhatsApp Group / Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Channel / Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Israeli AI Startups & Buyers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://www.facebook.com/groups/1657329921376731"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">External ID / Subreddit / Search Query</label>
                <input
                  type="text"
                  placeholder="e.g. 1657329921376731 or freelance"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
