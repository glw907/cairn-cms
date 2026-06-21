// The local tidy category taxonomy and the because-line builder (spec 2.5, decision 9). The tidy
// action returns a corrected STRING; the diff (Task 12) turns it into changes; this module infers each
// change's category and safety rank LOCALLY from the diff shape and the enabled config, never from a
// claim the model made and never from a count of the author's own usage. It is pure: the inputs are a
// change, the captured original, and the resolved conventions, and the outputs are a category and an
// optional because-line. Approximate by design, so it is unit-tested rather than trusted.
//
// The safety rank is the spine. Objective categories (spelling, typo, doubled word, whitespace) read
// quiet and are swept by Accept-fixes. Judgment categories (a declared normalization, or a grammar fix
// that reworded more than one token) carry the review-this treatment and are never swept until the
// author confirms each. The category alone decides the rank, so the surface and the bulk action agree.

import type { Change } from './tidy-diff.js';
import type { TidyConventions } from '../nav/site-config.js';

/** A change's locally-inferred category. The first four are objective (safe to sweep); `normalization`
 *  and `grammar` are judgment (held undecided, never swept by Accept-fixes). `normalization` carries
 *  the convention key that authorized it, so the surface can name the setting and label the badge. */
export type TidyCategory =
	| { kind: 'spelling' }
	| { kind: 'typo' }
	| { kind: 'doubled' }
	| { kind: 'whitespace' }
	| { kind: 'normalization'; convention: NormalizationKey }
	| { kind: 'grammar' };

/** True for the objective categories: the safe, pre-kept, Accept-fixes-swept rank. A judgment
 *  category (`normalization` or `grammar`) returns false. The bulk action and the surface both read
 *  this, so the safety rank is one source of truth. */
export function isObjective(category: TidyCategory): boolean {
	return (
		category.kind === 'spelling' ||
		category.kind === 'typo' ||
		category.kind === 'doubled' ||
		category.kind === 'whitespace'
	);
}

/** The enabled-convention keys a normalization can be attributed to. Each maps to one config field on
 *  TidyConventions and to a because-line. A change is only ever labelled a normalization when it matches
 *  one of these AND the config has the matching variant enabled; otherwise it is never a normalization. */
export type NormalizationKey =
	| 'oxfordComma'
	| 'numberStyle'
	| 'measurements'
	| 'percent'
	| 'emDash'
	| 'enDashRanges'
	| 'ellipsis'
	| 'timeFormat'
	| 'smartQuotes';

// The token boundary the diff uses, so a change's word/non-word token count here matches the diff's.
const TOKEN = /[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g;
// The en-dash and em-dash code points, named here so the comments below never type the literal glyph
// (the prose-guard rejects a literal dash even in a comment). Used by the punctuation conventions.
const EN_DASH = '–';
const EM_DASH = '—';

function tokens(text: string): string[] {
	return text.match(TOKEN) ?? [];
}

// The spelled-out number words the numberStyle convention recognizes against a numeral, the conservative
// clear cases only. A swap is claimed as a numberStyle normalization only when one side is one of these
// words and the other side is a plain integer numeral; a compound spelled number ("twenty-five") or any
// word outside this set is left to the shape rules, never falsely claimed.
const NUMBER_WORDS = new Set([
	'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
	'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
	'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
	'hundred', 'thousand', 'million', 'billion',
]);

// The unit notation pairs the measurements convention recognizes: each spelled-out unit and its
// abbreviation, in both singular and plural where the word inflects. A swap is claimed as a measurements
// normalization only when one side is a known abbreviation and the other its spelled-out form, the number
// untouched (the diff isolates the unit token). The list is deliberately a curated common set, so a unit
// outside it is left to the shape rules rather than guessed at.
const UNIT_FORMS: Array<{ abbr: string; words: string[] }> = [
	{ abbr: 'cm', words: ['centimeter', 'centimeters', 'centimetre', 'centimetres'] },
	{ abbr: 'mm', words: ['millimeter', 'millimeters', 'millimetre', 'millimetres'] },
	{ abbr: 'm', words: ['meter', 'meters', 'metre', 'metres'] },
	{ abbr: 'km', words: ['kilometer', 'kilometers', 'kilometre', 'kilometres'] },
	{ abbr: 'in', words: ['inch', 'inches'] },
	{ abbr: 'ft', words: ['foot', 'feet'] },
	{ abbr: 'yd', words: ['yard', 'yards'] },
	{ abbr: 'mi', words: ['mile', 'miles'] },
	{ abbr: 'g', words: ['gram', 'grams', 'gramme', 'grammes'] },
	{ abbr: 'kg', words: ['kilogram', 'kilograms', 'kilogramme', 'kilogrammes'] },
	{ abbr: 'mg', words: ['milligram', 'milligrams'] },
	{ abbr: 'lb', words: ['pound', 'pounds'] },
	{ abbr: 'oz', words: ['ounce', 'ounces'] },
	{ abbr: 'l', words: ['liter', 'liters', 'litre', 'litres'] },
	{ abbr: 'ml', words: ['milliliter', 'milliliters', 'millilitre', 'millilitres'] },
];

// True when `a` and `b` are the two notations of one measurement unit (one the abbreviation, the other a
// spelled-out form). Case-insensitive on the word side; the abbreviation is compared exactly so a stray
// word like "in" the preposition is not mistaken for the inch abbreviation unless the other side is its
// spelled-out unit. Order-independent: either side may be the abbreviation.
function isUnitNotationPair(a: string, b: string): boolean {
	for (const u of UNIT_FORMS) {
		const aAbbr = a === u.abbr;
		const bAbbr = b === u.abbr;
		const aWord = u.words.includes(a.toLowerCase());
		const bWord = u.words.includes(b.toLowerCase());
		if ((aAbbr && bWord) || (bAbbr && aWord)) return true;
	}
	return false;
}

// The clock-time signature for a token: its digits and meridiem reduced to a canonical key, or null when
// the token does not read as a time. Whitespace and the periods in "p.m." are dropped and the letters are
// lowercased, so "5pm", "5 PM", and "5 p.m." all reduce to "5pm" and a reshape between any two of them is
// recognized as the same time in a different format.
function timeKey(token: string): string | null {
	const compact = token.replace(/[\s.]/g, '').toLowerCase();
	const m = /^(\d{1,2})(:\d{2})?(am|pm)$/.exec(compact);
	if (!m) return null;
	return `${m[1]}${m[2] ?? ''}${m[3]}`;
}

function words(text: string): string[] {
	return tokens(text).filter((t) => /[A-Za-z0-9_]/.test(t));
}

function isWhitespaceOnly(text: string): boolean {
	return text.length > 0 && /^\s+$/.test(text);
}

function isPunctuationOnly(text: string): boolean {
	return text.length > 0 && /^[^A-Za-z0-9_\s]+$/.test(text);
}

/** The word ending immediately before `offset` in `text`, skipping any whitespace just before the
 *  offset, or null when none. The doubled-word rule reads it to confirm the deleted word repeats the
 *  one before it. Pure text inspection, never a count. */
function precedingWord(text: string, offset: number): string | null {
	let i = offset;
	while (i > 0 && /\s/.test(text[i - 1])) i--;
	let j = i;
	while (j > 0 && /[A-Za-z0-9_'’]/.test(text[j - 1])) j--;
	return j < i ? text.slice(j, i) : null;
}

/** The word starting immediately after `offset` in `text`, skipping any whitespace just after the
 *  offset, or null when none. The doubled-word rule reads it as the other half of the look-around. */
function followingWord(text: string, offset: number): string | null {
	let i = offset;
	while (i < text.length && /\s/.test(text[i])) i++;
	let j = i;
	while (j < text.length && /[A-Za-z0-9_'’]/.test(text[j])) j++;
	return j > i ? text.slice(i, j) : null;
}

/**
 * Categorize one change against the captured original and the resolved conventions. The rules are
 * deterministic and ordered by safety, objective first:
 *   1. a pure whitespace change (both sides whitespace, or a whitespace insert/delete) is whitespace;
 *   2. a removed repeated word (the original run is two of the same word collapsing to one) is doubled;
 *   3. a single-token punctuation-only change is a typo;
 *   4. a single word replaced by another single word is spelling;
 *   5. a change matching an ENABLED config convention's signature is that convention's normalization;
 *   6. anything else (a multi-token reword) is grammar.
 * A change that looks like a normalization but whose convention is not enabled falls through to typo,
 * spelling, or grammar by its shape, never to a normalization it cannot name. So the surface never
 * offers a normalization that cannot cite an enabled setting.
 */
export function categorize(change: Change, original: string, conventions: TidyConventions): TidyCategory {
	const removed = original.slice(change.from, change.to);
	const added = change.replacement;

	// Whitespace: the removed and added runs are each whitespace-only or empty, and at least one is
	// non-empty whitespace. A trailing-space trim (whitespace removed, nothing added) or a run
	// collapsed to a single space both land here.
	const removedWs = removed === '' || isWhitespaceOnly(removed);
	const addedWs = added === '' || isWhitespaceOnly(added);
	if (removedWs && addedWs && (isWhitespaceOnly(removed) || isWhitespaceOnly(added))) {
		return { kind: 'whitespace' };
	}

	// Doubled word: a repeated word collapses to one. The diff keeps the first copy and deletes the
	// second, so the change reads as a deletion of "<whitespace><word>" with an empty replacement, where
	// that word equals the word immediately before the change in the original. The look-back at the
	// preceding word is what tells a doubled word from a plain deletion; it reads the original text, never
	// a usage count. (A change whose own run already holds both copies, "word word" to "word", is the
	// fallback form, handled by the same word-equality test.)
	const removedWords = words(removed);
	const addedWords = words(added);
	if (removedWords.length === 1 && addedWords.length === 0 && /\S/.test(removed)) {
		const w = removedWords[0].toLowerCase();
		// The diff may delete either copy of the pair: the surviving copy is the word just before or just
		// after the deleted run in the original. Either match confirms a doubled word.
		const before = precedingWord(original, change.from);
		const after = followingWord(original, change.to);
		if ((before && before.toLowerCase() === w) || (after && after.toLowerCase() === w)) {
			return { kind: 'doubled' };
		}
	}
	if (
		removedWords.length === 2 &&
		addedWords.length === 1 &&
		removedWords[0].toLowerCase() === removedWords[1].toLowerCase() &&
		addedWords[0].toLowerCase() === removedWords[0].toLowerCase()
	) {
		return { kind: 'doubled' };
	}

	// The single-token shape: exactly one token removed and one token added (a clean replacement),
	// which is how a typo fix and a spelling fix both read.
	const removedTokens = tokens(removed);
	const addedTokens = tokens(added);
	const singleSwap = removedTokens.length === 1 && addedTokens.length === 1;

	// A declared normalization: the change matches an enabled convention's signature. Checked before the
	// single-word spelling rule only when the convention applies (a punctuation or notation change), so a
	// plain misspelling is never miscategorized as a normalization. A normalization is offered ONLY when
	// its config variant is enabled.
	const norm = matchNormalization(removed, added, conventions);
	if (norm) return { kind: 'normalization', convention: norm };

	// A single-token punctuation-only change (a stray or wrong mark fixed) is a typo. Reached only after
	// the normalization check, so an enabled punctuation convention claims its change first.
	if (singleSwap && isPunctuationOnly(removed) && isPunctuationOnly(added)) {
		return { kind: 'typo' };
	}
	// A punctuation insert or delete (a missing period added, say) with no other token is also a typo.
	if (
		(removed === '' && addedTokens.length === 1 && isPunctuationOnly(added)) ||
		(added === '' && removedTokens.length === 1 && isPunctuationOnly(removed))
	) {
		return { kind: 'typo' };
	}

	// A single word replaced by another single word is a spelling fix.
	if (singleSwap && removedWords.length === 1 && addedWords.length === 1) {
		return { kind: 'spelling' };
	}

	// Anything else is a grammar reword: a multi-token change the author should review.
	return { kind: 'grammar' };
}

// Match a change against the enabled conventions' signatures. Returns the convention key when the
// change's shape is what that convention produces AND the config has it enabled, else null. The
// signatures are deliberately narrow: each recognizes only the unambiguous form of its convention, so
// a false match is rare and a missed match falls to the shape-based category (never to a normalization
// the config did not authorize). Never counts the author's own usage; the only gate is the config.
function matchNormalization(
	removed: string,
	added: string,
	c: TidyConventions,
): NormalizationKey | null {
	// Oxford comma: a serial comma added before the final conjunction (a space becomes a comma then a
	// space) or removed. The diff isolates the punctuation run, so the signature is a comma appearing or
	// disappearing with the surrounding space.
	if (c.oxfordComma === 'always' && /^\s*$/.test(removed) && /^,\s*$/.test(added)) {
		return 'oxfordComma';
	}
	if (c.oxfordComma === 'never' && /^,\s*$/.test(removed) && /^\s*$/.test(added)) {
		return 'oxfordComma';
	}

	// Percent: the word to the sign or back, the whole token swapped.
	if (c.percent === 'sign' && /^percent$/i.test(removed.trim()) && added.trim() === '%') {
		return 'percent';
	}
	if (c.percent === 'word' && removed.trim() === '%' && /^percent$/i.test(added.trim())) {
		return 'percent';
	}

	// Ellipsis: three dots to the single character or back.
	if (c.ellipsis === 'single-char' && removed.includes('...') && added.includes('…')) {
		return 'ellipsis';
	}
	if (c.ellipsis === 'three-dots' && removed.includes('…') && added.includes('...')) {
		return 'ellipsis';
	}

	// En-dash ranges: a hyphen between two numbers becomes an en dash. The diff isolates the separator
	// token between the numbers, so the signature is a hyphen run becoming an en-dash run.
	if (c.enDashRanges && removed.trim() === '-' && added.trim() === EN_DASH) {
		return 'enDashRanges';
	}

	// Em-dash spacing: the spacing around an em dash changes. The dash stays; only the whitespace around
	// it moves, so the change run is the dash-plus-spacing token and the dash count is preserved.
	if (c.emDash !== undefined && removed.includes(EM_DASH) && added.includes(EM_DASH) && removed !== added) {
		if (removed.replace(/\s/g, '') === added.replace(/\s/g, '')) return 'emDash';
	}

	// Smart quotes: a straight quote becomes a curly one (or an apostrophe). The signature is a straight
	// quote in the removed run and its curly counterpart in the added run, the letters preserved.
	if (
		c.smartQuotes &&
		/['"]/.test(removed) &&
		/[‘’“”]/.test(added) &&
		removed.replace(/['"]/g, '') === added.replace(/[‘’“”]/g, '')
	) {
		return 'smartQuotes';
	}

	// Number style: a spelled-out number word swapped for a plain integer numeral, or back. The diff
	// isolates the single number token, so the signature is one trimmed side a known number word and the
	// other a digit run. Only the clear single-word cases are claimed; a compound spelled number is left to
	// the shape rules. The always-numeral exception sets (ages, dates, measurements, percentages) are the
	// model's job in the prompt; this categorizer only labels the swap that landed.
	if (c.numberStyle !== undefined) {
		const r = removed.trim().toLowerCase();
		const a = added.trim().toLowerCase();
		const wordToNumeral = NUMBER_WORDS.has(r) && /^\d+$/.test(a);
		const numeralToWord = /^\d+$/.test(r) && NUMBER_WORDS.has(a);
		if (wordToNumeral || numeralToWord) return 'numberStyle';
	}

	// Measurements: a unit abbreviation swapped for its spelled-out form, or back, the number untouched.
	// The diff isolates the unit token, so the signature is the two trimmed sides forming one unit's
	// notation pair. Notation only, never the system and never the number, exactly the convention's scope.
	if (c.measurements !== undefined && isUnitNotationPair(removed.trim(), added.trim())) {
		return 'measurements';
	}

	// Time format: a clock time reshaped between "5pm", "5 PM", and "5 p.m." styles. This claims only the
	// case where the diff isolates the whole time as one change, so both sides reduce to the same time key.
	// A reshape that adds or moves a space the diff splits into a separate whitespace and letter hunk
	// (for example "5 PM" to "5 p.m."); that case is left to the shape rules, where it stays a judgment
	// hunk that defaults to undecided, so it is still never swept by Accept-fixes.
	if (c.timeFormat !== undefined) {
		const rKey = timeKey(removed.trim());
		const aKey = timeKey(added.trim());
		if (rKey !== null && rKey === aKey && removed.trim() !== added.trim()) return 'timeFormat';
	}

	return null;
}

/** The because-line data for a hunk: the convention's display name and the variant phrasing, both pure
 *  strings derived from the config. The surface renders "Your <label> setting is <variant>, ..." from
 *  these. Only a normalization carries a because-line; an objective or grammar hunk returns null (a
 *  grammar hunk's rationale, when shown, is the local subject-verb note the surface composes, not a
 *  config citation). */
export interface BecauseLine {
	/** The convention's display label, e.g. "Oxford-comma". */
	label: string;
	/** The setting's variant phrasing, e.g. "always" or "5 PM". */
	variant: string;
	/** The trailing clause describing what tidy did, e.g. the serial-comma effect. */
	effect: string;
}

/**
 * Build the because-line for a normalization category. Its ONLY data source is the config-declared
 * setting that authorized the hunk: the convention key indexes the enabled variant on the conventions,
 * and the line names that setting and variant. It NEVER counts the author's own usage. Counting the
 * author's habit to justify a change is the harmonize-to-author judgment cairn must never make, so no
 * code path here reads the buffer or any usage statistic; the conventions are the sole input. Returns
 * null when the convention is somehow not enabled (defensive: categorize never produces such a hunk).
 */
export function buildBecause(key: NormalizationKey, conventions: TidyConventions): BecauseLine | null {
	switch (key) {
		case 'oxfordComma': {
			if (conventions.oxfordComma === undefined) return null;
			const variant = conventions.oxfordComma;
			let effect: string;
			switch (variant) {
				case 'always':
					effect = 'tidy adds the serial comma before the final "and"';
					break;
				case 'never':
					effect = 'tidy removes the serial comma before the final "and"';
					break;
				default:
					effect = 'tidy applies the serial comma to a complex series';
			}
			return { label: 'Oxford-comma', variant, effect };
		}
		case 'numberStyle': {
			if (conventions.numberStyle === undefined) return null;
			return { label: 'number-style', variant: conventions.numberStyle, effect: 'tidy applies your number style' };
		}
		case 'measurements': {
			if (conventions.measurements === undefined) return null;
			return {
				label: 'measurement',
				variant: conventions.measurements,
				effect: 'tidy applies your measurement notation',
			};
		}
		case 'percent': {
			if (conventions.percent === undefined) return null;
			const variant = conventions.percent === 'sign' ? 'the sign' : 'the word';
			const effect = conventions.percent === 'sign' ? 'tidy uses the "%" sign' : 'tidy uses the word "percent"';
			return { label: 'percent', variant, effect };
		}
		case 'emDash': {
			if (conventions.emDash === undefined) return null;
			return { label: 'em-dash', variant: conventions.emDash, effect: 'tidy applies your em-dash spacing' };
		}
		case 'enDashRanges': {
			if (!conventions.enDashRanges) return null;
			return { label: 'number-range', variant: 'en dash', effect: 'tidy uses an en dash between numbers' };
		}
		case 'ellipsis': {
			if (conventions.ellipsis === undefined) return null;
			return { label: 'ellipsis', variant: conventions.ellipsis, effect: 'tidy applies your ellipsis style' };
		}
		case 'timeFormat': {
			if (conventions.timeFormat === undefined) return null;
			return { label: 'time-format', variant: conventions.timeFormat, effect: 'tidy renders the time that way' };
		}
		case 'smartQuotes': {
			if (!conventions.smartQuotes) return null;
			return { label: 'smart-quotes', variant: 'on', effect: 'tidy curls the straight quote' };
		}
	}
}

/** The human badge label for a category, the word shown in the hunk's category pill. A normalization's
 *  label is the convention's display name (its comma style, its time format), never "consistency" and
 *  never a count. */
export function categoryLabel(category: TidyCategory): string {
	switch (category.kind) {
		case 'spelling':
			return 'Spelling';
		case 'typo':
			return 'Punctuation';
		case 'doubled':
			return 'Doubled word';
		case 'whitespace':
			return 'Whitespace';
		case 'grammar':
			return 'Grammar';
		case 'normalization':
			return normalizationLabel(category.convention);
	}
}

function normalizationLabel(key: NormalizationKey): string {
	switch (key) {
		case 'oxfordComma':
			return 'Comma style';
		case 'numberStyle':
			return 'Number style';
		case 'measurements':
			return 'Measurements';
		case 'percent':
			return 'Percent';
		case 'emDash':
			return 'Em-dash style';
		case 'enDashRanges':
			return 'Number range';
		case 'ellipsis':
			return 'Ellipsis';
		case 'timeFormat':
			return 'Time format';
		case 'smartQuotes':
			return 'Smart quotes';
	}
}
