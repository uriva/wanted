import {
  parsePhoneNumberFromString,
  findPhoneNumbersInText,
  type CountryCode,
  type PhoneNumber,
} from "libphonenumber-js";

export interface ExtractedPhone {
  raw: string;
  e164: string;
  display: string;
  waUrl: string;
  country?: CountryCode;
}

function cleanCandidate(str: string): string {
  return str.replace(/^[^\d+]+/, "").replace(/[^\d+]+$/, "");
}

function isValidPhoneCandidate(
  parsed: PhoneNumber | undefined,
  rawMatch: string,
  hasPrefix = false
): boolean {
  if (!parsed || !parsed.isValid()) return false;

  const rawTrimmed = rawMatch.trim();

  // 1. Avoid dates (e.g. 2024-05-12, 12/05/2024)
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(rawTrimmed)) return false;
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(rawTrimmed)) return false;

  // 2. Avoid year ranges (e.g. 2020-2024)
  if (/^\d{4}\s*[-–]\s*\d{4}$/.test(rawTrimmed)) return false;

  // 3. If explicit international with +, accept
  if (rawTrimmed.startsWith("+") || (parsed.number.startsWith("+") && rawTrimmed.includes("+"))) {
    return true;
  }

  const cleanDigits = rawTrimmed.replace(/[^\d]/g, "");

  // 4. If preceded by explicit contact/phone prefix, trust libphonenumber validation
  if (hasPrefix) {
    return cleanDigits.length >= 7 && cleanDigits.length <= 15;
  }

  // 5. If IL country: in body text without +, Israeli numbers must start with 0
  if (parsed.country === "IL") {
    return cleanDigits.startsWith("0") && (cleanDigits.length === 9 || cleanDigits.length === 10);
  }

  // 6. If US / CA (NANP): area code must start with 2-9, exchange code 2-9
  if (parsed.country === "US" || parsed.country === "CA") {
    const isNanp = /^[2-9]\d{2}[2-9]\d{6}$/.test(cleanDigits);
    const hasSeparators = /[-.()\s]/.test(rawTrimmed);
    return isNanp && (hasSeparators || cleanDigits.length === 10);
  }

  // 7. General international with separators
  if (cleanDigits.length >= 9 && cleanDigits.length <= 15 && /[-.()\s]/.test(rawTrimmed)) {
    return true;
  }

  return false;
}

/**
 * Robust, library-backed phone extraction and formatting for all countries (US, IL, International)
 */
export function extractPhoneInfo(
  text?: string,
  contactInfo?: string,
  fallbackCountry: CountryCode = "IL"
): ExtractedPhone | null {
  // 1. Try explicit contactInfo first if provided
  if (contactInfo && contactInfo.trim()) {
    const raw = contactInfo.trim();
    for (const c of ["IL", "US", fallbackCountry, undefined] as (CountryCode | undefined)[]) {
      const parsed = c ? parsePhoneNumberFromString(raw, c) : parsePhoneNumberFromString(raw);
      if (parsed && parsed.isValid()) {
        const cleanDigits = parsed.number.replace(/[^\d]/g, "");
        return {
          raw,
          e164: parsed.number,
          display: parsed.formatInternational(),
          waUrl: `https://wa.me/${cleanDigits}`,
          country: parsed.country,
        };
      }
    }
  }

  if (!text || !text.trim()) return null;

  // 2. Normalize WhatsApp links and strip URLs / emails
  const clean = text
    .replace(/https?:\/\/(?:www\.)?(?:api\.)?whatsapp\.com\/send\?phone=(\d+)/gi, "whatsapp: +$1 ")
    .replace(/https?:\/\/(?:www\.)?(?:wa\.me|wa\.link)\/(\+?\d+)/gi, "whatsapp: +$1 ")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, " ");

  const hasHebrew = /[\u0590-\u05FF]/.test(clean);
  const prioritizedCountries: CountryCode[] = hasHebrew ? ["IL", "US"] : ["US", "IL"];

  // 3. Prefix-based extraction (e.g. "Call or text: 803-603-1471", "📞 803-603-1471", "טלפון: 0541234567")
  const prefixRegex =
    /(?:טלפון|טל|נייד|סלולרי|וואטסאפ|ווטסאפ|טלפונים|📞|📱|phone|tel|telephone|cell|mobile|whatsapp|wa\.me|wa\.link|call(?:\s+(?:or|and)\s+text)?|text|contact(?:\s+me)?(?:\s+(?:at|on|via))?)[:\s/]*(\+?[\d\s().-]{7,25})/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = prefixRegex.exec(clean)) !== null) {
    const rawCandidate = pMatch[1].trim();
    const candidate = cleanCandidate(rawCandidate);
    if (!candidate) continue;

    for (const c of [...prioritizedCountries, undefined] as (CountryCode | undefined)[]) {
      let parsed = c ? parsePhoneNumberFromString(candidate, c) : parsePhoneNumberFromString(candidate);
      if (!parsed || !parsed.isValid()) {
        if (!candidate.startsWith("+")) {
          parsed = parsePhoneNumberFromString("+" + candidate);
        }
      }
      if (parsed && isValidPhoneCandidate(parsed, candidate, true)) {
        const cleanDigits = parsed.number.replace(/[^\d]/g, "");
        return {
          raw: rawCandidate,
          e164: parsed.number,
          display: parsed.formatInternational(),
          waUrl: `https://wa.me/${cleanDigits}`,
          country: parsed.country,
        };
      }
    }
  }

  // 4. In-text pattern search with libphonenumber-js for prioritized countries
  for (const c of prioritizedCountries) {
    const matches = findPhoneNumbersInText(clean, c);
    for (const m of matches) {
      const rawMatch = clean.slice(m.startsAt, m.endsAt);
      if (isValidPhoneCandidate(m.number, rawMatch, false)) {
        const cleanDigits = m.number.number.replace(/[^\d]/g, "");
        return {
          raw: rawMatch,
          e164: m.number.number,
          display: m.number.formatInternational(),
          waUrl: `https://wa.me/${cleanDigits}`,
          country: m.number.country,
        };
      }
    }
  }

  return null;
}

/**
 * Format phone string for clean visual display
 */
export function formatPhoneForDisplay(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();

  // Try parsing with libphonenumber
  const parsed = parsePhoneNumberFromString(cleaned, "IL") ||
    parsePhoneNumberFromString(cleaned, "US") ||
    parsePhoneNumberFromString(cleaned.startsWith("+") ? cleaned : `+${cleaned}`);

  if (parsed && parsed.isValid()) {
    return parsed.formatInternational();
  }

  return cleaned;
}

/**
 * Strip summary phone number annotations added by classifier LLMs
 */
export function cleanSummaryPhoneNumbers(summary?: string): string {
  if (!summary) return "";
  return summary
    .replace(/\s*\((?:contact:?\s*)?\+?[\d\s-]{8,18}\)/gi, "")
    .replace(/\s+\+[\d]{9,15}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
