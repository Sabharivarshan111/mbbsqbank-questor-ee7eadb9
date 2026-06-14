// Multilingual profanity / body-shaming filter for display names.
// Coverage: English + transliterated & native Tamil, Telugu, Malayalam, Hindi.
// Word list is intentionally compact and curated. Add to TERMS as needed.

const TERMS = [
  // English — slurs / sexual / hate
  "fuck", "fck", "fuk", "shit", "sht", "bitch", "btch", "bastard", "asshole",
  "ass", "arse", "dick", "cock", "cunt", "pussy", "slut", "whore", "hoe",
  "rape", "rapist", "nigga", "nigger", "faggot", "retard", "retarded",
  "motherfucker", "mf", "bullshit", "pedo", "pedophile", "incest", "porn",
  // English — body shaming
  "fatso", "fatty", "lardass", "uglyass", "ugly", "anorexic", "midget",
  "dwarf", "stupidface", "pigface", "moron", "idiot", "dumbass",
  "noob",

  // Hindi (Devanagari)
  "चूत", "चुत", "लंड", "लण्ड", "गांड", "गाँड", "मादरचोद", "बहनचोद",
  "भोसडी", "भोसड़ी", "हरामी", "कुत्ता", "रंडी", "साला", "साली",
  // Hindi (roman / Hinglish)
  "chutiya", "chutia", "chootiya", "madarchod", "behenchod", "bhenchod",
  "bhosdike", "bhosdi", "bhosadi", "bhosdk", "mc", "bc", "randi", "haramkhor",
  "harami", "gandu", "gaand", "lund", "lavda", "lawda", "chodu", "chod",

  // Tamil (Tamil script)
  "புண்டை", "புண்ட", "ஓத்தா", "ஓத", "தேவ்டியா", "தேவடியா", "சுன்னி",
  "கூதி", "கூத்தி", "முண்ட", "முண்டே",
  // Tamil (roman)
  "pundai", "punda", "oththa", "otha", "thevdiya", "thevadiya", "sunni",
  "koothi", "koothiya", "munda", "kena",

  // Telugu (Telugu script)
  "పూకు", "పుకు", "మొడ్డ", "దెంగ", "దెంగు", "లంజ", "లంజా", "గుడ్డ",
  // Telugu (roman)
  "pooku", "puku", "modda", "dengey", "dengu", "denga", "lanja", "lanjakodaka",
  "gudda",

  // Malayalam (Malayalam script)
  "പൂറ്", "പൂര്", "പൂറി", "കുണ്ണ", "കുണ്ണാ", "തേവിടിച്ചി", "മൈര്", "മൈറ്",
  "പട്ടി",
  // Malayalam (roman)
  "poori", "poor", "kunna", "myre", "myr", "thevdichi", "thevidichi", "patti",
];

const LEET: Record<string, string> = {
  "@": "a", "4": "a", "$": "s", "5": "s", "0": "o", "1": "i", "!": "i",
  "3": "e", "7": "t", "+": "t",
};

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(input: string) {
  let s = stripDiacritics(input.toLowerCase());
  s = s.replace(/[@$0-9!+]/g, (ch) => LEET[ch] ?? ch);
  // collapse 3+ repeats: "aaass" -> "aas"
  s = s.replace(/(.)\1{2,}/g, "$1$1");
  return s;
}

function isIndicScript(term: string) {
  // Devanagari, Tamil, Telugu, Malayalam blocks
  return /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]/.test(term);
}

const LATIN_TERMS = TERMS.filter((t) => !isIndicScript(t)).map((t) => t.toLowerCase());
const INDIC_TERMS = TERMS.filter(isIndicScript);

// Pre-build a word-boundary regex for Latin terms (escaped)
function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const LATIN_RE = new RegExp(
  "\\b(" + LATIN_TERMS.map(escape).join("|") + ")\\b",
  "i"
);

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateDisplayName(raw: string): ValidationResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: false, reason: "Please enter a name." };
  if (trimmed.length > 40) return { ok: false, reason: "Name must be 40 characters or less." };
  // Must contain at least one letter (any script)
  if (!/[\p{L}]/u.test(trimmed)) {
    return { ok: false, reason: "Name must include letters." };
  }

  const normalized = normalize(trimmed);

  // Latin: word-boundary so "Assam" / "class" don't trip
  if (LATIN_RE.test(normalized)) {
    return {
      ok: false,
      reason: "Please choose a respectful name — no slurs, hate speech or body-shaming words.",
    };
  }

  // Indic scripts: substring match against the original lowercased input
  const lowered = trimmed.toLowerCase();
  for (const t of INDIC_TERMS) {
    if (lowered.includes(t.toLowerCase())) {
      return {
        ok: false,
        reason: "Please choose a respectful name — no slurs, hate speech or body-shaming words.",
      };
    }
  }

  return { ok: true };
}
