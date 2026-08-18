"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/clientDb";
import { id } from "@instantdb/react";
import Header from "@/components/Header";
import BuyersTable from "@/components/BuyersTable";
import SellersTable from "@/components/SellersTable";
import SourceScheduler from "@/components/SourceScheduler";
import ScanLogs from "@/components/ScanLogs";
import IntentDetailModal from "@/components/IntentDetailModal";
import { ShoppingBag, Tag, Radio, Activity, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"buyers" | "sellers" | "sources" | "logs">("buyers");
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

  const sources = data?.sources || [];
  const intents = data?.intents || [];
  const logs = data?.scan_logs || [];

  const buyerIntents = intents.filter((i: any) => i.intentType !== "sell");
  const sellerIntents = intents.filter((i: any) => i.intentType === "sell");
  const activeSources = sources.filter((s: any) => s.status !== "pending_review");

  // Helper to extract post/intent ID from URL query parameters
  const getPostIdFromUrl = useCallback(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("post") || params.get("intent") || params.get("p");
  }, []);

  // Update URL search parameters when opening or closing modal
  const updateUrlPostId = useCallback((postId: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (postId) {
      url.searchParams.set("post", postId);
      url.searchParams.delete("intent");
      url.searchParams.delete("p");
    } else {
      url.searchParams.delete("post");
      url.searchParams.delete("intent");
      url.searchParams.delete("p");
    }
    const newSearch = url.searchParams.toString();
    const newUrl = url.pathname + (newSearch ? `?${newSearch}` : "") + url.hash;
    window.history.pushState(null, "", newUrl);
  }, []);

  const handleSelectIntent = (intent: any) => {
    setSelectedIntent(intent);
    if (intent?.id) {
      updateUrlPostId(intent.id);
    }
  };

  const handleCloseModal = () => {
    setSelectedIntent(null);
    updateUrlPostId(null);
  };

  // Sync state with URL on mount, data changes, and popstate (browser back/forward)
  useEffect(() => {
    const syncFromUrl = () => {
      const postId = getPostIdFromUrl();
      if (postId && intents.length > 0) {
        const match = intents.find(
          (i: any) => i.id === postId || i.externalPostId === postId
        );
        if (match) {
          setSelectedIntent(match);
        }
      } else if (!postId) {
        setSelectedIntent(null);
      }
    };

    syncFromUrl();

    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [intents, getPostIdFromUrl]);

  const handleAddSource = async (newSource: any) => {
    try {
      await db.transact(
        db.tx.sources[id()].create({
          ...newSource,
          status: newSource.status || "pending_review",
          lastScrapedAt: 0,
          nextScheduledScanAt: 0,
          totalPostsScanned: 0,
          totalIntentsFound: 0,
          createdAt: Date.now(),
        })
      );
    } catch (err) {
      console.error("Error adding source:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-150">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 space-x-1 sm:space-x-4 overflow-x-auto">
          {/* Buyers Tab */}
          <button
            onClick={() => setActiveTab("buyers")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "buyers"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyers</span>
            <span className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-mono">
              {buyerIntents.length}
            </span>
          </button>

          {/* Sellers Tab */}
          <button
            onClick={() => setActiveTab("sellers")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === "sellers"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Sellers</span>
            <span className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-mono">
              {sellerIntents.length}
            </span>
          </button>

          {/* Sources Tab */}
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
              {activeSources.length}
            </span>
          </button>

          {/* Logs Tab */}
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
            {activeTab === "buyers" && (
              <BuyersTable intents={intents as any} onSelectIntent={handleSelectIntent} />
            )}

            {activeTab === "sellers" && (
              <SellersTable intents={intents as any} onSelectIntent={handleSelectIntent} />
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

      {/* Post Intent Detail Modal */}
      <IntentDetailModal
        intent={selectedIntent}
        onClose={handleCloseModal}
        allIntents={intents as any}
      />
    </div>
  );
}
