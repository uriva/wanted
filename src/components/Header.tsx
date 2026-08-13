"use client";

import { useState } from "react";
import { RefreshCw, Database, Radio, Sparkles, PlusCircle } from "lucide-react";

interface HeaderProps {
  onScanAll: () => void;
  onSeed: () => void;
  isScanning: boolean;
  isSeeding: boolean;
}

export default function Header({ onScanAll, onSeed, isScanning, isSeeding }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                  W
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight text-white">WANTED</h1>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  Reverse Marketplace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Buyer Intent Intelligence & Automated Social Scraper Stream
              </p>
            </div>
          </div>

          {/* Status & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50 text-xs text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>InstantDB Sync</span>
            </div>

            <button
              onClick={onSeed}
              disabled={isSeeding}
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
            >
              <Database className={`w-3.5 h-3.5 ${isSeeding ? "animate-bounce text-indigo-400" : ""}`} />
              <span>{isSeeding ? "Seeding..." : "Seed / Reset Sources"}</span>
            </button>

            <button
              onClick={onScanAll}
              disabled={isScanning}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning Social Groups..." : "Scan All Sources Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
