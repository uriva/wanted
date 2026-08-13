import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    sources: i.entity({
      platform: i.string().indexed(),
      name: i.string().indexed(),
      url: i.string(),
      externalId: i.string().indexed(),
      status: i.string().indexed(), // 'active' | 'paused' | 'error'
      checkIntervalMinutes: i.number(),
      minIntervalMinutes: i.number(),
      maxIntervalMinutes: i.number(),
      decayMultiplier: i.number(),
      consecutiveEmptyScrapes: i.number(),
      lastScrapedAt: i.number().indexed(),
      nextScheduledScanAt: i.number().indexed(),
      totalPostsScanned: i.number(),
      totalIntentsFound: i.number(),
      createdAt: i.number().indexed(),
    }),
    buyers: i.entity({
      name: i.string().indexed(),
      platform: i.string().indexed(),
      externalAuthorId: i.string().indexed(),
      profileUrl: i.string(),
      avatarUrl: i.string().optional(),
      contactInfo: i.string().optional(),
      totalIntentPosts: i.number(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    intents: i.entity({
      externalPostId: i.string().indexed(),
      title: i.string().indexed(),
      summary: i.string(),
      originalText: i.string(),
      translatedText: i.string(),
      platform: i.string().indexed(),
      postUrl: i.string(),
      intentType: i.string().indexed(), // 'buy' | 'hire' | 'service_request' | 'partner' | 'custom_build'
      category: i.string().indexed(), // 'Software & AI' | 'Design & Marketing' | 'Services' | 'E-commerce' | 'Consulting' | 'Other'
      budget: i.string().optional(),
      urgency: i.string().optional(),
      confidenceScore: i.number().indexed(),
      matchedKeywords: i.string().optional(),
      publishedAt: i.number().indexed(),
      scrapedAt: i.number().indexed(),
      status: i.string().indexed(), // 'open' | 'matched' | 'archived'
      createdAt: i.number().indexed(),
    }),
    scan_logs: i.entity({
      platform: i.string().indexed(),
      scrapedAt: i.number().indexed(),
      postsFetched: i.number(),
      intentsFound: i.number(),
      nextScanInMinutes: i.number(),
      status: i.string().indexed(),
      message: i.string().optional(),
    }),
  },
  links: {
    sourceIntents: {
      forward: { on: "intents", has: "one", label: "source" },
      reverse: { on: "sources", has: "many", label: "intents" },
    },
    buyerIntents: {
      forward: { on: "intents", has: "one", label: "buyer" },
      reverse: { on: "buyers", has: "many", label: "intents" },
    },
    sourceLogs: {
      forward: { on: "scan_logs", has: "one", label: "source" },
      reverse: { on: "sources", has: "many", label: "logs" },
    },
  },
});

export type AppSchema = typeof _schema;
export default _schema;
