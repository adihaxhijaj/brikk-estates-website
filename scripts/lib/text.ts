// Text helpers for conservative Albanian listing parsing.

/** Replace diacritics and typographic quotes 1:1 so indices stay aligned with the original string. */
export function fold(s: string): string {
  return s.replace(/[ëËçÇ“”„«»’‘–—]/g, (c) =>
    ({ ë: 'e', Ë: 'E', ç: 'c', Ç: 'C', '“': '"', '”': '"', '„': '"', '«': '"', '»': '"', '’': "'", '‘': "'", '–': '-', '—': '-' })[c] ?? c,
  );
}

export function slugify(s: string): string {
  return fold(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NUMBER_WORDS: Record<string, number> = {
  nje: 1, dy: 2, tri: 3, tre: 3, kater: 4, pese: 5, gjashte: 6, shtate: 7, tete: 8, nente: 9, dhjete: 10,
};
const ORDINAL_WORDS: Record<string, number> = { pare: 1, dyte: 2, trete: 3, katert: 4, peste: 5 };

/** Parses "tri", "3", "3.5", "3,5" (folded input). Returns null if not a count. */
export function parseCount(token: string): number | null {
  const t = fold(token).toLowerCase().trim();
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  if (/^\d+([.,]5)?$/.test(t)) return Number(t.replace(',', '.'));
  return null;
}
export function parseOrdinal(token: string): number | null {
  const t = fold(token).toLowerCase().trim();
  if (t in ORDINAL_WORDS) return ORDINAL_WORDS[t];
  const m = t.match(/^(\d+)(-?(te|re|t|r))?$/);
  return m ? Number(m[1]) : null;
}

/** Money: "160,000" / "2,100" / "1500" / "3500" -> number. Separators followed by exactly 3 digits are thousands. */
export function parseMoney(raw: string): number | null {
  const s = raw.replace(/\s/g, '');
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(s)) return null;
  return Number(s.replace(/[.,]/g, ''));
}

/** Area: "133.03" / "64,2" / "56.595" / "1360" -> number. Agency uses the separator as decimal point in areas. */
export function parseArea(raw: string): number | null {
  const s = raw.replace(/\s/g, '');
  if (!/^\d+([.,]\d+)?$/.test(s)) return null;
  return Number(s.replace(',', '.'));
}

export const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
