"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/clientDb";
import { id } from "@instantdb/react";
import Header from "@/components/Header";
import MetricsOverview from "@/components/MetricsOverview";
import BuyersTable from "@/components/BuyersTable";
import SourceScheduler from "@/components/SourceScheduler";
import ScanLogs from "@/components/ScanLogs";
import WebhookSimulator from "@/components/WebhookSimulator";
import IntentDetailModal from "@/components/IntentDetailModal";
import { ShoppingBag, Radio, Activity, Sparkles, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"marketplace" | "sources" | "logs" | "webhook">("marketplace");
  const [selectedIntent, setSelectedIntent] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Subscribe to InstantDB real-time state
  const { isLoading, error, data } = db.useQuery({
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
    setIsSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    try {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceAll: true }),
      });
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
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
  const buyers = data?.buyers || [];
  const intents = data?.intents || [];
  const logs = data?.scan_logs || [];

  const avgInterval =
    sources.length > 0
      ? Math.round(sources.reduce((acc, s) => acc + (s.checkIntervalMinutes || 15), 0) / sources.length)
      : 15;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Overview Bar */}
        <MetricsOverview
          totalBuyers={buyers.length}
          totalIntents={intents.length}
          activeSources={sources.length}
          avgIntervalMinutes={avgInterval}
        />

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-6 space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "marketplace"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyers & Demand Stream</span>
            <span className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 rounded-full">
              {intents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "sources"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Monitored Sources</span>
            <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-full">
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Scan Logs</span>
          </button>

          <button
            onClick={() => setActiveTab("webhook")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "webhook"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Inbound Lead Simulator</span>
          </button>
        </div>

        {/* Tab View Contents */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Connecting to InstantDB Realtime Stream...</p>
          </div>
        ) : (
          <>
            {activeTab === "marketplace" && (
              <BuyersTable intents={intents as any} onSelectIntent={setSelectedIntent} />
            )}

            {activeTab === "sources" && (
              <SourceScheduler
                sources={sources as any}
                onScanSource={handleScanSource}
                onAddSource={handleAddSource}
              />
            )}

            {activeTab === "logs" && <ScanLogs logs={logs as any} />}

            {activeTab === "webhook" && (
              <WebhookSimulator onPostSubmitted={() => setActiveTab("marketplace")} />
            )}
          </>
        )}
      </main>

      {/* Buyer Intent Detail Modal */}
      <IntentDetailModal intent={selectedIntent} onClose={() => setSelectedIntent(null)} />
    </div>
  );
}
