const WORD_BOUNDARY = /(^|[\s\-/])(\S)/g;
const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "by",
  "for",
  "in",
  "of",
  "on",
  "to",
  "with",
  "from",
  "at",
]);

function hasLowercaseLetter(value) {
  return /[a-zà-öø-ÿ]/.test(value);
}

function countLetters(value) {
  return Array.from(value).filter((char) => /\p{L}/u.test(char));
}

export function isAllCapsStyleTitle(value) {
  if (typeof value !== "string") return false;

  const letters = countLetters(value);
  if (letters.length < 2) return false;
  if (hasLowercaseLetter(value)) return false;

  const uppercaseLetters = letters.filter((char) => char === char.toLocaleUpperCase());
  return uppercaseLetters.length / letters.length >= 0.8;
}

export function normalizeListingDisplayTitle(value, fallback = "Property") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  if (!isAllCapsStyleTitle(trimmed)) return trimmed;

  const titleCase = trimmed
    .toLocaleLowerCase()
    .replace(WORD_BOUNDARY, (_match, prefix, char) => `${prefix}${char.toLocaleUpperCase()}`);

  const words = titleCase.split(" ");
  return words
    .map((word, index) => {
      if (index === 0 || index === words.length - 1) return word;
      return SMALL_WORDS.has(word.toLocaleLowerCase()) ? word.toLocaleLowerCase() : word;
    })
    .join(" ");
}
