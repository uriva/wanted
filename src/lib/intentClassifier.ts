import { genJson, injectGeminiToken, z } from "@uri/ai-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export interface IntentAnalysisResult {
  isBuyerIntent: boolean;
  confidenceScore: number; // 0.0 - 1.0
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
  isBuyerIntent: z.boolean().describe("True ONLY if the post expresses a clear buy, hire, build, or service request intent from a buyer or client seeking help/services/products"),
  confidenceScore: z.number().describe("Confidence score between 0.0 and 1.0"),
  category: z.enum(['Software & AI', 'Design & Marketing', 'Services', 'E-commerce', 'Consulting', 'Other']),
  summary: z.string().describe("Concise 1-2 sentence summary of what the buyer wants in the original language"),
});

const geminiClassifier = genJson(
  { provider: "google", mini: true },
  "You are an expert AI classifier that determines whether a social media post expresses BUYER INTENT (e.g. looking to purchase, hire a developer/freelancer, build software, request a service, or find a vendor). Seller announcements, promotional ads, job-seeker posts, or general news should be marked isBuyerIntent = false.",
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
      category: res.category || "Software & AI",
      titleEn: title,
      summaryEn: res.summary || clean,
      translatedTextEn: text,
      urgency: "medium",
      matchedKeywords: ["gemini-ai"],
    };
  } catch (err) {
    console.error("Gemini classification error, using fallback:", err);

    // Heuristic fallback if Gemini fails/times out
    const lowerText = text.toLowerCase();
    const isBuyer = /מחפש|מחפשת|דרוש|דרושה|מעוניין|צריך|looking for|wtb|hiring|need/i.test(lowerText) &&
      !/מציע שירותי|אני מציע|מוכר|for sale|i offer/i.test(lowerText);

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
