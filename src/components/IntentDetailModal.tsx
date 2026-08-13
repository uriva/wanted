"use client";

import { X, ExternalLink, User } from "lucide-react";

interface IntentDetailModalProps {
  intent: any;
  onClose: () => void;
}

export default function IntentDetailModal({ intent, onClose }: IntentDetailModalProps) {
  if (!intent) return null;

  const profileUrl =
    intent.buyer?.externalAuthorId && intent.buyer.externalAuthorId !== "fb_anon" && /^\d+$/.test(intent.buyer.externalAuthorId)
      ? `https://www.facebook.com/${intent.buyer.externalAuthorId}`
      : intent.buyer?.profileUrl || intent.postUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative my-8 text-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-4 pr-8">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {intent.buyer?.avatarUrl ? (
              <img
                src={intent.buyer.avatarUrl}
                alt={intent.buyer.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (intent.buyer?.name || "B").substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">{intent.buyer?.name || "Anonymous Buyer"}</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono capitalize bg-zinc-800 text-zinc-300 border border-zinc-700 rounded">
                {intent.platform}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              Published {new Date(intent.publishedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Original Post Text */}
        <div className="mt-6 space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
            Post Content
          </label>
          <div
            dir="auto"
            className="p-4 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto hebrew-text"
          >
            {intent.originalText || intent.title}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all inline-flex items-center space-x-2"
          >
            <User className="w-3.5 h-3.5 text-zinc-300" />
            <span>View Buyer Profile</span>
          </a>

          <a
            href={intent.postUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-all inline-flex items-center space-x-2"
          >
            <span>Open Social Post</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
