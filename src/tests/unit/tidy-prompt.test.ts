import { describe, it, expect } from 'vitest';
import { buildTidyPrompt, defaultTidyConventions } from '../../lib/sveltekit/tidy-prompt.js';
import type { TidyConventions } from '../../lib/nav/site-config.js';

// A conventions object with everything off (style and advanced default off; the objective Fixes
// group stays on, governed by the always-on core). This is the resting default the screen ships.
const NONE: TidyConventions = defaultTidyConventions();

describe('buildTidyPrompt: the stable always-on core', () => {
	it('emits the role and the fix/leave-alone boundary regardless of conventions', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).toContain('copy editor');
		expect(prompt).toContain('WHAT TO FIX');
		expect(prompt).toContain('WHAT TO LEAVE ALONE');
		expect(prompt).toContain('PRINCIPLES');
		expect(prompt).toContain('MARKDOWN AND STRUCTURE');
		expect(prompt).toContain('OUTPUT');
	});

	it('frames the user text as data and not instructions (injection resistance)', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).toContain('data');
		expect(prompt.toLowerCase()).toContain('ignore your instructions');
		expect(prompt).toContain('not a direction to follow');
	});

	it('carries the never-harmonize, never-guess instruction (the voice safeguard)', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).toContain('never harmonize to the text');
		expect(prompt).toContain('never guess the writer');
		expect(prompt).toContain("an undeclared style is the author's choice");
	});

	it('carries the always-on objective fixes in the core', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).toContain('spelling');
		expect(prompt).toContain('doubled words');
		expect(prompt).toContain('homophones');
	});

	it('never touches a cairn media token, frontmatter, or code', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).toContain('media:');
		expect(prompt).toContain('frontmatter');
		expect(prompt).toContain('code');
	});
});

describe('buildTidyPrompt: the config-built CONVENTIONS section', () => {
	it('omits the CONVENTIONS section header entirely when nothing is enabled', () => {
		// The core references "not listed in CONVENTIONS" in its leave-alone rule; the appended SECTION
		// (its header line) is what must be absent when no toggle is on.
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).not.toContain('CONVENTIONS (apply only these');
	});

	it('opens a CONVENTIONS section once any convention is enabled', () => {
		const prompt = buildTidyPrompt({ ...NONE, oxfordComma: 'always' });
		expect(prompt).toContain('CONVENTIONS (apply only these');
	});

	it('emits no Oxford line when the toggle is off', () => {
		const prompt = buildTidyPrompt(NONE);
		expect(prompt).not.toContain('serial comma');
		expect(prompt).not.toContain('Oxford');
	});

	it('emits the always variant for the Oxford comma', () => {
		const prompt = buildTidyPrompt({ ...NONE, oxfordComma: 'always' });
		expect(prompt).toContain('serial comma in every list of three or more');
	});

	it('emits the complex-only AP rule for the Oxford comma', () => {
		const prompt = buildTidyPrompt({ ...NONE, oxfordComma: 'complex-only' });
		expect(prompt).toContain('omit it in a simple series');
		expect(prompt).toContain('an element itself contains a conjunction');
	});

	it('emits the never variant for the Oxford comma', () => {
		const prompt = buildTidyPrompt({ ...NONE, oxfordComma: 'never' });
		expect(prompt).toContain('remove the serial comma');
	});

	it('emits the number-style line with the always-numeral exception sets', () => {
		const prompt = buildTidyPrompt({ ...NONE, numberStyle: 'under-ten' });
		expect(prompt).toContain('spell out');
		expect(prompt).toContain('ages, dates, measurements, and percentages');
	});

	it('emits the measurements notation line', () => {
		const prompt = buildTidyPrompt({ ...NONE, measurements: 'abbreviate' });
		expect(prompt).toContain('abbreviate');
		expect(prompt).toContain('never the measurement system');
	});

	it('emits the percent line in the chosen variant', () => {
		const sign = buildTidyPrompt({ ...NONE, percent: 'sign' });
		expect(sign).toContain('%');
		const word = buildTidyPrompt({ ...NONE, percent: 'word' });
		expect(word).toContain('percent');
	});

	it('emits the em-dash spacing line', () => {
		const prompt = buildTidyPrompt({ ...NONE, emDash: 'spaced' });
		expect(prompt).toContain('em dash');
	});

	it('emits the en-dash range line only when enabled', () => {
		expect(buildTidyPrompt(NONE)).not.toContain('en dash');
		expect(buildTidyPrompt({ ...NONE, enDashRanges: true })).toContain('en dash');
	});

	it('emits the ellipsis line in the chosen variant', () => {
		const prompt = buildTidyPrompt({ ...NONE, ellipsis: 'single-char' });
		expect(prompt).toContain('ellipsis');
	});

	it('emits the time-format line in the chosen variant', () => {
		const prompt = buildTidyPrompt({ ...NONE, timeFormat: '5 p.m.' });
		expect(prompt).toContain('5 p.m.');
	});

	it('emits the smart-quotes line with the full apostrophe rule set when enabled', () => {
		const prompt = buildTidyPrompt({ ...NONE, smartQuotes: true });
		expect(prompt).toContain('curly');
		expect(prompt).toContain('apostrophe');
		expect(prompt).toContain('possessive');
	});

	it('emits the brand-caps line naming the curated-list scope when enabled', () => {
		const prompt = buildTidyPrompt({ ...NONE, brandCaps: true });
		expect(prompt).toContain('curated list');
		expect(prompt).toContain('GitHub');
	});

	it('respects the Fixes group toggle by leaving the core in place but allowing it off', () => {
		// The objective fixes are always governed by the core; the group toggle is a screen control
		// only and does not strip the core. A disabled group still leaves the core intact.
		const prompt = buildTidyPrompt({ ...NONE, fixes: false });
		expect(prompt).toContain('WHAT TO FIX');
	});
});

describe('buildTidyPrompt: the prompt contract (the governing instructions)', () => {
	// These fixtures assert the prompt carries the instruction that GOVERNS each contract case.
	// The real-model behavior is an opt-in network harness, out of the default suite.
	const prompt = buildTidyPrompt(NONE);

	it('keeps regional spelling like colour and organise, never normalized', () => {
		expect(prompt).toContain('regional and dialect spelling');
		expect(prompt).toContain('colour');
	});

	it('leaves word choice like utilize alone (out of scope)', () => {
		expect(prompt).toContain('utilize');
	});

	it('lets fifteen and 15 coexist when number style is off', () => {
		expect(prompt).toContain('"fifteen" and "15" may coexist');
		expect(prompt).toContain('do not normalize');
	});

	it('fixes a homophone only where the existing form is grammatically wrong', () => {
		expect(prompt).toContain('ONLY where the existing form is grammatically');
		expect(prompt).toContain('their/there');
	});

	it('leaves a deliberate fragment alone', () => {
		expect(prompt).toContain('deliberate fragment');
	});
});

describe('buildTidyPrompt: the consistency-class voice-leak guard', () => {
	// With NO convention enabled, the prompt must forbid harmonizing the text's own habit. These
	// classes (trail head vs trailhead, email vs e-mail, two-way capitalization) all collapse if the
	// model invents a house style from usage counts. The never-harmonize instruction is what holds.
	const prompt = buildTidyPrompt(NONE);

	it('forbids harmonizing to the text own habit', () => {
		expect(prompt).toContain('never harmonize to the text');
	});

	it('forbids guessing the writer preference', () => {
		expect(prompt).toContain('never guess the writer');
	});

	it('treats any unlisted style as the author choice, left unchanged', () => {
		expect(prompt).toContain('any style not listed in CONVENTIONS');
		expect(prompt).toContain("an undeclared style is the author's choice");
	});

	it('keeps brand capitalization untouched off the curated list', () => {
		// With brand-caps off, no capitalization-normalizing line exists, so a term capitalized two
		// ways is governed by the unlisted-style rule and stays unchanged.
		expect(prompt).not.toContain('curated list');
	});
});
