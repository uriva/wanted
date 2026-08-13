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

// Strong buyer signals (multilingual)
const BUYER_KEYWORDS = [
  // Hebrew buyer phrases
  "מחפש", "מחפשת", "מחפשים", "מחפשות", "דרוש", "דרושה", "דרושים", "מעוניין", "מעוניינת", "מעוניינים",
  "צריך", "צריכה", "צריכים", "רוצה לקנות", "מחפש לבנות", "מחפשת לבנות", "מחפש מנהלים", "מחפש מערכת",
  "מחפש פרילנסר", "מחפש מתכנת", "מחפש מעצב", "מישהו מכיר", "אשמח להמלצה", "אשמח להצעות", "הצעת מחיר",
  // English buyer phrases
  "looking for", "looking to buy", "looking to hire", "wtb", "in search of", "iso", "in need of",
  "want to purchase", "hiring", "need help with", "looking for a", "seeking a", "anyone selling",
  "recommendation for", "who can build", "need a developer", "need a designer", "budget is"
];

// Exclusion phrases (seller or job seeker announcements, not buyer requests)
const SELLER_EXCLUSIONS = [
  "מציע שירותי", "אני מציע", "מוכר", "למכירה", "אני פרילנסר", "מוזמנים ליצור קשר",
  "for sale", "i offer", "selling my", "offering services", "available for hire", "freelance available"
];

export function analyzePostForBuyerIntent(text: string): IntentAnalysisResult {
  const lowerText = text.toLowerCase();
  
  // Check exclusions first
  let exclusionScore = 0;
  for (const exc of SELLER_EXCLUSIONS) {
    if (lowerText.includes(exc.toLowerCase())) {
      exclusionScore += 0.4;
    }
  }

  // Match buyer keywords
  const matchedKeywords: string[] = [];
  let keywordScore = 0;

  for (const kw of BUYER_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      keywordScore += 0.25;
    }
  }

  // Cap base score
  let baseScore = Math.min(0.95, keywordScore) - exclusionScore;
  if (baseScore < 0) baseScore = 0;

  // Question mark or request indicator boost
  if (text.includes("?") || text.includes("🙏") || text.includes("😃") || text.includes("אשמח")) {
    baseScore += 0.1;
  }

  const confidenceScore = Math.min(0.99, Math.max(0.05, Math.round(baseScore * 100) / 100));
  const isBuyerIntent = confidenceScore >= 0.35 && matchedKeywords.length > 0;

  // Derive title and summary directly from original text (no translation)
  const clean = text.replace(/[\n\r]+/g, " ").trim();
  const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;
  const summary = clean.length > 200 ? clean.substring(0, 200) + "..." : clean;

  return {
    isBuyerIntent,
    confidenceScore,
    intentType: 'buy',
    category: 'Software & AI',
    titleEn: title,
    summaryEn: summary,
    translatedTextEn: text,
    urgency: 'medium',
    matchedKeywords
  };
}
