// The tidy diff: a Longest Common Subsequence over tokens, poplar's DiffRanges model rebuilt in
// TypeScript (spec 2.4). A small pure module, not a diff library. The tidy action returns only the
// corrected string; this module owns every range, offset, and line label. It is the sole source of
// positional truth for the review surface (Tasks 13 and 14 consume its output), so all positions are
// computed locally from this diff against the captured original, never taken from the model.
//
// Token granularity is the right unit for a copy-edit: a one-letter fix like "it's" to "its" reads
// as a whole-word replacement an author accepts or rejects as a unit, not a confusing single-character
// flip. The diff is computed against the original captured at request time; tidy is single-author and
// on-demand, so there is no rebasing and no three-way merge.

/** One run of the token diff. A run is contiguous tokens of a single kind. */
export interface DiffRange {
	/**
	 * `equal` for tokens kept from the original, `deleted` for tokens removed from the original,
	 * `inserted` for tokens that appear only in the corrected text.
	 */
	kind: 'equal' | 'inserted' | 'deleted';
	/**
	 * The offset into the captured ORIGINAL where this run begins. For `equal` and `deleted` runs
	 * this is the start of the run's text in the original. For an `inserted` run there is no original
	 * span, so `from === to`: the offset is the insertion point in the original.
	 */
	from: number;
	/** The offset into the captured ORIGINAL where this run ends. For an `inserted` run, equal to `from`. */
	to: number;
	/** The actual token text of this run (original text for equal/deleted, corrected text for inserted). */
	text: string;
}

/**
 * A change: the unit the review UI accepts and rejects. A change is a deletion, an insertion, or a
 * deletion immediately followed by an insertion that reads as a replacement. Each change is a faithful
 * edit recipe against the captured original: splice `replacement` over the original span `[from, to)`.
 */
export interface Change {
	/** A stable, gap-free index (0, 1, 2, ...) assigned in document order. */
	index: number;
	/** The start offset of the change's span in the captured ORIGINAL. */
	from: number;
	/**
	 * The end offset of the change's span in the captured ORIGINAL. A pure insertion has a zero-width
	 * span (`from === to`); a pure deletion has a non-empty span with an empty `replacement`.
	 */
	to: number;
	/** The text to splice over `[from, to)`. Empty for a pure deletion. */
	replacement: string;
}

// A token is either a word (a run of word characters, apostrophes kept inside so "it's" is one token)
// or a non-word run (whitespace and punctuation between words). Splitting at the word boundary gives
// whole-word granularity: a homophone or typo fix lands on the word, not a single character.
const TOKEN = /[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g;

interface Token {
	text: string;
	/** The offset of this token's start in the source string it was tokenized from. */
	offset: number;
}

function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	for (const m of text.matchAll(TOKEN)) {
		tokens.push({ text: m[0], offset: m.index });
	}
	return tokens;
}

/**
 * Diff the original against the corrected text and return runs of equal, inserted, and deleted tokens.
 * Both strings are tokenized into words plus the whitespace and punctuation between them, an LCS over
 * the token sequences finds the kept tokens, and the gaps become deleted and inserted runs.
 *
 * Run offsets index the captured ORIGINAL: an `equal` or `deleted` run spans its original text, an
 * `inserted` run carries a zero-width original span at the insertion point. Concatenating the equal
 * and deleted runs rebuilds the original; concatenating the equal and inserted runs rebuilds the
 * corrected text.
 */
export function diffTokens(original: string, corrected: string): DiffRange[] {
	const a = tokenize(original);
	const b = tokenize(corrected);
	const n = a.length;
	const m = b.length;

	// Standard LCS table over the token sequences.
	const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			if (a[i - 1].text === b[j - 1].text) {
				lcs[i][j] = lcs[i - 1][j - 1] + 1;
			} else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
				lcs[i][j] = lcs[i - 1][j];
			} else {
				lcs[i][j] = lcs[i][j - 1];
			}
		}
	}

	// Trace the table back from the bottom-right corner, then reverse, so the ops come out in document
	// order. A diagonal step (equal tokens) is a kept token; a step up the original is a deletion; a
	// step left along the corrected is an insertion. The backward walk follows the path the table
	// encodes, which a forward greedy walk does not in general.
	type Op = { kind: DiffRange['kind']; from: number; to: number; text: string };
	const reversed: Op[] = [];
	let i = n;
	let j = m;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1].text === b[j - 1].text) {
			reversed.push({ kind: 'equal', from: a[i - 1].offset, to: a[i - 1].offset + a[i - 1].text.length, text: a[i - 1].text });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
			// The original offset of an insertion is the start of the next kept original token (the one
			// at index i), or the end of the original when nothing more remains.
			const at = i < n ? a[i].offset : original.length;
			reversed.push({ kind: 'inserted', from: at, to: at, text: b[j - 1].text });
			j--;
		} else {
			reversed.push({ kind: 'deleted', from: a[i - 1].offset, to: a[i - 1].offset + a[i - 1].text.length, text: a[i - 1].text });
			i--;
		}
	}
	const ops = reversed.reverse();

	// Coalesce adjacent ops of the same kind into runs. A run's text is the concatenation of its
	// tokens; offsets span from the first token's `from` to the last token's `to`.
	const runs: DiffRange[] = [];
	for (const op of ops) {
		const last = runs[runs.length - 1];
		if (last && last.kind === op.kind && last.to === op.from) {
			last.to = op.to;
			last.text += op.text;
		} else {
			runs.push({ kind: op.kind, from: op.from, to: op.to, text: op.text });
		}
	}
	return runs;
}

/**
 * Group the token diff into changes, the unit the review UI accepts and rejects. A run of deletions,
 * a run of insertions, or a deletion run immediately followed by an insertion run (a replacement) all
 * collapse into one change. Equal runs separate changes. Each change carries the original span to
 * replace and the replacement text, with a stable index in document order.
 */
export function diffChanges(original: string, corrected: string): Change[] {
	const runs = diffTokens(original, corrected);
	const changes: Change[] = [];
	let k = 0;
	while (k < runs.length) {
		const run = runs[k];
		if (run.kind === 'equal') {
			k++;
			continue;
		}
		// Start a change at the first non-equal run and absorb the contiguous deleted/inserted block.
		// A deletion immediately followed by an insertion reads as a replacement; either alone is a
		// pure deletion or insertion.
		let from = run.from;
		let to = run.from;
		let replacement = '';
		while (k < runs.length && runs[k].kind !== 'equal') {
			const r = runs[k];
			if (r.kind === 'deleted') {
				// A deleted run spans original text; extend the original span to cover it.
				if (replacement === '' && to === from) from = r.from;
				to = r.to;
			} else {
				// An inserted run contributes replacement text and pins the span start at its insertion
				// point when no deletion has set it yet (a pure insertion is zero-width).
				if (to === from) {
					from = r.from;
					to = r.from;
				}
				replacement += r.text;
			}
			k++;
		}
		changes.push({ index: changes.length, from, to, replacement });
	}
	return changes;
}

/**
 * The 1-based line number of an offset in the original, computed by counting newlines before it. The
 * review surface derives every line label this way, from the offset against the captured original, so
 * a label can never drift from the source or depend on a count the model supplied.
 */
export function lineLabel(original: string, offset: number): number {
	let line = 1;
	const end = Math.min(offset, original.length);
	for (let i = 0; i < end; i++) {
		if (original[i] === '\n') line++;
	}
	return line;
}
