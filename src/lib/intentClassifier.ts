export interface IntentAnalysisResult {
  hasIntent: boolean;
  intentType: "buy" | "sell" | "none";
  isBuyerIntent: boolean;
  isSellerIntent: boolean;
  confidenceScore: number;
  category: "Software & AI" | "Design & Marketing" | "Services" | "E-commerce" | "Consulting" | "Other";
  titleEn: string;
  summaryEn: string;
  translatedTextEn: string;
  budget?: string;
  urgency: "high" | "medium" | "low";
  matchedKeywords: string[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function analyzePostIntent(text: string): Promise<IntentAnalysisResult> {
  const clean = text.replace(/[\n\r]+/g, " ").trim();
  const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;

  if (!text || text.trim().length < 5) {
    return {
      hasIntent: false,
      intentType: "none",
      isBuyerIntent: false,
      isSellerIntent: false,
      confidenceScore: 0,
      category: "Other",
      titleEn: title,
      summaryEn: clean,
      translatedTextEn: text,
      urgency: "low",
      matchedKeywords: [],
    };
  }

  try {
    const key = GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;

    const prompt = `You are an expert Social Marketplace Intent Classifier.
Analyze the following social media post to identify whether the author expresses BUYER intent or SELLER intent:

1. BUYER INTENT ("buy"): The author is a client/buyer looking to purchase products, hire a freelancer/agency/developer, request a service, or pay for custom development/solutions. (e.g. "Looking for a developer to build X", "מחפש מעצב", "דרוש מתכנת", "Anyone selling X?", "Need someone to fix our database").

2. SELLER INTENT ("sell"): The author is an agency, vendor, or freelancer actively offering/selling services, software products, freelancing capacity, SaaS tools, templates, or consulting. (e.g. "I offer custom automation services", "אני מציע שירותי פיתוח", "For sale: MacBook Pro", "למכירה", "Available for freelance projects", "We just launched tool X and offering setups").

3. NONE ("none"): General discussions, technical questions, tutorials, news, personal opinions, memes, or tech reflections without an active buy or sell proposition.

Post: "${clean.replace(/"/g, '\\"')}"

Respond strictly with a JSON object in this exact format:
{
  "intentType": "buy" | "sell" | "none",
  "confidenceScore": number,
  "summary": "1-2 concise sentence summary in the post language or English summarizing what the buyer wants or what the seller is offering"
}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const intentType: "buy" | "sell" | "none" =
          parsed.intentType === "buy" || parsed.intentType === "sell" ? parsed.intentType : "none";
        const hasIntent = intentType !== "none";

        return {
          hasIntent,
          intentType,
          isBuyerIntent: intentType === "buy",
          isSellerIntent: intentType === "sell",
          confidenceScore:
            typeof parsed.confidenceScore === "number"
              ? parsed.confidenceScore
              : hasIntent
              ? 0.95
              : 0.1,
          category: "Software & AI",
          titleEn: title,
          summaryEn: parsed.summary || clean,
          translatedTextEn: text,
          urgency: "medium",
          matchedKeywords: ["gemini-3.6-flash"],
        };
      }
    }
  } catch (err) {
    console.error("Gemini API call failed, falling back to heuristic:", err);
  }

  // Heuristic fallback if API call fails
  const lowerText = text.toLowerCase();
  const buyerSignals =
    /מחפש|מחפשת|מחפשים|דרוש|דרושה|דרושים|מעוניין|מעוניינת|מעוניינים|צריך|צריכה|צריכים|רוצה לקנות|מחפש פרילנסר|מחפש מתכנת|מחפש מעצב|looking for|looking to hire|looking to buy|wtb|hiring|in search of|need a|who can build|seeking a/i;

  const sellerSignals =
    /מציע שירותי|אני מציע|אנו מציעים|מוכר|מוכרת|מוכרים|למכירה|אני פרילנסר|שירותי פיתוח|שירותי שיווק|שירותי אוטומציה|מוזמנים ליצור קשר|מזמין אתכם|השירות שלנו|אנחנו בונים|for sale|i offer|we offer|offering services|available for hire|freelance available|freelancer available|our agency offers|dm me for details/i;

  let fallbackType: "buy" | "sell" | "none" = "none";
  if (buyerSignals.test(lowerText) && !sellerSignals.test(lowerText)) {
    fallbackType = "buy";
  } else if (sellerSignals.test(lowerText)) {
    fallbackType = "sell";
  }

  const hasIntent = fallbackType !== "none";

  return {
    hasIntent,
    intentType: fallbackType,
    isBuyerIntent: fallbackType === "buy",
    isSellerIntent: fallbackType === "sell",
    confidenceScore: hasIntent ? 0.8 : 0.1,
    category: "Software & AI",
    titleEn: title,
    summaryEn: clean,
    translatedTextEn: text,
    urgency: "medium",
    matchedKeywords: ["fallback"],
  };
}

// Backward-compatible alias
export const analyzePostForBuyerIntent = analyzePostIntent;
