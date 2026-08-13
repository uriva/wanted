import { genJson, injectGeminiToken, z } from "@uri/ai-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export interface IntentAnalysisResult {
  isBuyerIntent: boolean;
  confidenceScore: number;
  intentType: 'buy' | 'hire' | 'service_request' | 'partner' | 'custom_build';
  category: 'Software & AI' | 'Design & Marketing' | 'Services' | 'E-commerce' | 'Consulting' | 'Other';
  titleEn: string;
  summaryEn: string;
  translatedTextEn: string;
  budget?: string;
  urgency: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
}

const buyerIntentSchema = z.object({
  isBuyerIntent: z.boolean().describe("Set to true ONLY if the author is actively seeking to hire, buy, pay for a service, build software, or find a vendor/freelancer. Set to false for discussions, showcases, opinion posts, job seekers, or promotions."),
  confidenceScore: z.number().describe("Confidence score between 0.0 and 1.0"),
  summary: z.string().describe("Short 1 sentence summary of the request"),
});

const geminiClassifier = genJson(
  { provider: "google", mini: true },
  "Strict Buyer Intent Classifier: Evaluate if a social media post represents a buyer or client seeking to hire, buy, or pay for a service. MANDATORY RULE: If a post is sharing personal thoughts, opinions, tutorial content, vibe coding reflections, self-promotions, or general questions, output isBuyerIntent = false.",
  buyerIntentSchema
);

export async function analyzePostForBuyerIntent(text: string): Promise<IntentAnalysisResult> {
  const clean = text.replace(/[\n\r]+/g, " ").trim();
  const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;

  try {
    const key = GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY not configured");
    }
    const run = injectGeminiToken(key)(() => geminiClassifier(text));
    const res = await run();

    return {
      isBuyerIntent: Boolean(res.isBuyerIntent),
      confidenceScore: res.confidenceScore ?? (res.isBuyerIntent ? 0.95 : 0.1),
      intentType: "buy",
      category: "Software & AI",
      titleEn: title,
      summaryEn: res.summary || clean,
      translatedTextEn: text,
      urgency: "medium",
      matchedKeywords: ["gemini-ai"],
    };
  } catch (err) {
    console.error("Gemini classification error, using fallback:", err);

    // Heuristic fallback
    const lowerText = text.toLowerCase();
    const isBuyer = /מחפש|מחפשת|דרוש|דרושה|מעוניין|צריך|looking for|wtb|hiring|need/i.test(lowerText) &&
      !/מציע שירותי|אני מציע|מוכר|for sale|i offer|משהו מאוד מספק|ויב קודינג|vibe coding/i.test(lowerText);

    return {
      isBuyerIntent: isBuyer,
      confidenceScore: isBuyer ? 0.8 : 0.1,
      intentType: "buy",
      category: "Software & AI",
      titleEn: title,
      summaryEn: clean,
      translatedTextEn: text,
      urgency: "medium",
      matchedKeywords: ["fallback"],
    };
  }
}
