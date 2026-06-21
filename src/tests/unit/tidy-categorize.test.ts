import { describe, it, expect } from 'vitest';
import {
	categorize,
	isObjective,
	buildBecause,
	categoryLabel,
	type TidyCategory,
} from '../../lib/components/tidy-categorize.js';
import { diffChanges } from '../../lib/components/tidy-diff.js';
import { resolveTidyConventions, type TidyConventions } from '../../lib/nav/site-config.js';

// Categorization runs over a real diff so the change spans match what the surface receives. Each case
// diffs an original against a corrected string, then categorizes the single change.
function only(original: string, corrected: string, conventions: TidyConventions): TidyCategory {
	const changes = diffChanges(original, corrected);
	expect(changes).toHaveLength(1);
	return categorize(changes[0], original, conventions);
}

const PLAIN = resolveTidyConventions(undefined); // Fixes on, every style and advanced toggle off.

describe('categorize: objective categories', () => {
	it('a single word replaced by a single word is spelling', () => {
		const cat = only('the lake loop can accomodate the crowd', 'the lake loop can accommodate the crowd', PLAIN);
		expect(cat.kind).toBe('spelling');
		expect(isObjective(cat)).toBe(true);
		expect(categoryLabel(cat)).toBe('Spelling');
	});

	it('a repeated word collapsing to one is doubled', () => {
		const cat = only('a layer for the the drive home', 'a layer for the drive home', PLAIN);
		expect(cat.kind).toBe('doubled');
		expect(isObjective(cat)).toBe(true);
	});

	it('a pure whitespace change is whitespace', () => {
		const cat = only('a warm layer  and a thermos', 'a warm layer and a thermos', PLAIN);
		expect(cat.kind).toBe('whitespace');
		expect(isObjective(cat)).toBe(true);
	});

	it('a single-mark punctuation swap is a typo', () => {
		// A wrong terminal mark fixed: the period token alone is replaced, no spacing in the run.
		const cat = only('we left.however', 'we left,however', PLAIN);
		expect(cat.kind).toBe('typo');
		expect(isObjective(cat)).toBe(true);
	});
});

describe('categorize: judgment categories', () => {
	it('a multi-token reword is grammar (judgment, never objective)', () => {
		// A missing auxiliary inserted: "I seen" becomes "I have seen", a multi-token insertion.
		const cat = only('I seen the lake', 'I have seen the lake', PLAIN);
		expect(cat.kind).toBe('grammar');
		expect(isObjective(cat)).toBe(false);
	});

	it('a serial comma added with the Oxford setting on is the oxfordComma normalization', () => {
		const conv = resolveTidyConventions({ oxfordComma: 'always' });
		const cat = only('skins, a layer and a thermos', 'skins, a layer, and a thermos', conv);
		expect(cat.kind).toBe('normalization');
		if (cat.kind === 'normalization') expect(cat.convention).toBe('oxfordComma');
		expect(isObjective(cat)).toBe(false);
		expect(categoryLabel(cat)).toBe('Comma style');
	});

	it('the percent word-to-sign swap with percent:sign is the percent normalization', () => {
		const conv = resolveTidyConventions({ percent: 'sign' });
		const cat = only('grew 5 percent this year', 'grew 5 % this year', conv);
		expect(cat.kind).toBe('normalization');
		if (cat.kind === 'normalization') expect(cat.convention).toBe('percent');
	});
});

describe('categorize: a normalization shape is never offered when the setting is off', () => {
	it('a serial comma added with no Oxford setting is NOT a normalization', () => {
		// The same comma-insertion shape, but the config does not authorize it. It must fall to a
		// non-normalization category, never to a normalization that cannot name an enabled setting.
		const cat = only('skins, a layer and a thermos', 'skins, a layer, and a thermos', PLAIN);
		expect(cat.kind).not.toBe('normalization');
		// Without an authorizing setting the comma-spacing change is held as a judgment grammar hunk,
		// never swept. It is never offered as a normalization it cannot name.
		expect(isObjective(cat)).toBe(false);
	});

	it('a percent swap with no percent setting is NOT a normalization', () => {
		const cat = only('grew 5 percent this year', 'grew 5 % this year', PLAIN);
		expect(cat.kind).not.toBe('normalization');
	});
});

describe('buildBecause: names the setting, never a usage count', () => {
	it('names the Oxford-comma setting and its variant', () => {
		const conv = resolveTidyConventions({ oxfordComma: 'always' });
		const line = buildBecause('oxfordComma', conv);
		expect(line).not.toBeNull();
		expect(line?.label).toBe('Oxford-comma');
		expect(line?.variant).toBe('always');
		expect(line?.effect).toContain('serial comma');
	});

	it('returns null for a convention that is not enabled (never a usage-count fallback)', () => {
		// PLAIN has no Oxford setting; the builder must refuse to fabricate a rationale rather than
		// reach for any count of the author's own text. There is no usage-count path.
		expect(buildBecause('oxfordComma', PLAIN)).toBeNull();
		expect(buildBecause('percent', PLAIN)).toBeNull();
		expect(buildBecause('timeFormat', PLAIN)).toBeNull();
	});

	it('the because-line for every key reads only from the conventions config', () => {
		// Drive each key with its enabled variant and confirm the line is composed from the config value
		// alone. The test passes the conventions and nothing else (no buffer, no usage), proving the
		// only input is the config.
		const conv = resolveTidyConventions({
			oxfordComma: 'never',
			numberStyle: 'under-ten',
			measurements: 'abbreviate',
			percent: 'word',
			emDash: 'spaced',
			enDashRanges: true,
			ellipsis: 'single-char',
			timeFormat: '5 PM',
			smartQuotes: true,
		});
		expect(buildBecause('numberStyle', conv)?.variant).toBe('under-ten');
		expect(buildBecause('measurements', conv)?.variant).toBe('abbreviate');
		expect(buildBecause('percent', conv)?.effect).toContain('percent');
		expect(buildBecause('emDash', conv)?.variant).toBe('spaced');
		expect(buildBecause('enDashRanges', conv)?.variant).toBe('en dash');
		expect(buildBecause('ellipsis', conv)?.variant).toBe('single-char');
		expect(buildBecause('timeFormat', conv)?.variant).toBe('5 PM');
		expect(buildBecause('smartQuotes', conv)?.variant).toBe('on');
	});
});
