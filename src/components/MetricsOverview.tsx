"use client";

import { Users, ShoppingBag, Radio, Zap } from "lucide-react";

interface MetricsOverviewProps {
  totalBuyers: number;
  totalIntents: number;
  activeSources: number;
  avgIntervalMinutes: number;
}

export default function MetricsOverview({
  totalBuyers,
  totalIntents,
  activeSources,
  avgIntervalMinutes,
}: MetricsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Buyers Metric */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Verified Buyers</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalBuyers}</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>Profiles tracked across social networks</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent"></div>
      </div>

      {/* Demand Intents Metric */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Buying Demand Signals</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalIntents}</h3>
            <p className="text-[11px] text-purple-400 mt-1">
              Wanted items, custom builds & hiring posts
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-purple-500 to-transparent"></div>
      </div>

      {/* Monitored Sources */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Monitored Channels</p>
            <h3 className="text-2xl font-black text-white mt-1">{activeSources}</h3>
            <p className="text-[11px] text-blue-400 mt-1">
              FB Groups, Reddit, Twitter & WhatsApp
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Radio className="w-5 h-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500 to-transparent"></div>
      </div>

      {/* Adaptive Scheduler State */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Adaptive Decay Cadence</p>
            <h3 className="text-2xl font-black text-white mt-1">
              ~{avgIntervalMinutes} <span className="text-sm font-normal text-slate-400">min</span>
            </h3>
            <p className="text-[11px] text-amber-400 mt-1">
              Exponential decay when idle / instant frequency on hit
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-transparent"></div>
      </div>
    </div>
  );
}
