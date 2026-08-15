import { describe, it, expect } from 'vitest';
import { checkReadiness } from '../../../scripts/checks/check-readiness.mjs';

// The gate's core comparison, against fixture markdown. The script's main() wires the same
// function to the real registry (from dist) and the real checklist doc.
const DOC = [
  '# Is it working?',
  '',
  '## Onboard the sending domain',
  '',
  'Body text.',
  '',
  '### Admin CSRF token rejected',
  '',
  'More body text.',
].join('\n');

const cond = (id: string, docsAnchor?: string) => ({ id, docsAnchor });

describe('checkReadiness', () => {
  it('passes a clean pairing of registry anchors and doc headings', () => {
    const conditions = [
      cond('email.sender-not-onboarded', 'is-it-working.md#onboard-the-sending-domain'),
      cond('auth.csrf-token-invalid', 'is-it-working.md#admin-csrf-token-rejected'),
    ];
    expect(checkReadiness(conditions, DOC)).toEqual([]);
  });

  it('accepts two conditions sharing one anchor', () => {
    const conditions = [
      cond('email.sender-not-onboarded', 'is-it-working.md#onboard-the-sending-domain'),
      cond('email.send-failed', 'is-it-working.md#onboard-the-sending-domain'),
    ];
    expect(checkReadiness(conditions, DOC)).toEqual([]);
  });

  it('fails a docsAnchor with no matching heading, naming the condition id', () => {
    const problems = checkReadiness([cond('edge.hsts-off', 'is-it-working.md#turn-on-hsts')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('edge.hsts-off');
    expect(problems[0]).toContain('turn-on-hsts');
  });

  it('fails a docsAnchor that carries no #anchor part', () => {
    const problems = checkReadiness([cond('edge.hsts-off', 'is-it-working.md')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('edge.hsts-off');
  });

  it('fails a condition with no docsAnchor at all', () => {
    const problems = checkReadiness([cond('auth.store-unreachable')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('auth.store-unreachable');
  });

  // The gate used to parse only the part after '#', so a docsAnchor could name a file that does
  // not exist and still pass. Every id resolves against one checklist, so a page rename could
  // have left all 21 anchors naming a deleted file, green. Pass D renamed exactly that page.
  it('fails a docsAnchor whose filename half is not the checklist', () => {
    const problems = checkReadiness(
      [cond('email.sender-not-onboarded', 'cloudflare-readiness.md#onboard-the-sending-domain')],
      DOC,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('email.sender-not-onboarded');
    expect(problems[0]).toContain('cloudflare-readiness.md');
  });

  it('checks the filename half against the doc it is given, not a hardcoded one', () => {
    const conditions = [cond('email.sender-not-onboarded', 'other.md#onboard-the-sending-domain')];
    expect(checkReadiness(conditions, DOC, new Set(), 'docs/somewhere/other.md')).toEqual([]);
  });

  it('lets an explicit allowlist excuse a missing docsAnchor', () => {
    const allow = new Set(['auth.store-unreachable']);
    expect(checkReadiness([cond('auth.store-unreachable')], DOC, allow)).toEqual([]);
  });
});
