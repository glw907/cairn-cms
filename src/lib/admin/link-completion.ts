// cairn-cms: the [[ link autocomplete (content-graph design). The matcher and the completion
// builder are pure so they unit-test without a DOM; cairnLinkCompletionSource is a thin adapter
// to CodeMirror's CompletionSource. The editor wires the source through a generic completionSources
// prop, so this stays the only link-aware piece and the seam itself knows nothing about links.
import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import type { LinkTarget } from '../content/manifest.js';
import { formatCairnToken, escapeLinkText } from '../content/links.js';

// EditPage imports this module statically, so a static @codemirror value import here would pull
// CodeMirror into a consumer's server bundle. syntaxTree resolves lazily inside the source
// instead (a CompletionSource may return a Promise), cached after the first completion.
let langMod: typeof import('@codemirror/language') | null = null;

/** The known concepts in display order; an unlisted concept sorts after these under its own name. */
const CONCEPT_SECTIONS: Record<string, { name: string; rank: number }> = {
  pages: { name: 'Pages', rank: 0 },
  posts: { name: 'Posts', rank: 1 },
};

function sectionFor(concept: string): { name: string; rank: number } {
  return CONCEPT_SECTIONS[concept] ?? { name: concept.charAt(0).toUpperCase() + concept.slice(1), rank: 2 };
}

/**
 * The open `[[query` before the cursor, or null. The query stops at a closing bracket or a newline,
 *  so a finished `[[x]]` link and ordinary prose never trigger. `from` is the index of the `[[`.
 */
export function matchCairnTrigger(before: string): { query: string; from: number } | null {
  const match = /\[\[([^[\]\n]*)$/.exec(before);
  return match ? { query: match[1], from: match.index } : null;
}

/**
 * The completion options for a query: a case-insensitive title substring match, each option grouped
 *  by concept, a draft marked and a post date shown in the detail, and the apply text the full link.
 */
export function linkCompletions(targets: LinkTarget[], query: string): Completion[] {
  const q = query.trim().toLowerCase();
  const matched = q ? targets.filter((t) => t.title.toLowerCase().includes(q)) : targets;
  return matched.map((t) => ({
    label: t.title,
    section: sectionFor(t.concept),
    detail: t.draft ? 'Draft' : t.date,
    apply: `[${escapeLinkText(t.title)}](${formatCairnToken(t)})`,
  }));
}

/**
 * A CodeMirror CompletionSource over the site's link targets, triggered by `[[`. It replaces the
 *  whole `[[query` with the chosen link, and sets filter:false because linkCompletions already
 *  filtered by the query (CodeMirror would otherwise re-filter against the literal `[[query`).
 */
export function cairnLinkCompletionSource(targets: LinkTarget[]): CompletionSource {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const trigger = matchCairnTrigger(before);
    if (!trigger) return null;
    // Skip a [[ inside a fenced or inline code node: a cairn link there would be literal text, and
    // the build resolver does not look inside code. The node name carries "Code" for both forms.
    langMod ??= await import('@codemirror/language');
    // The first completion awaits the import above, so the request may already be stale here.
    if (context.aborted) return null;
    const node = langMod.syntaxTree(context.state).resolveInner(context.pos, -1);
    for (let n: typeof node | null = node; n; n = n.parent) {
      if (/Code/.test(n.name)) return null;
    }
    return { from: line.from + trigger.from, options: linkCompletions(targets, trigger.query), filter: false };
  };
}
