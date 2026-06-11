// Remark-directive detection for the editor's machinery highlighting (spec: directive syntax is
// styled distinctly so an editor can tell component scaffolding from prose). Pure functions; the
// CodeMirror decoration plugin wraps them.

const FENCE = /^\s{0,3}:::+\s*[\w-]*\s*(\{[^}]*\})?\s*$/;
const LEAF = /^\s{0,3}::[\w-]+(\[[^\]]*\])?(\{[^}]*\})?\s*$/;
const INLINE = /(?<![:\w]):[\w-]+\[[^\]]*\](\{[^}]*\})?/g;

/** Classify a whole line as a container fence, a leaf directive, or neither. */
export function directiveLineKind(line: string): 'fence' | 'leaf' | null {
  if (FENCE.test(line)) return 'fence';
  if (LEAF.test(line)) return 'leaf';
  return null;
}

/** Inline directive ranges (`:name[...]{...}`) within a line of text. */
export function findInlineDirectives(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(INLINE)) {
    out.push({ from: m.index, to: m.index + m[0].length });
  }
  return out;
}
