"use client";

import { X, ExternalLink, User, Clock, Tag, DollarSign, AlertCircle, Sparkles, MessageSquare, ShieldCheck } from "lucide-react";

interface IntentDetailModalProps {
  intent: any;
  onClose: () => void;
}

export default function IntentDetailModal({ intent, onClose }: IntentDetailModalProps) {
  if (!intent) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-4 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg">
            {intent.buyer?.avatarUrl ? (
              <img
                src={intent.buyer.avatarUrl}
                alt={intent.buyer.name}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              (intent.buyer?.name || "B").substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white">{intent.buyer?.name || "Anonymous Buyer"}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                {intent.platform}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified Buyer Demand Post • Published {new Date(intent.publishedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* English Title & Demand Summary */}
        <div className="mt-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENGLISH BUYER INTENT SUMMARY</span>
          </div>
          <h3 className="text-base font-bold text-white">{intent.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{intent.summary}</p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Category</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{intent.category}</span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Intent Type</span>
            <span className="font-bold text-indigo-300 mt-0.5 block capitalize">{intent.intentType}</span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Confidence Score</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">
              {((intent.confidenceScore || 0.85) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Original Post Raw Text */}
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 block">
            Original Post Text (Source Language)
          </label>
          <div
            dir="auto"
            className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto hebrew-text"
          >
            {intent.originalText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          {intent.buyer?.profileUrl ? (
            <a
              href={intent.buyer.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all inline-flex items-center space-x-2"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>View Buyer Profile</span>
            </a>
          ) : (
            <div />
          )}

          <a
            href={intent.postUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center space-x-2"
          >
            <span>Open Original Social Post</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
