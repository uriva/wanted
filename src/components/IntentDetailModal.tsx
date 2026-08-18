"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Link as LinkIcon, Check, MessageSquare, CornerDownRight, Phone } from "lucide-react";
import { extractPhoneInfo } from "@/lib/phoneUtils";

interface IntentDetailModalProps {
  intent: any;
  onClose: () => void;
  allIntents?: any[];
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

function PlatformLogo({ platform, className = "w-4 h-4" }: { platform?: string; className?: string }) {
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

export default function IntentDetailModal({ intent, onClose, allIntents }: IntentDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setImgError(false);
    setFallbackTried(false);
  }, [intent?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (intent) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [intent, onClose]);

  if (!intent) return null;

  const authorExternalId = intent.buyer?.externalAuthorId;
  const platform = intent.buyer?.platform || intent.platform;
  const isNumericFbId =
    platform === "facebook" &&
    authorExternalId &&
    /^\d+$/.test(authorExternalId) &&
    authorExternalId.length < 15;

  let currentSrc = intent.buyer?.avatarUrl;
  if (!currentSrc && isNumericFbId) {
    currentSrc = `https://graph.facebook.com/${authorExternalId}/picture?type=large`;
  }

  const handleImgError = () => {
    if (!fallbackTried && isNumericFbId && currentSrc !== `https://graph.facebook.com/${authorExternalId}/picture?type=large`) {
      setFallbackTried(true);
    } else {
      setImgError(true);
    }
  };

  const effectiveSrc = fallbackTried && isNumericFbId
    ? `https://graph.facebook.com/${authorExternalId}/picture?type=large`
    : currentSrc;

  const profileUrl =
    authorExternalId && authorExternalId !== "fb_anon" && /^\d+$/.test(authorExternalId)
      ? `https://www.facebook.com/${authorExternalId}`
      : intent.buyer?.profileUrl || intent.postUrl;

  const buyerName = intent.buyer?.name || "Anonymous Buyer";
  const initials = buyerName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Detect whether this intent is from a comment
  const isComment =
    Boolean(intent.isComment) ||
    Boolean(intent.parentPostText) ||
    (intent.matchedKeywords && (intent.matchedKeywords.includes("comment") || intent.matchedKeywords.includes("comment-classifier"))) ||
    (typeof intent.externalPostId === "string" && (intent.externalPostId.startsWith("Y29tbWVud") || intent.externalPostId.includes("comment:")));

  // Resolve parent post context
  let parentPostText = intent.parentPostText;
  let parentAuthorName = intent.parentAuthorName;
  let parentPostUrl = intent.parentPostUrl;

  if (isComment && (!parentPostText || !parentAuthorName) && allIntents) {
    const parent = allIntents.find((other: any) => {
      if (other.id === intent.id) return false;
      const otherIsComment =
        other.isComment ||
        (other.matchedKeywords && other.matchedKeywords.includes("comment")) ||
        (other.externalPostId && other.externalPostId.startsWith("Y29tbWVud"));
      if (otherIsComment) return false;
      return other.postUrl === intent.postUrl || (intent.postUrl && intent.postUrl.includes(other.externalPostId));
    });
    if (parent) {
      if (!parentPostText) parentPostText = parent.originalText || parent.title;
      if (!parentAuthorName) parentAuthorName = parent.buyer?.name || "Original Author";
      if (!parentPostUrl) parentPostUrl = parent.postUrl;
    }
  }

  // Calculate direct link to the comment
  const directCommentLink = getDirectCommentLink(intent);
  const mainPostLink = parentPostUrl || intent.postUrl;

  const phoneInfo = extractPhoneInfo(
    `${intent.originalText || ""} ${intent.title || ""}`,
    intent.buyer?.contactInfo
  );

  const handleCopyLink = async () => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set("post", intent.id);
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const platformDisplayName = intent.platform === "twitter" ? "X / Twitter" : intent.platform || "Platform";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative my-8 text-zinc-900 dark:text-zinc-200 transition-colors">
        {/* Top Right Action Controls */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            title="Copy deep link to this post"
            className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header with Clickable Buyer/Commenter Avatar & Name */}
        <div className="flex items-start space-x-4 pr-32">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            title={`View ${buyerName}'s Profile`}
            className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white flex items-center justify-center text-zinc-900 dark:text-white font-bold text-sm shrink-0 overflow-hidden transition-all hover:scale-105 cursor-pointer shadow-sm group"
          >
            {effectiveSrc && !imgError ? (
              <img
                src={effectiveSrc}
                alt={buyerName}
                onError={handleImgError}
                className="w-full h-full rounded-full object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <span>{initials}</span>
            )}
          </a>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                title={`View ${buyerName}'s Profile`}
                className="text-base font-bold text-zinc-900 dark:text-white hover:underline transition-all inline-flex items-center"
              >
                {buyerName}
              </a>
              <span className="px-2 py-0.5 text-[10px] font-mono capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded">
                {platformDisplayName}
              </span>
              {phoneInfo && (
                <a
                  href={phoneInfo.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Chat on WhatsApp: ${phoneInfo.display}`}
                  className="px-2 py-0.5 text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded inline-flex items-center space-x-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer group/chip"
                >
                  <Phone className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{phoneInfo.display}</span>
                  <ExternalLink className="w-2 h-2 opacity-60 group-hover/chip:opacity-100" />
                </a>
              )}
              {isComment && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 rounded inline-flex items-center space-x-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>Comment Response</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
              Published {new Date(intent.publishedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* If this is a comment response, show Original Post Context Card first */}
        {isComment && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Original Post {parentAuthorName ? `by ${parentAuthorName}` : "being responded to"}</span>
              </div>
              {mainPostLink && (
                <a
                  href={mainPostLink}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open original post on ${platformDisplayName}`}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors inline-flex items-center space-x-1.5 group cursor-pointer"
                >
                  <PlatformLogo platform={intent.platform} className="w-3 h-3" />
                  <span>View Original Post</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
                </a>
              )}
            </div>
            <div
              dir="auto"
              className="p-3.5 bg-blue-50/40 dark:bg-zinc-950/60 border border-blue-200/60 dark:border-blue-900/40 border-l-4 border-l-blue-500 dark:border-l-blue-400 rounded-r-lg text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto hebrew-text"
            >
              {parentPostText || "Parent post context"}
            </div>
          </div>
        )}

        {/* Main Content (Comment or Post Content) */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-medium">
              {isComment ? "Comment Content" : "Post Content"}
            </label>
            {directCommentLink && (
              <a
                href={directCommentLink}
                target="_blank"
                rel="noreferrer"
                title={isComment ? `Open this specific comment on ${platformDisplayName}` : `Open post on ${platformDisplayName}`}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors inline-flex items-center space-x-1.5 group cursor-pointer"
              >
                <PlatformLogo platform={intent.platform} className="w-3.5 h-3.5" />
                <span>{isComment ? "Open Comment" : "Open Post"}</span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
              </a>
            )}
          </div>
          <div
            dir="auto"
            className="p-4 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto hebrew-text"
          >
            {intent.originalText || intent.title}
          </div>
        </div>
      </div>
    </div>
  );
}
