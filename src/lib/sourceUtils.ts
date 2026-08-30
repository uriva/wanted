export interface SourceLike {
  id?: string;
  name?: string;
  platform?: string;
  url?: string;
  externalId?: string;
}

export interface ThreadLike {
  id?: string;
  chatId?: string;
  chatName?: string;
}

export interface IntentLike {
  id?: string;
  platform?: string;
  postUrl?: string;
  commentUrl?: string;
  source?: SourceLike | null;
  thread?: ThreadLike | null;
}

export function formatSubredditName(nameOrId?: string): string {
  if (!nameOrId) return "";
  const clean = nameOrId.trim();
  if (!clean) return "";
  if (clean.toLowerCase().startsWith("r/")) {
    return `r/${clean.slice(2)}`;
  }
  return `r/${clean}`;
}

export function extractSubredditFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:reddit\.com\/r\/|^r\/)([A-Za-z0-9_]+)/i);
  return match && match[1] ? formatSubredditName(match[1]) : null;
}

export function extractFacebookGroupFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:facebook\.com\/groups\/)([A-Za-z0-9_.\-]+)/i);
  if (
    match &&
    match[1] &&
    !["permalink", "posts", "feed", "user"].includes(match[1].toLowerCase())
  ) {
    const cleanGroupId = match[1].split("/")[0].split("?")[0];
    return cleanGroupId;
  }
  return null;
}

export interface SourceDisplayNameResult {
  platform: string;
  groupName: string;
  displayName: string;
  isSubreddit: boolean;
}

export function getSourceDisplayName(intent?: IntentLike | null): SourceDisplayNameResult {
  if (!intent) {
    return { platform: "", groupName: "", displayName: "", isSubreddit: false };
  }

  const platform = (intent.platform || intent.source?.platform || "").toLowerCase();
  const sourceName = intent.source?.name?.trim() || "";
  const threadChatName = intent.thread?.chatName?.trim() || "";
  const externalId = intent.source?.externalId?.trim() || "";
  const postUrl = intent.postUrl || intent.commentUrl || intent.source?.url || "";

  if (platform === "reddit") {
    let sub = "";
    if (sourceName) {
      sub = formatSubredditName(sourceName);
    } else if (externalId) {
      sub = formatSubredditName(externalId);
    } else {
      const fromUrl = extractSubredditFromUrl(postUrl);
      if (fromUrl) {
        sub = fromUrl;
      }
    }

    const groupName = sub || "r/reddit";
    return {
      platform: "reddit",
      groupName,
      displayName: groupName,
      isSubreddit: true,
    };
  }

  if (platform === "facebook") {
    let group = sourceName;
    if (!group) {
      const fromUrl = extractFacebookGroupFromUrl(postUrl);
      if (fromUrl) {
        group = `Facebook Group (${fromUrl})`;
      } else if (externalId && externalId !== "fb_anon") {
        group = `Facebook Group (${externalId})`;
      }
    }
    const groupName = group || "Facebook Group";
    return {
      platform: "facebook",
      groupName,
      displayName: groupName,
      isSubreddit: false,
    };
  }

  if (platform === "whatsapp") {
    const groupName =
      sourceName ||
      threadChatName ||
      (externalId && !externalId.includes("@c.us")
        ? `WhatsApp Group (${externalId})`
        : "WhatsApp Group");
    return {
      platform: "whatsapp",
      groupName,
      displayName: groupName,
      isSubreddit: false,
    };
  }

  if (platform === "twitter" || platform === "x") {
    const groupName = sourceName || "X / Twitter";
    return {
      platform: "twitter",
      groupName,
      displayName: groupName,
      isSubreddit: false,
    };
  }

  return {
    platform,
    groupName: sourceName || platform || "Platform",
    displayName: sourceName || platform || "Platform",
    isSubreddit: false,
  };
}
