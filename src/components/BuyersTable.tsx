"use client";

import { useState } from "react";
import { Search, AlertCircle, Clock, Phone, ExternalLink } from "lucide-react";
import { extractPhoneInfo, cleanSummaryPhoneNumbers } from "@/lib/phoneUtils";

interface IntentItem {
  id: string;
  externalPostId?: string;
  title: string;
  summary: string;
  originalText: string;
  translatedText: string;
  platform: string;
  postUrl: string;
  intentType?: string;
  confidenceScore: number;
  publishedAt: number;
  isComment?: boolean;
  commentUrl?: string;
  parentPostText?: string;
  parentAuthorName?: string;
  parentPostUrl?: string;
  matchedKeywords?: string;
  buyer?: {
    id: string;
    name: string;
    profileUrl: string;
    avatarUrl?: string;
    platform: string;
    contactInfo?: string;
    externalAuthorId?: string;
  };
}

interface BuyersTableProps {
  intents: IntentItem[];
  onSelectIntent: (intent: IntentItem) => void;
}

function getFacebookProfileUrl(buyer?: any): string | null {
  if (!buyer) return null;
  const authorId = buyer.externalAuthorId;
  if (authorId && authorId !== "fb_anon") {
    if (/^\d+$/.test(authorId) || authorId.startsWith("pfbid")) {
      return `https://www.facebook.com/${authorId}`;
    }
  }
  const pUrl = buyer.profileUrl;
  if (
    pUrl &&
    pUrl.startsWith("http") &&
    !pUrl.includes("/permalink/") &&
    !pUrl.includes("/posts/") &&
    pUrl !== "https://facebook.com"
  ) {
    return pUrl;
  }
  return null;
}

function decodeFacebookCommentId(idStr?: string): string | null {
  if (!idStr) return null;
  const str = String(idStr);

  if (str.startsWith("Y29tbWVud") || /^[A-Za-z0-9+/=]+$/.test(str)) {
    try {
      const decoded = typeof window !== "undefined" ? atob(str) : Buffer.from(str, "base64").toString("utf-8");
      if (decoded.includes("comment:") || decoded.includes("_")) {
        const m = decoded.match(/_(\d+)/) || decoded.match(/comment:(\d+)/);
        if (m) return m[1];
      }
    } catch {}
  }

  const m = str.match(/_(\d+)$/) || str.match(/comment:?\d*_?(\d+)/);
  if (m) return m[1];
  if (/^\d{10,}$/.test(str)) return str;
  return null;
}

function getDirectCommentLink(intent: any): string {
  if (intent.commentUrl && intent.commentUrl !== intent.postUrl) {
    return intent.commentUrl;
  }
  const platform = (intent.platform || "").toLowerCase();
  const base = intent.postUrl || "";
  if (platform === "facebook" && base) {
    const commentId = decodeFacebookCommentId(intent.externalPostId);
    if (commentId) {
      try {
        const u = new URL(base);
        u.searchParams.set("comment_id", commentId);
        return u.toString();
      } catch {
        const sep = base.includes("?") ? "&" : "?";
        return `${base}${sep}comment_id=${commentId}`;
      }
    }
  }
  if (platform === "reddit" && base) {
    if (intent.externalPostId) {
      const cleanId = intent.externalPostId.replace(/^t1_/, "");
      if (cleanId && !base.includes(cleanId)) {
        return base.endsWith("/") ? `${base}${cleanId}/` : `${base}/${cleanId}/`;
      }
    }
  }
  return intent.commentUrl || intent.postUrl;
}

function PlatformLogo({ platform, className = "w-3 h-3" }: { platform?: string; className?: string }) {
  const p = (platform || "").toLowerCase();

  if (p === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  if (p === "whatsapp") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    );
  }

  if (p === "twitter" || p === "x") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (p === "reddit") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-1.486 3.468 3.738-1.121C7.886 23.593 9.873 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm7.14 13.882c.045.228.069.463.069.704 0 2.872-3.134 5.2-7.009 5.2s-7.009-2.328-7.009-5.2c0-.241.024-.476.069-.704a2.004 2.004 0 0 1-1.06-1.757c0-1.105.895-2 2-2 .542 0 1.034.215 1.398.565 1.25-.873 2.936-1.428 4.796-1.49l.944-4.437 3.085.656a1.498 1.498 0 0 1 1.437 1.065 1.5 1.5 0 0 1-.86 1.888l-2.454-.522-.729 3.428c1.84.07 3.507.622 4.743 1.488.364-.35.856-.565 1.398-.565 1.105 0 2 .895 2 2 0 .736-.399 1.378-1.013 1.721z" />
      </svg>
    );
  }

  return <ExternalLink className={className} />;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "recently";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString();
}

function BuyerAvatar({
  name,
  avatarUrl,
  platform,
  externalAuthorId,
}: {
  name?: string;
  avatarUrl?: string;
  platform?: string;
  externalAuthorId?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);

  const isNumericFbId =
    platform === "facebook" &&
    externalAuthorId &&
    /^\d+$/.test(externalAuthorId) &&
    externalAuthorId.length < 15;

  let currentSrc = avatarUrl;
  if (!currentSrc && isNumericFbId) {
    currentSrc = `https://graph.facebook.com/${externalAuthorId}/picture?type=large`;
  }

  const handleImgError = () => {
    if (!fallbackTried && isNumericFbId && currentSrc !== `https://graph.facebook.com/${externalAuthorId}/picture?type=large`) {
      setFallbackTried(true);
    } else {
      setImgError(true);
    }
  };

  const effectiveSrc = fallbackTried && isNumericFbId
    ? `https://graph.facebook.com/${externalAuthorId}/picture?type=large`
    : currentSrc;

  const initials = (name || "B")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-semibold text-xs shrink-0 overflow-hidden">
      {effectiveSrc && !imgError ? (
        <img
          src={effectiveSrc}
          alt={name || "Buyer"}
          onError={handleImgError}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default function BuyersTable({ intents, onSelectIntent }: BuyersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter only buyer intents
  const buyerIntents = intents.filter((i) => i.intentType !== "sell");

  // Deduplicate items by originalText or externalPostId
  const seenKeys = new Set<string>();
  const uniqueIntents = buyerIntents.filter((item) => {
    const key = item.externalPostId || (item.originalText || "").trim().toLowerCase();
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const filteredIntents = uniqueIntents.filter((item) => {
    const text = item.originalText || item.title || "";
    const summary = item.summary || "";
    const name = item.buyer?.name || "";
    const phoneInfo = extractPhoneInfo(`${text} ${summary}`, item.buyer?.contactInfo);
    const term = searchTerm.toLowerCase();

    return (
      summary.toLowerCase().includes(term) ||
      text.toLowerCase().includes(term) ||
      name.toLowerCase().includes(term) ||
      (phoneInfo && (
        phoneInfo.display.toLowerCase().includes(term) ||
        phoneInfo.raw.toLowerCase().includes(term) ||
        phoneInfo.e164.toLowerCase().includes(term)
      ))
    );
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search buyers, normalized demand, or names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-all font-normal"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-black/60 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="py-3 px-4 sm:px-6">Person</th>
              <th className="py-3 px-4 sm:px-6">What They Want</th>
              <th className="py-3 px-4 sm:px-6 text-right">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
            {filteredIntents.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-zinc-500">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <AlertCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-600 mb-2" />
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">No matching buyers found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredIntents.map((item) => {
                const isComment =
                  Boolean(item.isComment) ||
                  Boolean(item.parentPostText) ||
                  (item.matchedKeywords && item.matchedKeywords.includes("comment")) ||
                  (typeof item.externalPostId === "string" && item.externalPostId.startsWith("Y29tbWVud"));

                const phoneInfo = extractPhoneInfo(
                  `${item.originalText || ""} ${item.title || ""}`,
                  item.buyer?.contactInfo
                );
                const fbProfileUrl = item.platform === "facebook" ? getFacebookProfileUrl(item.buyer) : null;
                const directLink = getDirectCommentLink(item);
                const rawSummary = item.summary || item.translatedText || item.title || item.originalText;
                const normalizedOneLiner = cleanSummaryPhoneNumbers(rawSummary);

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectIntent(item)}
                    title="Click row to view original post and discussion context"
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                  >
                    {/* Person Column */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap align-middle">
                      <div className="flex items-center space-x-3">
                        <BuyerAvatar
                          name={item.buyer?.name}
                          avatarUrl={item.buyer?.avatarUrl}
                          platform={item.buyer?.platform || item.platform}
                          externalAuthorId={item.buyer?.externalAuthorId}
                        />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors block text-xs">
                          {item.buyer?.name || "Anonymous Buyer"}
                        </span>
                      </div>
                    </td>

                    {/* What They Want Column */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="space-y-2">
                        {/* Normalized One-Liner in English */}
                        <p className="text-xs font-normal text-zinc-900 dark:text-zinc-100 leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors">
                          {normalizedOneLiner}
                        </p>

                        {/* Chips Row: Phone, FB Profile, Direct Comment/Post Link */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 pt-0.5">
                          {/* Phone Chip (Links to WhatsApp) */}
                          {phoneInfo && (
                            <a
                              href={phoneInfo.waUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Chat on WhatsApp: ${phoneInfo.display}`}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer group/chip"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{phoneInfo.display}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/chip:opacity-100" />
                            </a>
                          )}

                          {/* Facebook Profile Link Chip */}
                          {fbProfileUrl && (
                            <a
                              href={fbProfileUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`View ${item.buyer?.name || "Buyer"}'s Facebook profile`}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors group/chip cursor-pointer"
                            >
                              <PlatformLogo platform="facebook" className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>FB Profile</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/chip:opacity-100" />
                            </a>
                          )}

                          {/* Direct Comment / Post Link Chip */}
                          {directLink && (
                            <a
                              href={directLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={isComment ? "Open comment on source platform" : "Open post on source platform"}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors group/chip cursor-pointer"
                            >
                              <PlatformLogo platform={item.platform} className="w-3 h-3 shrink-0" />
                              <span>{isComment ? "Comment Link" : "Post Link"}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/chip:opacity-100" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Posted Date (Relative) */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400 text-right align-top">
                      <div className="flex items-center justify-end space-x-1.5 font-normal">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>{formatRelativeTime(item.publishedAt)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
