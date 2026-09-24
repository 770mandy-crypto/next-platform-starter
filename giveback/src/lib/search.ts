// Client mirror of the database's Hebrew search normalisation
// (gb_normalize / gb_token_variants in the migration). Used to highlight
// and to pre-check alert queries; the database remains the source of truth.

const FINAL: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const PREFIXES = new Set(['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ']);

export function normalize(text: string) {
  return text
    .replace(/[֑-ׇ]/g, '')
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (ch) => FINAL[ch])
    .replace(/[^0-9a-zא-ת]+/g, ' ')
    .trim();
}

export function tokenVariants(word: string) {
  const bases = [word];
  if (word.length > 3 && PREFIXES.has(word[0])) bases.push(word.slice(1));
  const result = [...bases];
  for (const b of bases) {
    if (b.length > 4 && (b.endsWith('ימ') || b.endsWith('ות'))) result.push(b.slice(0, -2));
    else if (b.length > 3 && (b.endsWith('ה') || b.endsWith('ת'))) result.push(b.slice(0, -1));
  }
  return result;
}

export function matches(haystack: string, query: string) {
  const hay = normalize(haystack);
  return normalize(query)
    .split(' ')
    .filter(Boolean)
    .every((w) => tokenVariants(w).some((v) => hay.includes(v)));
}
