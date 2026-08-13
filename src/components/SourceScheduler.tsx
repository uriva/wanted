"use client";

import { useState } from "react";
import { Radio, RefreshCw, Zap, Clock, Plus, ExternalLink } from "lucide-react";

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
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-zinc-300" />
            <h2 className="text-base font-bold text-white">Monitored Channels & Adaptive Polling</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Channel poll frequency adaptively scales. Idle channels decay exponentially up to 24h to save API credits, while hits reset polling to 15 minutes.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Channel</span>
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          const isDue = Date.now() >= (source.nextScheduledScanAt || 0);
          return (
            <div
              key={source.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-black border border-zinc-800 flex items-center justify-center text-zinc-300">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {source.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] font-mono text-zinc-400 capitalize">{source.platform}</span>
                        <span className="text-zinc-600">•</span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-zinc-400 hover:text-white underline inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${
                      isDue
                        ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                        : "bg-black text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {isDue ? "Due" : "Active"}
                  </span>
                </div>

                {/* Adaptive Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-black rounded-lg border border-zinc-800 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block">Poll</span>
                    <span className="font-bold text-zinc-200">{source.checkIntervalMinutes || 15}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block">Decay</span>
                    <span className="font-bold text-zinc-300">{source.consecutiveEmptyScrapes || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 block">Intents</span>
                    <span className="font-bold text-white">{source.totalIntentsFound || 0}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center space-x-1 font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>Next: {new Date(source.nextScheduledScanAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <button
                  onClick={() => onScanSource(source.id)}
                  className="px-3 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded transition-all inline-flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-zinc-400" />
                  <span>Scan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Monitored Channel</h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="facebook">Facebook Group</option>
                  <option value="reddit">Reddit Subreddit</option>
                  <option value="twitter">X / Twitter Search</option>
                  <option value="whatsapp">WhatsApp Group / Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Channel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Israeli AI Startups & Buyers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://www.facebook.com/groups/1657329921376731"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">External ID / Subreddit</label>
                <input
                  type="text"
                  placeholder="e.g. 1657329921376731"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg"
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
