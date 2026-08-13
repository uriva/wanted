"use client";

import { Activity, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface ScanLog {
  id: string;
  platform: string;
  scrapedAt: number;
  postsFetched: number;
  intentsFound: number;
  nextScanInMinutes: number;
  status: string;
  message?: string;
}

interface ScanLogsProps {
  logs: ScanLog[];
}

export default function ScanLogs({ logs }: ScanLogsProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-white">Scraper Activity & Scheduler Audit Log</h2>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-slate-500 text-xs py-8 text-center">
            No scan logs recorded yet. Click "Scan All Sources Now" to run an initial scan.
          </p>
        ) : (
          logs.slice(0, 15).map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between text-xs font-mono"
            >
              <div className="flex items-start space-x-3">
                {log.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200 capitalize">[{log.platform}]</span>
                    <span className="text-slate-400">{log.message}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 font-sans">
                    <span>Fetched: {log.postsFetched} posts</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      Discovered {log.intentsFound} buyer intents
                    </span>
                    <span>•</span>
                    <span className="text-amber-400">Next poll in {log.nextScanInMinutes}m</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 shrink-0 font-sans">
                {new Date(log.scrapedAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
