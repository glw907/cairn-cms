import { describe, it, expect } from 'vitest';
import {
  condition,
  allConditions,
  REGISTRY,
  type CairnCondition,
} from '../../lib/diagnostics/conditions.js';

const PASS_3_IDS = [
  'config.bindings-missing',
  'config.observability-off',
  'config.csrf-disable-missing',
  'config.site-config-invalid',
  'auth.store-unreachable',
  'github.app-unreachable',
] as const;

describe('condition registry', () => {
  it('resolves each guard condition by id', () => {
    expect(condition('edge.https-not-forced').severity).toBe('blocker');
    expect(condition('auth.csrf-token-invalid').title).toMatch(/csrf/i);
    expect(condition('auth.csrf-origin-mismatch').logEvent).toBe('guard.rejected');
  });

  it('resolves the two email conditions', () => {
    expect(condition('email.sender-not-onboarded').severity).toBe('blocker');
    expect(condition('email.sender-not-onboarded').remediation).toMatch(
      /wrangler email sending enable/
    );
    expect(condition('email.sender-not-onboarded').logEvent).toBe('auth.link.send_failed');
    expect(condition('email.send-failed').severity).toBe('blocker');
    expect(condition('email.send-failed').logEvent).toBe('auth.link.send_failed');
  });

  it('throws on an unknown id', () => {
    expect(() => condition('nope.not-real')).toThrow(/unknown cairn condition/);
  });

  it('every entry carries the required human fields', () => {
    const required: (keyof CairnCondition)[] = ['id', 'severity', 'title', 'why', 'remediation'];
    for (const c of allConditions()) {
      for (const key of required) expect(c[key], `${c.id}.${key}`).toBeTruthy();
      expect(c.severity === 'blocker' || c.severity === 'warning').toBe(true);
    }
  });

  it('id matches the registry key for every entry', () => {
    for (const c of allConditions()) expect(condition(c.id)).toBe(c);
  });

  it('resolves the Pass 3 doctor conditions with their severities', () => {
    expect(condition('config.bindings-missing').severity).toBe('blocker');
    expect(condition('config.observability-off').severity).toBe('warning');
    expect(condition('config.csrf-disable-missing').severity).toBe('warning');
    expect(condition('config.site-config-invalid').severity).toBe('blocker');
    expect(condition('auth.store-unreachable').severity).toBe('blocker');
    expect(condition('github.app-unreachable').severity).toBe('blocker');
  });

  it('resolves the public-origin condition (the deliberate post-0.50.0 unfreeze)', () => {
    const c = condition('config.public-origin-invalid');
    expect(c.severity).toBe('blocker');
    expect(c.why).toMatch(/unset/i);
    expect(c.why).toMatch(/url/i);
    expect(c.remediation).toContain('PUBLIC_ORIGIN');
    expect(c.remediation).toMatch(/https/);
    expect(c.docsAnchor).toBe('is-it-working.md#set-the-public-origin');
  });

  it('resolves the login-probe condition (the doctor DX pass addition)', () => {
    const c = condition('admin.login-probe-failed');
    expect(c.severity).toBe('blocker');
    expect(c.why).toMatch(/sign-in/i);
    expect(c.remediation).toMatch(/doctor/i);
    expect(c.docsAnchor).toBe('is-it-working.md#probe-the-deployed-admin');
    expect(c.logEvent).toBeUndefined();
  });

  it('resolves the admin-mount condition (the doctor mount-shape nudge)', () => {
    const c = condition('admin.mount-incomplete');
    expect(c.severity).toBe('warning');
    expect(c.why).toMatch(/CairnAdminShell/);
    expect(c.why).toMatch(/shellLoad/);
    expect(c.remediation).toMatch(/createCairnAdmin/);
    expect(c.docsAnchor).toBe('is-it-working.md#wire-the-admin-mount');
    expect(c.logEvent).toBeUndefined();
  });

  it('resolves the dependency-floors condition (the lockfile floor gains teeth)', () => {
    const c = condition('config.dependency-floors-unmet');
    expect(c.severity).toBe('blocker');
    expect(c.why).toMatch(/5\.56\.1/);
    expect(c.remediation).toMatch(/reinstall/i);
    expect(c.docsAnchor).toBe('is-it-working.md#meet-the-dependency-floors');
    expect(c.logEvent).toBeUndefined();
  });

  it('resolves the un-migrated auth-store condition (the login POST no longer 500s bare)', () => {
    const c = condition('auth.store-unmigrated');
    expect(c.severity).toBe('blocker');
    expect(c.why).toMatch(/nonce_hash/);
    expect(c.remediation).toMatch(/0004_login_nonce\.sql/);
    expect(c.docsAnchor).toBe('is-it-working.md#provision-the-auth-store');
    expect(c.logEvent).toBeUndefined();
  });

  it('pins the registry at twenty-three entries', () => {
    // Sixteen through the admin.mount-incomplete addition, plus auth.unknown-role and
    // auth.email-not-normalized for the extensible-roles doctor checks, plus
    // auth.role-wiring-missing for the double-wiring doctor check, plus
    // skill.admin-screens-stale for the packaged skill's doctor delivery, plus
    // config.no-referrer-blanket for the blanket no-referrer doctor check, minus the retired
    // edge.hsts-off, plus config.tidy-key-missing (its own condition id, no longer borrowing
    // config.bindings-missing), plus auth.store-unmigrated for the missing-0004 login fault the
    // store now names. Grow this count only with a registry change.
    expect(allConditions()).toHaveLength(23);
  });

  it('resolves the tidy-key condition (its own id, no longer borrowing config.bindings-missing)', () => {
    const c = condition('config.tidy-key-missing');
    expect(c.severity).toBe('warning');
    expect(c.why).toMatch(/ANTHROPIC_API_KEY/);
    expect(c.remediation).toMatch(/wrangler secret put ANTHROPIC_API_KEY/);
    expect(c.docsAnchor).toBe('is-it-working.md#configure-the-tidy-api-key');
    expect(c.logEvent).toBeUndefined();
  });

  it('resolves the skill-freshness condition (the packaged admin-screens skill delivery)', () => {
    const c = condition('skill.admin-screens-stale');
    expect(c.severity).toBe('warning');
    expect(c.why).toMatch(/cairn-admin-screens/);
    expect(c.remediation).toMatch(/cairn-doctor --fix/);
    expect(c.docsAnchor).toBe('is-it-working.md#refresh-the-admin-screens-skill');
    expect(c.logEvent).toBeUndefined();
  });

  it('resolves the vocabulary and email-normalization conditions (extensible roles)', () => {
    const unknownRole = condition('auth.unknown-role');
    expect(unknownRole.severity).toBe('warning');
    expect(unknownRole.why).toMatch(/vocabulary/i);
    expect(unknownRole.logEvent).toBe('auth.role.unknown');
    expect(unknownRole.docsAnchor).toBe('is-it-working.md#provision-the-auth-store');

    const badEmail = condition('auth.email-not-normalized');
    expect(badEmail.severity).toBe('warning');
    expect(badEmail.why).toMatch(/trimmed and lowercase/i);
    expect(badEmail.logEvent).toBeUndefined();
    expect(badEmail.docsAnchor).toBe('is-it-working.md#provision-the-auth-store');
  });

  it('resolves the role-wiring condition (the double-wiring doctor check)', () => {
    const c = condition('auth.role-wiring-missing');
    expect(c.severity).toBe('warning');
    expect(c.why).toMatch(/createAuthGuard/);
    expect(c.why).toMatch(/none capability/i);
    expect(c.remediation).toMatch(/createAuthGuard\(\{ roles \}\)/);
    expect(c.docsAnchor).toBe('is-it-working.md#provision-the-auth-store');
    expect(c.logEvent).toBe('auth.role.unknown');
  });

  it('resolves the no-referrer-blanket condition (the doctor no-referrer trap check)', () => {
    const c = condition('config.no-referrer-blanket');
    expect(c.severity).toBe('warning');
    expect(c.why).toMatch(/Origin: null/);
    expect(c.why).toMatch(/originMatches/);
    expect(c.remediation).toMatch(/strict-origin-when-cross-origin/);
    expect(c.remediation).toMatch(/no-referrer/);
    expect(c.docsAnchor).toBe('is-it-working.md#scope-a-site-wide-no-referrer-policy');
    expect(c.logEvent).toBeUndefined();
  });

  it('carries no logEvent on the config entries', () => {
    // These conditions surface at deploy or doctor time, not through a runtime log record.
    for (const id of [
      'config.bindings-missing',
      'config.observability-off',
      'config.csrf-disable-missing',
      'config.site-config-invalid',
      'config.public-origin-invalid',
      'config.dependency-floors-unmet',
      'config.no-referrer-blanket',
      'config.tidy-key-missing',
    ]) {
      expect(condition(id).logEvent, id).toBeUndefined();
    }
  });

  it('correlates github.app-unreachable with the github.unreachable log event', () => {
    expect(condition('github.app-unreachable').logEvent).toBe('github.unreachable');
  });

  it('includes every Pass 3 id in allConditions()', () => {
    const ids = allConditions().map((c) => c.id);
    for (const id of PASS_3_IDS) expect(ids).toContain(id);
  });

  it('rejects replacing a registry entry (frozen registry)', () => {
    expect(() => {
      REGISTRY['edge.https-not-forced'] = { ...condition('edge.https-not-forced') };
    }).toThrow(TypeError);
  });

  it('rejects mutating a field on a registry entry (frozen entries)', () => {
    expect(() => {
      condition('edge.https-not-forced').title = 'changed';
    }).toThrow(TypeError);
  });
});
