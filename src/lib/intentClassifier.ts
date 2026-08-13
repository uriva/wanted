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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function analyzePostForBuyerIntent(text: string): Promise<IntentAnalysisResult> {
  const clean = text.replace(/[\n\r]+/g, " ").trim();
  const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;

  if (!text || text.trim().length < 5) {
    return {
      isBuyerIntent: false,
      confidenceScore: 0,
      intentType: "buy",
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

    const prompt = `You are a strict Buyer Intent Classifier. Determine if the post expresses a genuine BUYER or HIRING intent (e.g. author wants to buy a product, hire a freelancer/developer, build custom software, or pay for a service).
MANDATORY RULE: If the post is sharing reflections, personal opinions, vibe coding thoughts, general questions, tutorials, self-promotions, or job-seeking offers, set isBuyerIntent = false.

Post: "${clean.replace(/"/g, '\\"')}"

Respond strictly with a JSON object:
{"isBuyerIntent": boolean, "confidenceScore": number, "summary": "1 sentence summary"}`;

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
        return {
          isBuyerIntent: Boolean(parsed.isBuyerIntent),
          confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : (parsed.isBuyerIntent ? 0.95 : 0.1),
          intentType: "buy",
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
  const isBuyer =
    /מחפש|מחפשת|דרוש|דרושה|מעוניין|צריך|looking for|wtb|hiring|need/i.test(lowerText) &&
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
