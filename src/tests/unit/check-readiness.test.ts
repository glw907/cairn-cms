import { describe, it, expect } from 'vitest';
import { checkReadiness } from '../../../scripts/check-readiness.mjs';

// The gate's core comparison, against fixture markdown. The script's main() wires the same
// function to the real registry (from dist) and the real checklist doc.
const DOC = [
  '# Cloudflare readiness',
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
      cond('email.sender-not-onboarded', 'cloudflare-readiness.md#onboard-the-sending-domain'),
      cond('auth.csrf-token-invalid', 'cloudflare-readiness.md#admin-csrf-token-rejected'),
    ];
    expect(checkReadiness(conditions, DOC)).toEqual([]);
  });

  it('accepts two conditions sharing one anchor', () => {
    const conditions = [
      cond('email.sender-not-onboarded', 'cloudflare-readiness.md#onboard-the-sending-domain'),
      cond('email.send-failed', 'cloudflare-readiness.md#onboard-the-sending-domain'),
    ];
    expect(checkReadiness(conditions, DOC)).toEqual([]);
  });

  it('fails a docsAnchor with no matching heading, naming the condition id', () => {
    const problems = checkReadiness([cond('edge.hsts-off', 'cloudflare-readiness.md#turn-on-hsts')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('edge.hsts-off');
    expect(problems[0]).toContain('turn-on-hsts');
  });

  it('fails a docsAnchor that carries no #anchor part', () => {
    const problems = checkReadiness([cond('edge.hsts-off', 'cloudflare-readiness.md')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('edge.hsts-off');
  });

  it('fails a condition with no docsAnchor at all', () => {
    const problems = checkReadiness([cond('auth.store-unreachable')], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('auth.store-unreachable');
  });

  it('lets an explicit allowlist excuse a missing docsAnchor', () => {
    const allow = new Set(['auth.store-unreachable']);
    expect(checkReadiness([cond('auth.store-unreachable')], DOC, allow)).toEqual([]);
  });
});
