function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

function singularForms(word: string): string[] {
  const forms = [word];
  if (word.endsWith("ies")) forms.push(`${word.slice(0, -3)}y`, `${word.slice(0, -3)}i`);
  if (word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.endsWith("s")) forms.push(word.slice(0, -1));
  return forms;
}

export type PreparedKeyword<K extends string> = { keyword: K; words: readonly string[] };

// Splitting thousands of keywords on every keystroke adds up, so callers with a fixed keyword
// list prepare it once.
export function prepareKeywords<K extends string>(
  keywords: readonly K[],
): readonly PreparedKeyword<K>[] {
  return keywords.map((keyword) => ({ keyword, words: keyword.split(" ") }));
}

// Keywords match whole words or phrases, never fragments of a longer word ("watermelon" is not
// "water"). The match that ends last wins because the head noun trails ("milk chocolate").
export function bestKeywordMatch<K extends string>(
  itemName: string,
  keywords: readonly K[] | readonly PreparedKeyword<K>[],
): K | null {
  const words = tokenise(itemName).map(singularForms);
  if (words.length === 0) return null;
  let best: { end: number; length: number; keyword: K } | null = null;

  for (const entry of keywords) {
    const { keyword, words: keywordWords } =
      typeof entry === "string" ? { keyword: entry, words: entry.split(" ") } : entry;
    for (let start = 0; start + keywordWords.length <= words.length; start++) {
      const matches = keywordWords.every((keywordWord, offset) =>
        words[start + offset]?.includes(keywordWord),
      );
      if (!matches) continue;
      const end = start + keywordWords.length;
      if (!best || end > best.end || (end === best.end && keywordWords.length > best.length)) {
        best = { end, length: keywordWords.length, keyword };
      }
    }
  }

  return best?.keyword ?? null;
}
