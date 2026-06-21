// The tidy output validation: the safety backstop that proves a tidy result is a proofread and not
// a restructure (spec 2.6) or a successful prompt injection (spec 2.3.3). A pure module taking the
// captured original and the model's corrected string and returning either the validated change set
// (the Task 12 diff) or a typed rejection reason. A rejected result is discarded by the caller with
// an honest message and the document is left untouched; nothing here mutates the buffer.
//
// Four of the five checks are EXACT and are the real structural backstop: the directive structure,
// the heading count and levels, the fenced-code-block count, the byte-for-byte frontmatter, the
// media-hash multiset, and every code span and fenced block. The fifth, the divergence bound, is
// the only fuzzy one, and it is a rewrite/injection backstop only, never a voice safeguard. The
// config-driven prompt is what protects voice.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { fenceScan, frontmatterSpan } from './markdown-directives.js';
import { parseMediaToken } from '../media/reference.js';
import { diffTokens, diffChanges } from './tidy-diff.js';
import type { Change } from './tidy-diff.js';

/** The reason a tidy result was rejected. Task 14 branches on this; every value maps to the one
 *  honest author-facing message, so the reason is for logging and tests, not the user surface.
 *  - `structure`: a directive opener/closer sequence, a heading count or level, or a fenced-code
 *    count diverged (the result restructured the document).
 *  - `frontmatter`: the frontmatter block is not byte-for-byte equal.
 *  - `media`: the multiset of `media:` hashes differs (a hash was altered, dropped, or invented).
 *  - `code`: a code span or fenced code block was edited.
 *  - `divergence`: the changed-token amount exceeds the length-aware bound (a wholesale rewrite). */
export type TidyRejectionReason = 'structure' | 'frontmatter' | 'media' | 'code' | 'divergence';

/** The honest author-facing message a rejection maps to. The same message for every reason, by
 *  design: an author does not need the validator's internal taxonomy, only that the result was
 *  discarded and their text is safe. */
export const TIDY_REJECTION_MESSAGE =
	'Tidy returned a result that changed more than the wording, so it was discarded. Your text is unchanged.';

/** The outcome of validating a tidy result. On success it carries the Task 12 change set the review
 *  surface accepts and rejects against; on failure it carries the typed reason and the message. */
export type TidyValidation =
	| { ok: true; changes: Change[] }
	| { ok: false; reason: TidyRejectionReason; message: string };

// The divergence bound. The floor allows a fixed number of changed tokens regardless of fraction so
// a legitimate heavy proofread of a SHORT input is not penalized: a short paragraph with a typo in
// nearly every word is a real proofread, not a rewrite. The fraction catches a wholesale rewrite of
// a LONG input, where a large absolute count is past any honest copy-edit. A result is rejected only
// when it exceeds BOTH the floor and the fraction, so a short input rides the floor and a long input
// rides the fraction. The values are deliberate: 60 tokens of change covers a dense proofread of a
// few short paragraphs, and 0.5 of the total tokens marks the point where more than half the text
// changed, which no proofread does but a rewrite or a successful injection always does.
const DIVERGENCE_TOKEN_FLOOR = 60;
const DIVERGENCE_FRACTION = 0.5;

// Every `media:` token anywhere in the text, hash and slug forms alike. The validator scans the raw
// text rather than going through extractMediaRefs for two reasons. First, a true MULTISET is the
// invariant a backstop wants: extractMediaRefs dedups by hash, so a doubled token collapsing to one
// would read as equal, and the validator must catch a dropped duplicate. Second, the raw scan covers
// the whole text including frontmatter without threading the concept's FrontmatterField[] to the call
// site, which the validator otherwise has no reason to know. A token mangled inside a code fence is
// caught here too, redundantly with the code check, which is the right posture for a backstop.
const MEDIA_TOKEN = /media:[A-Za-z0-9.-]+/g;

/** The sorted multiset of valid media hashes in the text. Each `media:` occurrence is parsed; a
 *  malformed token (a broken hash, an illegal slug) parses to null and is dropped, so a tidy that
 *  CORRUPTED a hash drops it from the multiset and the comparison fails. Sorted so two multisets
 *  compare by value, order-independent. */
function mediaHashes(text: string): string[] {
	const hashes: string[] = [];
	for (const m of text.matchAll(MEDIA_TOKEN)) {
		const ref = parseMediaToken(m[0]);
		if (ref) hashes.push(ref.hash);
	}
	return hashes.sort();
}

/** The directive structure signature: each opener or closer in document order, paired with the depth
 *  the fence scan assigned it. Two texts share a directive structure when these signatures are equal,
 *  so an added, removed, or relevelled container fails the comparison. A fence-shaped line inside a
 *  code block is already disowned by the scan (its role is null), so a documented `:::` example does
 *  not enter the signature. */
function directiveSignature(text: string): string {
	const { depths, roles } = fenceScan(text.split('\n'));
	const parts: string[] = [];
	for (let i = 0; i < roles.length; i++) {
		if (roles[i] !== null) parts.push(`${roles[i]}@${depths[i]}`);
	}
	return parts.join(',');
}

/** The heading signature: every ATX heading's level in document order. Parsed as mdast so a `#`
 *  inside a code block or an escaped one is never counted, and the level is the parser's own depth.
 *  Two texts share a heading structure when these are equal, so an added, removed, or relevelled
 *  heading fails the comparison. */
function headingSignature(text: string): string {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(text);
	const levels: number[] = [];
	visit(tree, 'heading', (node: { depth?: number }) => {
		if (typeof node.depth === 'number') levels.push(node.depth);
	});
	return levels.join(',');
}

/** Every code span and fenced or indented code block in the text, as a sorted multiset of values.
 *  Parsed as mdast so the comparison sees exactly what the parser treats as code, the same authority
 *  the media body scan uses. Sorted so the comparison is order-independent: the divergence and
 *  structure checks own ordering, this check owns the contents. A `code` node is a block, an
 *  `inlineCode` node is a span. */
function codeContents(text: string): string[] {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(text);
	const values: string[] = [];
	visit(tree, (node: { type: string; value?: string }) => {
		if ((node.type === 'code' || node.type === 'inlineCode') && typeof node.value === 'string') {
			values.push(`${node.type}:${node.value}`);
		}
	});
	return values.sort();
}

/** True when two string multisets are equal: same length and same sorted contents. */
function multisetEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

// The changed token amount: the count of tokens the diff marked inserted or deleted, against the
// total tokens in the original. An equal run contributes nothing; an inserted or deleted run counts
// its own tokens. This is the rewrite measure, deliberately coarse, since the structure/token/code
// checks are the exact backstop and this only catches a wholesale rewrite that slipped past them.
function divergence(original: string, corrected: string): { changed: number; total: number } {
	const runs = diffTokens(original, corrected);
	// Count tokens by splitting each run's text on the same word/non-word boundary the diff uses; a
	// run's token count is its number of word-or-nonword matches. The original's total is the equal
	// plus deleted token count.
	const countTokens = (s: string) => (s.match(/[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g) ?? []).length;
	let changed = 0;
	let total = 0;
	for (const run of runs) {
		const tokens = countTokens(run.text);
		if (run.kind === 'inserted' || run.kind === 'deleted') changed += tokens;
		if (run.kind === 'equal' || run.kind === 'deleted') total += tokens;
	}
	return { changed, total };
}

/**
 * Validate a tidy result against the captured original. Runs the exact structural checks first (a
 * restructure or a token or code edit is a hard reject regardless of how little else changed), then
 * the length-aware divergence bound. On success returns the Task 12 change set for the review
 * surface; on failure returns the typed reason and the one honest message.
 *
 * The checks, in order: the directive opener/closer sequence and depths, the ATX heading count and
 * levels, the fenced-code-block count (folded into the code-contents multiset), the byte-for-byte
 * frontmatter via the shared frontmatterSpan helper, the media-hash multiset, the code-span and
 * code-block contents, and finally the divergence bound. A pure function: it reads the two strings
 * and nothing else, and it never mutates the buffer.
 */
export function validateTidy(original: string, corrected: string): TidyValidation {
	// Directive structure: the opener/closer sequence and depths must match exactly.
	if (directiveSignature(original) !== directiveSignature(corrected)) {
		return { ok: false, reason: 'structure', message: TIDY_REJECTION_MESSAGE };
	}

	// Headings: the same ATX headings at the same levels, in order.
	if (headingSignature(original) !== headingSignature(corrected)) {
		return { ok: false, reason: 'structure', message: TIDY_REJECTION_MESSAGE };
	}

	// Frontmatter: byte-for-byte equal, via the same helper the spellcheck skip uses. A null span
	// (no frontmatter) on both sides slices to the empty string on both, so a body-only document
	// passes; a span on one side and not the other diverges.
	const fmOriginal = frontmatterSpan(original);
	const fmCorrected = frontmatterSpan(corrected);
	const fmTextOriginal = fmOriginal ? original.slice(fmOriginal.from, fmOriginal.to) : '';
	const fmTextCorrected = fmCorrected ? corrected.slice(fmCorrected.from, fmCorrected.to) : '';
	if (fmTextOriginal !== fmTextCorrected) {
		return { ok: false, reason: 'frontmatter', message: TIDY_REJECTION_MESSAGE };
	}

	// Media: the exact same multiset of hashes across the whole text.
	if (!multisetEqual(mediaHashes(original), mediaHashes(corrected))) {
		return { ok: false, reason: 'media', message: TIDY_REJECTION_MESSAGE };
	}

	// Code: every code span and fenced or indented block identical. The block count is folded in
	// here: a multiset of block-and-span values that differs in count or contents fails.
	if (!multisetEqual(codeContents(original), codeContents(corrected))) {
		return { ok: false, reason: 'code', message: TIDY_REJECTION_MESSAGE };
	}

	// Divergence: rejected only when the changed amount exceeds BOTH the absolute floor and the
	// fraction of the total. A short input rides the floor; a long input rides the fraction.
	const { changed, total } = divergence(original, corrected);
	if (changed > DIVERGENCE_TOKEN_FLOOR && changed > total * DIVERGENCE_FRACTION) {
		return { ok: false, reason: 'divergence', message: TIDY_REJECTION_MESSAGE };
	}

	return { ok: true, changes: diffChanges(original, corrected) };
}
