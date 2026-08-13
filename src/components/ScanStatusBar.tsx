"use client";

import { useEffect, useState } from "react";
import { Clock, Radio, ArrowRight, RefreshCw } from "lucide-react";

interface SourceItem {
  id: string;
  name: string;
  platform: string;
  lastScrapedAt?: number;
  nextScheduledScanAt?: number;
  status: string;
}

interface ScanStatusBarProps {
  sources: SourceItem[];
}

function formatRelativeAgo(timestamp?: number): string {
  if (!timestamp) return "Never";
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function ScanStatusBar({ sources }: ScanStatusBarProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!sources || sources.length === 0) return null;

  // Find most recently scanned source
  const lastScanned = [...sources]
    .filter((s) => s.lastScrapedAt)
    .sort((a, b) => (b.lastScrapedAt || 0) - (a.lastScrapedAt || 0))[0];

  // Find next upcoming source to scan
  const nextScheduled = [...sources]
    .filter((s) => s.status === "active" && s.nextScheduledScanAt)
    .sort((a, b) => (a.nextScheduledScanAt || 0) - (b.nextScheduledScanAt || 0))[0];

  // Format countdown for next scheduled scan
  let countdownText = "Ready";
  if (nextScheduled?.nextScheduledScanAt) {
    const remainingMs = nextScheduled.nextScheduledScanAt - now;
    if (remainingMs <= 0) {
      countdownText = "Due now";
    } else {
      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      countdownText = `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
    }
  }

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 mb-6 text-xs text-zinc-800 dark:text-zinc-200 font-mono transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Last Scanned Group */}
        <div className="flex items-center space-x-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
            LAST SCANNED:
          </span>
          <span className="font-bold text-black dark:text-white truncate max-w-[220px]">
            {lastScanned?.name || "None"}
          </span>
          <span className="text-zinc-400 dark:text-zinc-500">
            ({formatRelativeAgo(lastScanned?.lastScrapedAt)})
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700"></div>

        {/* Next Group Due & Countdown Timer */}
        <div className="flex items-center space-x-2.5">
          <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
            NEXT SCAN:
          </span>
          <span className="font-bold text-black dark:text-white truncate max-w-[220px]">
            {nextScheduled?.name || "None"}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-black dark:bg-white text-white dark:text-black rounded">
            {countdownText}
          </span>
        </div>
      </div>
    </div>
  );
}
