import { describe, it, expect } from 'vitest';
import { diffTokens, diffChanges, lineLabel } from '../../lib/components/tidy-diff.js';
import type { Change, DiffRange } from '../../lib/components/tidy-diff.js';

// Reconstruct the original from the runs: every equal and deleted range carries the original text
// at its own offsets, so concatenating them in order must rebuild the captured original exactly.
// This proves the runs index into the original, not into anything the model supplied.
function rebuildOriginal(runs: DiffRange[]): string {
	let out = '';
	for (const r of runs) {
		if (r.kind === 'equal' || r.kind === 'deleted') out += r.text;
	}
	return out;
}

// Reconstruct the corrected text from the runs: equal and inserted contribute, deleted does not.
function rebuildCorrected(runs: DiffRange[]): string {
	let out = '';
	for (const r of runs) {
		if (r.kind === 'equal' || r.kind === 'inserted') out += r.text;
	}
	return out;
}

// Apply a change set to the original by splicing each change's replacement over its original span.
// Applied right-to-left so earlier offsets stay valid. Proves a change's from/to/replacement are a
// faithful edit recipe against the captured original.
function applyChanges(original: string, changes: Change[]): string {
	let out = original;
	for (const c of [...changes].sort((a, b) => b.from - a.from)) {
		out = out.slice(0, c.from) + c.replacement + out.slice(c.to);
	}
	return out;
}

describe('diffTokens: runs over tokens', () => {
	it('emits a no-op (no runs marked changed) for identical input', () => {
		const runs = diffTokens('the quick fox', 'the quick fox');
		expect(runs.every((r) => r.kind === 'equal')).toBe(true);
		expect(rebuildOriginal(runs)).toBe('the quick fox');
		expect(diffChanges('the quick fox', 'the quick fox')).toEqual([]);
	});

	it('reads a one-word replacement as a whole-word change, not a character flip', () => {
		const original = "it's a fine day";
		const corrected = 'its a fine day';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		expect(original.slice(changes[0].from, changes[0].to)).toBe("it's");
		expect(changes[0].replacement).toBe('its');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('handles an insertion-only edit', () => {
		const original = 'the fox jumped';
		const corrected = 'the quick fox jumped';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		// A pure insertion has a zero-width original span (from === to).
		expect(changes[0].from).toBe(changes[0].to);
		expect(changes[0].replacement).toContain('quick');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('handles a deletion-only edit', () => {
		const original = 'the very quick fox';
		const corrected = 'the quick fox';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		// A pure deletion has an empty replacement and a non-empty original span.
		expect(changes[0].replacement).toBe('');
		expect(changes[0].to).toBeGreaterThan(changes[0].from);
		expect(original.slice(changes[0].from, changes[0].to)).toContain('very');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('groups a delete immediately followed by an insert into one replacement change', () => {
		const original = 'we walked their';
		const corrected = 'we walked there';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		expect(original.slice(changes[0].from, changes[0].to)).toBe('their');
		expect(changes[0].replacement).toBe('there');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('assigns a stable, gap-free index per change', () => {
		const original = 'teh cat sat onn the mat';
		const corrected = 'the cat sat on the mat';
		const changes = diffChanges(original, corrected);
		expect(changes.length).toBeGreaterThanOrEqual(2);
		expect(changes.map((c) => c.index)).toEqual(changes.map((_, i) => i));
		expect(applyChanges(original, changes)).toBe(corrected);
	});
});

describe('diffTokens: positions derived from the captured original only', () => {
	it('rebuilds the captured original and corrected from the runs alone', () => {
		const original = 'their going too the store';
		const corrected = "they're going to the store";
		const runs = diffTokens(original, corrected);
		expect(rebuildOriginal(runs)).toBe(original);
		expect(rebuildCorrected(runs)).toBe(corrected);
	});

	it('derives a line label from a change offset against the original, not a supplied count', () => {
		const original = 'first line\nsecond lien here\nthird line';
		const corrected = 'first line\nsecond line here\nthird line';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		// The change span lands on the typo in the original.
		expect(original.slice(changes[0].from, changes[0].to)).toBe('lien');
		// The line label is computed from the offset by counting newlines in the original.
		expect(lineLabel(original, changes[0].from)).toBe(2);
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('every change offset indexes the original exactly across multiple lines', () => {
		const original = 'alpha beta\ngama delta\nepsilon';
		const corrected = 'alpha beta\ngamma delta\nepsilon';
		const changes = diffChanges(original, corrected);
		for (const c of changes) {
			// from/to are valid indices into the original.
			expect(c.from).toBeGreaterThanOrEqual(0);
			expect(c.to).toBeLessThanOrEqual(original.length);
			expect(c.from).toBeLessThanOrEqual(c.to);
		}
		expect(applyChanges(original, changes)).toBe(corrected);
	});
});

describe('diffChanges: realistic copy-edit fixtures read at word granularity', () => {
	it('a homophone fix their -> there', () => {
		const original = 'Put it over their on the shelf.';
		const corrected = 'Put it over there on the shelf.';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		expect(original.slice(changes[0].from, changes[0].to)).toBe('their');
		expect(changes[0].replacement).toBe('there');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('a punctuation fix adds a missing comma', () => {
		const original = 'Yes I will come along.';
		const corrected = 'Yes, I will come along.';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(1);
		expect(changes[0].replacement).toContain(',');
		expect(applyChanges(original, changes)).toBe(corrected);
	});

	it('handles two separate edits as two changes that both apply', () => {
		const original = 'The qick brown fox jumpd over.';
		const corrected = 'The quick brown fox jumped over.';
		const changes = diffChanges(original, corrected);
		expect(changes).toHaveLength(2);
		expect(applyChanges(original, changes)).toBe(corrected);
	});
});
