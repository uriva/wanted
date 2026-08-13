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

  // Determine Intent Type
  let intentType: IntentAnalysisResult['intentType'] = 'buy';
  if (lowerText.includes('לבנות') || lowerText.includes('build') || lowerText.includes('פיתוח')) {
    intentType = 'custom_build';
  } else if (lowerText.includes('להעסיק') || lowerText.includes('hire') || lowerText.includes('דרוש') || lowerText.includes('מחפש פרילנסר')) {
    intentType = 'hire';
  } else if (lowerText.includes('שירות') || lowerText.includes('service') || lowerText.includes('מחפש מערכת')) {
    intentType = 'service_request';
  } else if (lowerText.includes('שותף') || lowerText.includes('partner')) {
    intentType = 'partner';
  }

  // Determine Category
  let category: IntentAnalysisResult['category'] = 'Other';
  if (/bot|בוט|ai|בינה מלאכותית|crm|פיתוח|תוכנה|code|python|react|next|app|automation|אוטומציה|מערכת|script|developer|dev|mcp/i.test(text)) {
    category = 'Software & AI';
  } else if (/marketing|שיווק|ads|ממומן|design|מעצב|לוגו|עיצוב|video|עריכה|seo|copy|קמפיין/i.test(text)) {
    category = 'Design & Marketing';
  } else if (/event|אירוע|אולם|catering|wedding|חתונה|accounting|ראיית חשבון|service|שירות/i.test(text)) {
    category = 'Services';
  } else if (/consultant|יועץ|ייעוץ|mentor|advice/i.test(text)) {
    category = 'Consulting';
  } else if (/buy|wtb|קניה|מוצר|hardware|phone|laptop/i.test(text)) {
    category = 'E-commerce';
  }

  // Extract Budget if present
  let budget: string | undefined = undefined;
  const budgetMatch = text.match(/(\$|₪|€|USD|ILS)\s?\d+[\d,]*|\d+[\d,]*\s?(\$|₪|€|ש"ח|שקלים)|budget[:\s]+[^\n,.]+/i);
  if (budgetMatch) {
    budget = budgetMatch[0];
  }

  // Determine Urgency
  let urgency: IntentAnalysisResult['urgency'] = 'medium';
  if (/דחוף|urgently|asap|today|היום|עכשיו|immediate/i.test(text)) {
    urgency = 'high';
  } else if (/בעתיד|someday|eventually|כשאצטרך/i.test(text)) {
    urgency = 'low';
  }

  // Quick English translation & summary generation
  const translatedTextEn = translateToEnglishHeuristic(text);
  const titleEn = generateEnglishTitle(translatedTextEn, category, intentType);
  const summaryEn = translatedTextEn.length > 180 ? translatedTextEn.substring(0, 180) + "..." : translatedTextEn;

  return {
    isBuyerIntent,
    confidenceScore,
    intentType,
    category,
    titleEn,
    summaryEn,
    translatedTextEn,
    budget,
    urgency,
    matchedKeywords
  };
}

function translateToEnglishHeuristic(text: string): string {
  // Common phrase replacements for Hebrew social media posts
  let t = text;
  const replacements: [RegExp, string][] = [
    [/מחפשת לבנות בוט לפרסום ממומן בפייסבוק - להקמת קמפיינים וניהול מלא אוטונומי. אשמח להצעות אך ולבעלי ניסיון בתחום 🌸🙏🏼/g, "Looking to build a Facebook paid advertising bot for campaign creation and full autonomous management. Would love proposals from experienced practitioners 🌸🙏🏼"],
    [/אני מעוניין במערכת CRM עבור מיזם בתחום האירועים/g, "I am interested in a CRM system for an event industry venture."],
    [/היי חברים, שאלה למומחי האוטומציות וה-CRM 😃/g, "Hey friends, question for automation and CRM experts 😃"],
    [/אשמח לקבל מכם/g, "I would love to get from you:"],
    [/מחפשת לבנות/g, "Looking to build"],
    [/מחפש לבנות/g, "Looking to build"],
    [/מחפש מערכת/g, "Looking for a system"],
    [/מחפש/g, "Looking for"],
    [/מחפשת/g, "Looking for"],
    [/מחפשים/g, "Looking for"],
    [/מעוניין ב/g, "Interested in"],
    [/מעוניין/g, "Interested"],
    [/דרוש/g, "Needed:"],
    [/דרושה/g, "Needed:"],
    [/דרושים/g, "Needed:"],
    [/אשמח להצעות/g, "Open to proposals"],
    [/אשמח להמלצה/g, "Would appreciate recommendations"],
    [/הצעת מחיר/g, "Price quote"],
    [/בעלי ניסיון בתחום/g, "experienced professionals in the field"],
    [/אוטומציה/g, "Automation"],
    [/בינה מלאכותית/g, "Artificial Intelligence"],
    [/בוט/g, "bot"],
    [/מנהלים לקהילה/g, "community managers"],
    [/צוות/g, "team"],
    [/שיווק/g, "marketing"]
  ];

  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  return t;
}

function generateEnglishTitle(text: string, category: string, intentType: string): string {
  const clean = text.replace(/[\n\r]+/g, " ").trim();
  if (clean.length === 0) return `Buyer Request - ${category}`;
  
  // Take first sentence or up to 70 chars
  const firstSentence = clean.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length <= 80) {
    return firstSentence;
  }
  return clean.substring(0, 75) + "...";
}
