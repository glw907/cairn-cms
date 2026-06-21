import { describe, it, expect } from 'vitest';
import { validateTidy } from '../../lib/components/tidy-validate.js';
import type { TidyValidation } from '../../lib/components/tidy-validate.js';

// A 16-character lowercase hex content-hash prefix, the canonical media: hash shape.
const HASH = '0123456789abcdef';
const OTHER_HASH = 'fedcba9876543210';

// Narrow a result to the rejection arm so a test can read its reason without a non-null dance.
function asRejection(result: TidyValidation): Extract<TidyValidation, { ok: false }> {
	expect(result.ok).toBe(false);
	if (result.ok) throw new Error('expected a rejection');
	return result;
}

describe('validateTidy', () => {
	it('passes a clean proofread on a normal-length input', () => {
		const original = [
			'# My Post',
			'',
			'This is teh first paragraph with a tpyo in it that needs a fix.',
			'',
			'Here is a second paragraph that recieves a small grammar correction.',
		].join('\n');
		const corrected = [
			'# My Post',
			'',
			'This is the first paragraph with a typo in it that needs a fix.',
			'',
			'Here is a second paragraph that receives a small grammar correction.',
		].join('\n');
		const result = validateTidy(original, corrected);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.changes.length).toBeGreaterThan(0);
	});

	it('passes a short input that is heavily proofread, protected by the absolute floor', () => {
		// A short input where almost every word is corrected. The fraction alone would reject this,
		// but the absolute floor allows a heavy proofread of a short input through.
		const original = 'teh quik brown fox jumpd ovr teh lazi dog yesterdey.';
		const corrected = 'The quick brown fox jumped over the lazy dog yesterday.';
		const result = validateTidy(original, corrected);
		expect(result.ok).toBe(true);
	});

	it('rejects a broken media token', () => {
		const original = `Look at this image: ![a cat](media:${HASH}).`;
		// One hex digit of the hash is altered, so the parsed hash no longer matches.
		const corrected = `Look at this image: ![a cat](media:0123456789abcde0).`;
		const rejection = asRejection(validateTidy(original, corrected));
		expect(rejection.reason).toBe('media');
		expect(rejection.message).toContain('changed more than the wording');
	});

	it('rejects a dropped media token', () => {
		const original = `One ![a](media:${HASH}) and two ![b](media:${OTHER_HASH}).`;
		const corrected = `One ![a](media:${HASH}) and two.`;
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('media');
	});

	it('rejects an added heading', () => {
		const original = '# Title\n\nA paragraph of text.';
		const corrected = '# Title\n\n## A New Heading\n\nA paragraph of text.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('structure');
	});

	it('rejects a relevelled heading', () => {
		const original = '# Title\n\n## Section\n\nText here.';
		const corrected = '# Title\n\n### Section\n\nText here.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('structure');
	});

	it('rejects a changed directive structure', () => {
		const original = ':::callout\nInside the callout.\n:::';
		const corrected = 'Inside the callout.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('structure');
	});

	it('rejects an edit inside a fenced code block', () => {
		const original = 'Run this:\n\n```js\nconst x = 1;\n```\n\nDone.';
		const corrected = 'Run this:\n\n```js\nconst x = 2;\n```\n\nDone.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('code');
	});

	it('rejects an edit inside an inline code span', () => {
		const original = 'Call the `parseThing()` helper.';
		const corrected = 'Call the `parseStuff()` helper.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('code');
	});

	it('rejects rewritten frontmatter', () => {
		const original = '---\ntitle: My Post\n---\n\nBody text here.';
		const corrected = '---\ntitle: A Better Post\n---\n\nBody text here.';
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('frontmatter');
	});

	it('accepts a body proofread that leaves frontmatter byte-for-byte equal', () => {
		const original = '---\ntitle: My Post\n---\n\nThis has a tpyo.';
		const corrected = '---\ntitle: My Post\n---\n\nThis has a typo.';
		const result = validateTidy(original, corrected);
		expect(result.ok).toBe(true);
	});

	it('rejects a wholesale rewrite of a long input past the length-aware bound', () => {
		// A long input whose body is replaced wholesale. The structure (no headings, no directives,
		// no code, no media, no frontmatter) is unchanged, so only the divergence bound can catch it.
		const sentence = 'The committee reviewed the quarterly report and approved the budget. ';
		const original = sentence.repeat(40).trim();
		const replacement = 'A completely different statement about unrelated matters entirely. ';
		const corrected = replacement.repeat(40).trim();
		expect(asRejection(validateTidy(original, corrected)).reason).toBe('divergence');
	});

	it('accepts identical input as a no-op with no changes', () => {
		const text = '# Title\n\nNothing to fix here at all.';
		const result = validateTidy(text, text);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.changes).toEqual([]);
	});
});
