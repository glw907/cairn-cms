import { describe, it, expect } from 'vitest';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkReadiness,
  checkShippedAnchors,
  loadShippedAnchors,
  readinessProblems,
  readinessProblemsForArm,
} from '../../../scripts/checks/check-readiness.mjs';

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

  // A repeated entry can only ever be a mistake (the list is append-only, and a released tag
  // never ships the same fragment twice under two entries), so it is a defect, not silently
  // deduplicated.
  it('flags a duplicate entry as a defect', () => {
    const { anchors, defects } = loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, 'duplicate.json'), ROOT);
    expect(anchors).toEqual([
      'is-it-working.md#onboard-the-sending-domain',
      'is-it-working.md#admin-csrf-token-rejected',
      'is-it-working.md#onboard-the-sending-domain',
    ]);
    expect(defects).toEqual([
      expect.stringContaining('duplicate entry "is-it-working.md#onboard-the-sending-domain"'),
    ]);
  });
});

// main()'s own composition: the live registry/doc pairing plus the shipped-anchor list against
// the same doc. Testing it directly (rather than trusting main()'s own body) is what would have
// caught an edit that wired checkReadiness but dropped the shipped-anchor half.
describe('readinessProblems', () => {
  it('surfaces a failing shipped anchor even when the live registry passes cleanly', () => {
    const conditions = [cond('email.sender-not-onboarded', 'is-it-working.md#onboard-the-sending-domain')];
    const shipped = { anchors: ['is-it-working.md#turn-on-hsts'], defects: [] };
    expect(checkReadiness(conditions, DOC)).toEqual([]);

    const problems = readinessProblems(conditions, DOC, shipped);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('turn-on-hsts');
  });

  it('surfaces the shipped-anchor list\'s own load defects, without also comparing headings', () => {
    const shipped = { anchors: [], defects: ['scripts/checks/shipped-anchors.json: carries no anchors; a released tag always ships at least one'] };
    expect(readinessProblems([], DOC, shipped)).toEqual(shipped.defects);
  });
});

// The admin arm's state (arm-state.mjs) picks the comparison. While the arm holds no page, the
// checklist is gone, so every live docsAnchor is checked against the shipped list instead: a new
// condition cannot ship a fragment no released binary and no checklist agree on. Once the arm holds
// any page it is rebuilt, and the checklist must exist and carry every shipped anchor again, so a
// renamed or split checklist fails rather than disarming the gate.
describe('readinessProblemsForArm', () => {
  const live = [
    cond('email.sender-not-onboarded', 'is-it-working.md#onboard-the-sending-domain'),
    cond('admin.csrf-rejected', 'is-it-working.md#admin-csrf-token-rejected'),
  ];
  const fixture = (name: string) => loadShippedAnchors(join(SHIPPED_ANCHORS_FIXTURES, name), ROOT);

  describe('list mode, with the admin arm absent', () => {
    it('passes when every live docsAnchor is on the shipped list', () => {
      expect(readinessProblemsForArm(live, 'absent', null, fixture('valid.json'))).toEqual([]);
    });

    it('fails a live docsAnchor missing from the shipped list, naming the condition', () => {
      const problems = readinessProblemsForArm(
        [...live, cond('config.hsts-off', 'is-it-working.md#turn-on-hsts')],
        'absent',
        null,
        fixture('valid.json'),
      );
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('config.hsts-off');
      expect(problems[0]).toContain('turn-on-hsts');
    });

    it('still fails a condition with no docsAnchor, or one naming another file', () => {
      const problems = readinessProblemsForArm(
        [cond('no.anchor'), cond('wrong.file', 'other.md#onboard-the-sending-domain')],
        'absent',
        null,
        fixture('valid.json'),
      );
      expect(problems).toEqual([expect.stringContaining('no.anchor'), expect.stringContaining('other.md')]);
    });

    it('fails an absent list', () => {
      expect(readinessProblemsForArm(live, 'absent', null, fixture('does-not-exist.json'))).toEqual([
        expect.stringContaining('does not exist'),
      ]);
    });

    it('fails an empty list', () => {
      expect(readinessProblemsForArm(live, 'absent', null, fixture('empty.json'))).toEqual([
        expect.stringContaining('carries no anchors'),
      ]);
    });

    it('fails a malformed list', () => {
      expect(readinessProblemsForArm(live, 'absent', null, fixture('invalid-json.json'))).toEqual([
        expect.stringContaining('not valid JSON'),
      ]);
      expect(readinessProblemsForArm(live, 'absent', null, fixture('not-object.json'))).toEqual([
        expect.stringContaining('anchors'),
      ]);
    });

    it('checks the committed list against the committed registry anchors it already holds', () => {
      const committed = loadShippedAnchors(join(ROOT, 'scripts/checks/shipped-anchors.json'), ROOT);
      const registry = committed.anchors.map((anchor, i) => cond(`condition.${i}`, anchor));
      expect(readinessProblemsForArm(registry, 'absent', null, committed)).toEqual([]);
    });
  });

  describe('checklist mode, once the admin arm regains a page', () => {
    it('fails when the checklist page does not exist', () => {
      const problems = readinessProblemsForArm(live, 'rebuilt', null, fixture('valid.json'));
      expect(problems).toEqual([expect.stringContaining('docs/admin/is-it-working.md does not exist')]);
    });

    it('fails a shipped anchor the rebuilt checklist no longer carries, even with the live registry on the list', () => {
      const renamed = DOC.replace('Onboard the sending domain', 'Onboard the sender domain');
      const problems = readinessProblemsForArm(
        [cond('admin.csrf-rejected', 'is-it-working.md#admin-csrf-token-rejected')],
        'rebuilt',
        renamed,
        fixture('valid.json'),
      );
      expect(problems).toEqual([expect.stringContaining('onboard-the-sending-domain')]);
    });

    it('passes when the checklist carries every live and shipped anchor', () => {
      expect(readinessProblemsForArm(live, 'rebuilt', DOC, fixture('valid.json'))).toEqual([]);
    });
  });
});
