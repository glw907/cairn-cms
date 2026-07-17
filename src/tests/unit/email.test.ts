import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  buildMagicLinkMessage,
  cloudflareSend,
  type AuthEnv,
  type EmailAttachment,
  type EmailRecipient,
  type MagicLinkMessage,
} from '../../lib/email.js';
import { CairnError } from '../../lib/diagnostics/index.js';

describe('buildMagicLinkMessage', () => {
  it('addresses the editor and embeds the link in both parts', () => {
    const msg = buildMagicLinkMessage({
      to: 'ed@x.dev',
      branding: { siteName: 'EC Nordic', from: 'noreply@ecnordic.ski' },
      link: 'https://ecnordic.ski/admin/auth/confirm?token=abc',
    });
    expect(msg.to).toBe('ed@x.dev');
    expect(msg.from).toBe('noreply@ecnordic.ski');
    expect(msg.subject).toContain('EC Nordic');
    expect(msg.html).toContain('https://ecnordic.ski/admin/auth/confirm?token=abc');
    expect(msg.text).toContain('https://ecnordic.ski/admin/auth/confirm?token=abc');
  });

  it('escapes HTML-significant characters in the site name', () => {
    const msg = buildMagicLinkMessage({
      to: 'ed@x.dev',
      branding: { siteName: 'A & B <script>', from: 'noreply@x.dev' },
      link: 'https://x.dev/admin/auth/confirm?token=abc',
    });
    expect(msg.html).toContain('A &amp; B &lt;script&gt;');
    expect(msg.html).not.toContain('<script>');
  });

  it('carries a configured branding replyTo onto the built message', () => {
    const msg = buildMagicLinkMessage({
      to: 'ed@x.dev',
      branding: { siteName: 'EC Nordic', from: 'noreply@ecnordic.ski', replyTo: 'editors@ecnordic.ski' },
      link: 'https://ecnordic.ski/admin/auth/confirm?token=abc',
    });
    expect(msg.replyTo).toBe('editors@ecnordic.ski');
  });

  it('leaves replyTo undefined when the branding does not configure one', () => {
    const msg = buildMagicLinkMessage({
      to: 'ed@x.dev',
      branding: { siteName: 'EC Nordic', from: 'noreply@ecnordic.ski' },
      link: 'https://ecnordic.ski/admin/auth/confirm?token=abc',
    });
    expect(msg.replyTo).toBeUndefined();
  });
});

describe('cloudflareSend', () => {
  it('calls the EMAIL binding with the built message', async () => {
    const sent: unknown[] = [];
    const env: AuthEnv = { EMAIL: { send: async (m) => void sent.push(m) } };
    await cloudflareSend(env, {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    });
    expect(sent).toHaveLength(1);
  });

  it('throws a clear error when the EMAIL binding is missing', async () => {
    await expect(
      cloudflareSend({}, { to: 'a', from: 'b', subject: 's', html: 'h', text: 't' }),
    ).rejects.toThrow(/EMAIL/);
  });

  it('names the registered bindings condition on the missing-binding throw', async () => {
    const thrown: unknown = await cloudflareSend(
      {},
      { to: 'a', from: 'b', subject: 's', html: 'h', text: 't' },
    ).catch((err: unknown) => err);
    expect(thrown).toBeInstanceOf(CairnError);
    expect((thrown as CairnError).conditionId).toBe('config.bindings-missing');
  });
});

// The widened cc/bcc/replyTo/attachments fields have no runtime companion (cloudflareSend
// forwards the message as-is), so the compile is the test: each case below fails svelte-check
// if the widened shape regresses.
describe('MagicLinkMessage widened fields (type-level)', () => {
  it('keeps the original five-field shape valid with no widened fields set', () => {
    const msg: MagicLinkMessage = {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    };
    expect(msg.cc).toBeUndefined();
  });

  it('accepts cc/bcc as a bare address, a named address, or an array of either', () => {
    const named: EmailRecipient = { email: 'cc@x.dev', name: 'CC' };
    const msg: MagicLinkMessage = {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      cc: 'cc@x.dev',
      bcc: [named, 'bcc2@x.dev'],
    };
    expect(msg.cc).toBe('cc@x.dev');
    expect(msg.bcc).toEqual([named, 'bcc2@x.dev']);
  });

  it('accepts a single reply-to address, and rejects an array', () => {
    const msg: MagicLinkMessage = {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      replyTo: 'reply@x.dev',
    };
    expect(msg.replyTo).toBe('reply@x.dev');
    // @ts-expect-error reply-to arrays are rejected by the platform (live-probed 2026-07-07);
    // the type carries a single address only.
    const rejected: MagicLinkMessage['replyTo'] = ['a@x.dev', 'b@x.dev'];
    expect(rejected).toBeDefined();
  });

  it('accepts typed attachments', () => {
    const attachments: EmailAttachment[] = [
      { content: 'YmFzZTY0', filename: 'a.txt', type: 'text/plain', disposition: 'attachment' },
      { content: new ArrayBuffer(4), filename: 'b.png', type: 'image/png', disposition: 'inline' },
    ];
    const msg: MagicLinkMessage = {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      attachments,
    };
    expect(msg.attachments).toHaveLength(2);
  });

  it('widens the AuthEnv EMAIL binding to accept a MagicLinkMessage carrying every field', () => {
    expectTypeOf<
      Parameters<NonNullable<AuthEnv['EMAIL']>['send']>[0]
    >().toMatchTypeOf<MagicLinkMessage>();
  });
});
