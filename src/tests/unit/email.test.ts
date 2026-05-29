import { describe, it, expect } from 'vitest';
import { buildMagicLinkMessage, cloudflareSend, type AuthEnv } from '../../lib/email.js';

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
});
