export interface RelevantGroup {
  externalId: string;
  name: string;
  url: string;
}

export const RELEVANT_FB_GROUPS: RelevantGroup[] = [
  { externalId: "1657329921376731", name: "אוטומציה - עסקים אוטונומיים", url: "https://www.facebook.com/groups/1657329921376731" },
  { externalId: "talkingautomation", name: "מדברים אוטומציה", url: "https://www.facebook.com/groups/talkingautomation" },
  { externalId: "aibusinesstools", name: "AI Agents | N8N | OpenClaw | Automation", url: "https://www.facebook.com/groups/aibusinesstools" },
  { externalId: "cladue", name: "קלוד (Claude) - קהילת משתמשים", url: "https://www.facebook.com/groups/cladue" },
  { externalId: "aisrael", name: "AI Tech & Agents", url: "https://www.facebook.com/groups/aisrael" },
  { externalId: "1266824747259615", name: "AI Agents Community", url: "https://www.facebook.com/groups/1266824747259615" },
  { externalId: "vibecodingai", name: "Vibe Coding", url: "https://www.facebook.com/groups/vibecodingai" },
  { externalId: "1684554685829832", name: "Vibe Coding Community", url: "https://www.facebook.com/groups/1684554685829832" },
  { externalId: "2753636021674871", name: "Claude Code & OpenClaw & Vibe Coding", url: "https://www.facebook.com/groups/2753636021674871" },
  { externalId: "1427869272255595", name: "Best AI Agents Community", url: "https://www.facebook.com/groups/1427869272255595" },
  { externalId: "aisaas", name: "Artificial Intelligence LLMs", url: "https://www.facebook.com/groups/aisaas" },
  { externalId: "claudeaicommunity", name: "Claude Ai Community", url: "https://www.facebook.com/groups/claudeaicommunity" },
  { externalId: "482067651607538", name: "אופק עסקי | אוטומציה ובינה מלאכותית", url: "https://www.facebook.com/groups/482067651607538" },
];

export const RELEVANT_FB_GROUP_IDS = new Set(
  RELEVANT_FB_GROUPS.map((g) => g.externalId.toLowerCase())
);

export function isWhitelistedGroup(groupIdOrName: string): boolean {
  if (!groupIdOrName) return false;
  const clean = groupIdOrName.toLowerCase().trim();
  return (
    RELEVANT_FB_GROUP_IDS.has(clean) ||
    RELEVANT_FB_GROUPS.some(
      (g) => clean.includes(g.externalId.toLowerCase()) || g.name.toLowerCase().includes(clean)
    )
  );
}
