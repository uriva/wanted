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

export interface CommentInput {
  id: string;
  authorName?: string;
  authorExternalId?: string;
  isPostAuthor?: boolean;
  text: string;
}

export interface PostContext {
  text: string;
  intentType: "buy" | "sell" | "none" | string;
  authorName?: string;
  authorExternalId?: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export function cleanSummaryPhoneNumbers(summary?: string): string {
  if (!summary) return "";
  return summary
    .replace(/\s*\((?:contact:?\s*)?\+?[\d\s-]{8,18}\)/gi, "")
    .replace(/\s+\+[\d]{9,15}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${key}`;

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
  "summary": "1 concise normalized sentence strictly in English stating what the person is looking to buy/hire or what they are offering/selling (e.g. 'Looking to hire a developer to build an autonomous WhatsApp agent with conversation memory')."
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
          matchedKeywords: ["gemini-3.7-flash"],
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

/**
 * Heuristic fallback for classifying comment intent given parent post context
 */
export function fallbackAnalyzeComment(
  commentText: string,
  postIntentType: string
): IntentAnalysisResult {
  const clean = commentText.replace(/[\n\r]+/g, " ").trim();
  const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;
  const lower = commentText.toLowerCase();

  // Contact info signals (phone, email, WhatsApp, telegram)
  const phonePattern = /(?:05\d-?\d{7}|(?:\+972|972)-?5\d-?\d{7}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b0\d{1,2}-?\d{7}\b)/;
  const hasContact = phonePattern.test(lower) || lower.includes("wa.me") || lower.includes("@") || lower.includes("t.me");

  // Service provider / seller signals in comments
  const sellerPhrases =
    /דבר איתי|דברי איתי|מוזמן לפנות|מוזמנת לפנות|אשמח לעזור|שלחתי בפרטי|שלחתי הודעה|בפרטי|שלח לי הודעה|מציע|יש לי סוכן|יש לי|יש לנו|אנחנו בונים|אנחנו מפתחים|אני מפתח|אני בונה|הצעת מחיר|תיק עבודות|תרגיש חופשי|פנה אליי|פנה אלי|מוזמן ליצור קשר|dm me|pm me|call me|contact me|check dm|i can help|we can build|reach out|portfolio|available for/i;

  // Buyer signals in comments
  const buyerPhrases =
    /מעוניין|מעוניינת|מעוניינים|כמה עולה|מה המחיר|אשמח להצעת מחיר|אני צריך|אני צריכה|גם אני מחפש|גם אני צריך|שלח לי פרטים|רלוונטי|how much|interested|price|pricing|need this too|cost|dm me details/i;

  let intentType: "buy" | "sell" | "none" = "none";

  if (postIntentType === "buy") {
    // If the post is a BUYER looking for help: comments offering contact or services are SELLERS
    if (hasContact || sellerPhrases.test(lower)) {
      intentType = "sell";
    } else if (buyerPhrases.test(lower)) {
      intentType = "buy";
    }
  } else if (postIntentType === "sell") {
    // If the post is a SELLER offering services: comments expressing interest are BUYERS
    if (buyerPhrases.test(lower) || hasContact) {
      intentType = "buy";
    } else if (sellerPhrases.test(lower)) {
      intentType = "sell";
    }
  } else {
    if (sellerPhrases.test(lower) || hasContact) intentType = "sell";
    else if (buyerPhrases.test(lower)) intentType = "buy";
  }

  const hasIntent = intentType !== "none";
  return {
    hasIntent,
    intentType,
    isBuyerIntent: intentType === "buy",
    isSellerIntent: intentType === "sell",
    confidenceScore: hasIntent ? 0.85 : 0.1,
    category: "Software & AI",
    titleEn: title,
    summaryEn: clean,
    translatedTextEn: commentText,
    urgency: "medium",
    matchedKeywords: ["comment-heuristic"],
  };
}

/**
 * Classifies multiple comments on a post in batch using Gemini 3.7 Flash with parent post context
 */
export async function analyzeBatchCommentsIntent(
  comments: CommentInput[],
  postContext: PostContext
): Promise<Map<string, IntentAnalysisResult>> {
  const results = new Map<string, IntentAnalysisResult>();
  if (!comments || comments.length === 0) return results;

  const validComments = comments.filter((c) => c.text && c.text.trim().length >= 3);
  if (validComments.length === 0) return results;

  try {
    const key = GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${key}`;

    const prompt = `You are an expert Social Marketplace Intent Classifier.
You are analyzing comments on a social media post where the original post had a confirmed BUYER or SELLER commercial intent.
Use the context of the original post to identify whether each comment expresses BUYER intent, SELLER (Service Provider / Vendor / Freelancer) intent, or NEITHER.

ORIGINAL POST CONTEXT:
- Author: "${(postContext.authorName || "Author").replace(/"/g, '\\"')}"
- Post Intent: ${postContext.intentType.toUpperCase()}
- Post Content: "${postContext.text.replace(/[\n\r]+/g, " ").replace(/"/g, '\\"')}"

COMMENTS TO CLASSIFY:
${JSON.stringify(
  validComments.map((c, i) => ({
    index: i,
    id: c.id,
    author: c.authorName || "User",
    isOriginalPostAuthor: Boolean(c.isPostAuthor),
    text: c.text.replace(/[\n\r]+/g, " "),
  })),
  null,
  2
)}

CLASSIFICATION RULES & GUIDELINES:
1. ORIGINAL POST AUTHOR COMMENTING ON THEIR OWN POST ("isOriginalPostAuthor": true):
   - This commenter IS the original author of the post adding contact info (phone/WhatsApp), pricing, or follow-up details.
   - Retain the same intentType as the original post (${postContext.intentType.toUpperCase()}).
   - Do NOT classify the author as a prospective buyer responding to their own post or vice versa.
   - Summary must state: "Author providing contact details / follow-up information for their <offer/request> (e.g. 'Author providing contact details to sell Claude AI subscriptions')."

2. SELLER INTENT ("sell"):
   - When responding to a BUYER post (e.g. client looking to hire/buy/build an app, agent, bot, or service): The commenter is acting as a service provider, agency, freelancer, developer, or vendor offering their services, solutions, capacity, portfolio, contact details ("call me / דבר איתי", phone numbers, "DM sent / שלחתי בפרטי", "we build this / יש לי סוכן שעושה עבודה דומה"), or pitching to solve the buyer's requirement.
   - When responding to any post: The commenter is pitching or offering their own services/products/solutions.

3. BUYER INTENT ("buy"):
   - When responding to a SELLER post (e.g. vendor offering services/products): The commenter is a prospective buyer/client interested in buying, requesting pricing/quotes ("how much?", "מעוניין", "כמה עולה"), asking for a demo, or asking to be contacted.
   - When responding to a BUYER post: The commenter states that they also need the same service/product ("I need this too", "מחפש גם").

4. NONE ("none"):
   - General banter, opinions, simple compliments/cheerleading ("בהצלחה", "great job!"), tagging someone without offer/pitch, technical debates, or unrelated remarks without buying or selling intent.

Respond strictly with a JSON array matching this exact schema:
[
  {
    "id": "comment_id",
    "intentType": "buy" | "sell" | "none",
    "confidenceScore": number,
    "summary": "1 concise normalized sentence strictly in English stating what the commenter is offering or requesting in response to the original post (e.g. 'Offering custom WhatsApp bot development services in response to Tidhar Krimov\\'s request for a WhatsApp AI agent')."
  }
]`;

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
        const parsedList = JSON.parse(rawJson);
        if (Array.isArray(parsedList)) {
          for (const item of parsedList) {
            const comment = validComments.find((c) => c.id === item.id) || validComments[item.index];
            if (comment) {
              const intentType: "buy" | "sell" | "none" =
                item.intentType === "buy" || item.intentType === "sell" ? item.intentType : "none";
              const hasIntent = intentType !== "none";
              const clean = comment.text.replace(/[\n\r]+/g, " ").trim();
              const title = clean.length > 80 ? clean.substring(0, 75) + "..." : clean;

              results.set(comment.id, {
                hasIntent,
                intentType,
                isBuyerIntent: intentType === "buy",
                isSellerIntent: intentType === "sell",
                confidenceScore:
                  typeof item.confidenceScore === "number"
                    ? item.confidenceScore
                    : hasIntent
                    ? 0.95
                    : 0.1,
                category: "Software & AI",
                titleEn: title,
                summaryEn: item.summary || clean,
                translatedTextEn: comment.text,
                urgency: "medium",
                matchedKeywords: ["gemini-comment-classifier"],
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Gemini batch comment classification failed, applying heuristic fallback:", err);
  }

  // Fallback for any comments not classified yet
  for (const comment of validComments) {
    if (!results.has(comment.id)) {
      results.set(comment.id, fallbackAnalyzeComment(comment.text, postContext.intentType));
    }
  }

  return results;
}

// Single comment classifier helper
export async function analyzeCommentIntent(
  commentText: string,
  postContext: PostContext,
  authorName?: string
): Promise<IntentAnalysisResult> {
  const tempId = "temp_comment";
  const map = await analyzeBatchCommentsIntent(
    [{ id: tempId, text: commentText, authorName }],
    postContext
  );
  return map.get(tempId) || fallbackAnalyzeComment(commentText, postContext.intentType);
}

// Backward-compatible alias
export const analyzePostForBuyerIntent = analyzePostIntent;
