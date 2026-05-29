// The email boundary. The send is injected so tests capture links in a sink with no
// send_email binding; production passes `cloudflareSend`, which calls env.EMAIL.send
// (Cloudflare Email Sending, arbitrary recipients).
import type { AuthEnv } from './auth/types.js';

export type { AuthEnv };

/** The message a built magic-link email carries. */
export interface MagicLinkMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

/** Per-site identity for the magic-link email, sourced from the adapter. */
export interface AuthBranding {
  siteName: string;
  from: string;
  replyTo?: string;
}

/** The injected send. Production uses `cloudflareSend`; tests pass a sink. */
export type SendMagicLink = (env: AuthEnv, message: MagicLinkMessage) => Promise<void>;

/** Escape the five HTML-significant characters. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Build the confirmation email. The link is the only action; the copy stays plain. */
export function buildMagicLinkMessage(input: {
  to: string;
  branding: AuthBranding;
  link: string;
}): MagicLinkMessage {
  const { to, branding, link } = input;
  const subject = `Sign in to ${branding.siteName}`;
  const text = `Open this link to sign in to ${branding.siteName}:\n\n${link}\n\nThe link expires in 10 minutes. If you did not request it, ignore this email.`;
  // `link` is engine-built and url-safe; `siteName` is site config, so escape it for HTML.
  const name = escapeHtml(branding.siteName);
  const html = `<p>Open this link to sign in to ${name}:</p><p><a href="${link}">Sign in</a></p><p>The link expires in 10 minutes. If you did not request it, ignore this email.</p>`;
  return { to, from: branding.from, subject, html, text };
}

/** The production send: Cloudflare Email Sending through the EMAIL binding. */
export const cloudflareSend: SendMagicLink = async (env, message) => {
  if (!env.EMAIL) throw new Error('EMAIL binding is not configured');
  await env.EMAIL.send(message);
};
