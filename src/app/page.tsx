"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/clientDb";
import { id } from "@instantdb/react";
import Header from "@/components/Header";
import ScanStatusBar from "@/components/ScanStatusBar";
import BuyersTable from "@/components/BuyersTable";
import SourceScheduler from "@/components/SourceScheduler";
import ScanLogs from "@/components/ScanLogs";
import IntentDetailModal from "@/components/IntentDetailModal";
import { ShoppingBag, Radio, Activity, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"marketplace" | "sources" | "logs">("marketplace");
  const [selectedIntent, setSelectedIntent] = useState<any>(null);

  // Subscribe to InstantDB real-time state
  const { isLoading, data } = db.useQuery({
    sources: {},
    buyers: {},
    intents: {
      buyer: {},
      source: {},
      $: { order: { publishedAt: "desc" } },
    },
    scan_logs: {
      $: { order: { scrapedAt: "desc" } },
    },
  });

  // Seed initial sources if empty
  useEffect(() => {
    if (!isLoading && data && data.sources.length === 0) {
      handleSeed();
    }
  }, [isLoading, data]);

  const handleSeed = async () => {
    try {
      await fetch("/api/seed", { method: "POST" });
    } catch (err) {
      console.error("Seed error:", err);
    }
  };

  const handleScanSource = async (sourceId: string) => {
    try {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
    } catch (err) {
      console.error("Single scan error:", err);
    }
  };

  const handleAddSource = async (newSource: any) => {
    try {
      await db.transact(
        db.tx.sources[id()].create({
          ...newSource,
          lastScrapedAt: Date.now(),
          nextScheduledScanAt: Date.now(),
          totalPostsScanned: 0,
          totalIntentsFound: 0,
          createdAt: Date.now(),
        })
      );
    } catch (err) {
      console.error("Error adding source:", err);
    }
  };

  const sources = data?.sources || [];
  const intents = data?.intents || [];
  const logs = data?.scan_logs || [];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-150">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Live Scraper Status Bar (Last Scanned & Next Scan Timer) */}
        <ScanStatusBar sources={sources as any} />

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "marketplace"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyers</span>
            <span className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-mono">
              {intents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "sources"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Sources</span>
            <span className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-mono">
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Logs</span>
          </button>
        </div>

        {/* Tab View Contents */}
        {isLoading ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <p className="text-xs font-medium text-zinc-400">Loading Realtime Stream...</p>
          </div>
        ) : (
          <>
            {activeTab === "marketplace" && (
              <BuyersTable intents={intents as any} onSelectIntent={setSelectedIntent} />
            )}

            {activeTab === "sources" && (
              <SourceScheduler
                sources={sources as any}
                onAddSource={handleAddSource}
              />
            )}

            {activeTab === "logs" && <ScanLogs logs={logs as any} />}
          </>
        )}
      </main>

      {/* Buyer Intent Detail Modal */}
      <IntentDetailModal intent={selectedIntent} onClose={() => setSelectedIntent(null)} />
    </div>
  );
}
