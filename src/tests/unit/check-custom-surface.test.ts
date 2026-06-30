import { describe, it, expect } from 'vitest';
import { pinnedUnlayeredRules, retiredTokenHits } from '../../../scripts/check-custom-surface.mjs';

describe('pinnedUnlayeredRules', () => {
	it('finds exactly the two sanctioned unlayered rules', () => {
		const css = `
@layer components {
  :where([data-theme='cairn-admin']) a { color: inherit; }
}
:where([data-theme='cairn-admin']) .menu li > a:focus-visible { outline: 2px solid; }
:where([data-theme='cairn-admin']) .btn.cairn-btn-guarded[aria-disabled='true'] { pointer-events: auto; }
`;
		const rules = pinnedUnlayeredRules(css);
		expect(rules).toHaveLength(2);
		expect(rules.join(' ')).toContain('.menu');
		expect(rules.join(' ')).toContain('.cairn-btn-guarded');
	});
});

describe('retiredTokenHits', () => {
	it('flags an arbitrary muted/subtle token reference in markup', () => {
		const hits = retiredTokenHits('src/tests/fixtures/retired-token');
		expect(hits.length).toBeGreaterThan(0);
	});
});
