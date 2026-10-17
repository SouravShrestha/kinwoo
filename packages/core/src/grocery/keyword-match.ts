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

// Keywords match whole words or phrases, never fragments of a longer word ("watermelon" is not
// "water"). The match that ends last wins because the head noun trails ("milk chocolate").
export function bestKeywordMatch<K extends string>(
  itemName: string,
  keywords: readonly K[],
): K | null {
  const words = tokenise(itemName).map(singularForms);
  let best: { end: number; length: number; keyword: K } | null = null;

  for (const keyword of keywords) {
    const keywordWords = keyword.split(" ");
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
