"use client";

import { Activity, CheckCircle2, AlertCircle } from "lucide-react";

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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-4 h-4 text-zinc-300" />
        <h2 className="text-base font-bold text-white">Scraper Activity Logs</h2>
      </div>

      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <p className="text-zinc-500 text-xs py-8 text-center font-mono">
            No scan logs recorded yet.
          </p>
        ) : (
          logs.slice(0, 15).map((log) => (
            <div
              key={log.id}
              className="p-3 bg-black border border-zinc-800 rounded-lg flex items-start justify-between text-xs font-mono"
            >
              <div className="flex items-start space-x-3">
                {log.status === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-200 capitalize">[{log.platform}]</span>
                    <span className="text-zinc-400">{log.message}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-zinc-500 mt-1">
                    <span>Fetched: {log.postsFetched}</span>
                    <span>•</span>
                    <span className="text-zinc-300">Intents: {log.intentsFound}</span>
                    <span>•</span>
                    <span>Next: {log.nextScanInMinutes}m</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-zinc-500 shrink-0">
                {new Date(log.scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
