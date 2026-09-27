import { describe, it, expect } from 'vitest';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReadiness, checkShippedAnchors, loadShippedAnchors } from '../../../scripts/checks/check-readiness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SHIPPED_ANCHORS_FIXTURES = join(ROOT, 'scripts/checks/fixtures/shipped-anchors');

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

describe('checkShippedAnchors', () => {
  const SHIPPED = [
    'is-it-working.md#onboard-the-sending-domain',
    'is-it-working.md#admin-csrf-token-rejected',
  ];

  it('passes when every shipped anchor still resolves', () => {
    expect(checkShippedAnchors(SHIPPED, DOC)).toEqual([]);
  });

  // Review focus 4: a live docsAnchor renamed together with its heading passes checkReadiness,
  // since that comparison only proves today's tree is self-consistent. A released binary keeps
  // printing the old fragment forever, so the frozen shipped list must still catch it.
  it('fails a heading renamed together with its live condition entry', () => {
    const renamedDoc = DOC.replace('Onboard the sending domain', 'Onboard the sender domain');
    const liveConditions = [cond('email.sender-not-onboarded', 'is-it-working.md#onboard-the-sender-domain')];
    expect(checkReadiness(liveConditions, renamedDoc)).toEqual([]);

    const problems = checkShippedAnchors(SHIPPED, renamedDoc);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('onboard-the-sending-domain');
  });

  it('fails a shipped anchor with no #anchor part', () => {
    const problems = checkShippedAnchors(['is-it-working.md'], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('is-it-working.md');
  });

  it('fails a shipped anchor whose filename half is not the checklist', () => {
    const problems = checkShippedAnchors(['other.md#onboard-the-sending-domain'], DOC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('other.md');
  });
});

describe('loadShippedAnchors', () => {
  it('reads the committed list through the script\'s own loader and finds 20 entries', () => {
    const { anchors, defects } = loadShippedAnchors(join(ROOT, 'scripts/checks/shipped-anchors.json'), ROOT);
    expect(defects).toEqual([]);
    expect(anchors).toHaveLength(20);
  });

  it('fails loud on an absent list', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'does-not-exist.json'), ROOT);
    expect(anchors).toEqual([]);
    expect(defects).toEqual([expect.stringContaining('does not exist')]);
  });

  it('fails loud on invalid JSON', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'invalid-json.json'), ROOT);
    expect(anchors).toEqual([]);
    expect(defects).toEqual([expect.stringContaining('not valid JSON')]);
  });

  it('fails loud on a list that is not an object carrying an "anchors" array', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'not-object.json'), ROOT);
    expect(anchors).toEqual([]);
    expect(defects).toEqual([expect.stringContaining('anchors')]);
  });

  it('fails loud on an empty anchors array', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'empty.json'), ROOT);
    expect(anchors).toEqual([]);
    expect(defects).toEqual([expect.stringContaining('carries no anchors')]);
  });

  it('reads a valid fixture list cleanly', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'valid.json'), ROOT);
    expect(defects).toEqual([]);
    expect(anchors).toEqual([
      'is-it-working.md#onboard-the-sending-domain',
      'is-it-working.md#admin-csrf-token-rejected',
    ]);
  });
});
