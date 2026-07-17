// The email boundary. The send is injected so tests capture links in a sink with no
// send_email binding; production passes `cloudflareSend`, which calls env.EMAIL.send
// (Cloudflare Email Sending, arbitrary recipients).
import type { AuthEnv, EmailAttachment, EmailRecipient } from './auth/types.js';
import { CairnError } from './diagnostics/index.js';
import { escapeHtml } from './escape.js';

export type { AuthEnv, EmailAttachment, EmailRecipient };

/**
 * The message a built magic-link email carries. `to`/`from`/`subject`/`html`/`text` are the
 * shape `buildMagicLinkMessage` fills; `cc`/`bcc`/`replyTo`/`attachments` are optional widenings
 * of the Email Sending API surface (live-verified 2026-07-07) that a custom `SendMagicLink` or a
 * site composing its own message may set. `replyTo` takes a single address only, since the
 * platform rejects an array there (live-probed 2026-07-07, ASC migration), unlike `cc`/`bcc`.
 */
export interface MagicLinkMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  cc?: EmailRecipient | EmailRecipient[];
  bcc?: EmailRecipient | EmailRecipient[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/** Per-site identity for the magic-link email, sourced from the adapter. */
export interface AuthBranding {
  siteName: string;
  from: string;
  replyTo?: string;
}

/**
 * The injected send. Production uses `cloudflareSend`; tests pass a sink. A thrown error's
 *  text reaches the structured log (scrubbed and truncated), so a custom sender must not embed
 *  the message body or the magic link in what it throws.
 */
export type SendMagicLink = (env: AuthEnv, message: MagicLinkMessage) => Promise<void>;

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
  return { to, from: branding.from, subject, html, text, replyTo: branding.replyTo };
}

/** The production send: Cloudflare Email Sending through the EMAIL binding. */
export const cloudflareSend: SendMagicLink = async (env, message) => {
  if (!env.EMAIL) {
    throw new CairnError('config.bindings-missing', { message: 'EMAIL binding is not configured' });
  }
  await env.EMAIL.send(message);
};

/**
 * Read the E_* code a Cloudflare Email Sending binding error carries (E_SENDER_NOT_VERIFIED,
 * E_DELIVERY_FAILED, and the rest of the set). The structured `code` property is the documented
 * shape, but it is unproven against the live binding, so a code embedded in the message is read as
 * a fallback. A custom injected sender that throws a plain Error has neither, so this returns
 * undefined and the record still logs cleanly.
 */
export function errorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return String(err).match(/\bE_[A-Z][A-Z_]*\b/)?.[0];
}

/**
 * Map a magic-link send failure to its registered diagnostic condition, carrying the original error
 * as the cause. The not-verified code is the onboarding gap (the ecxc fault); the live binding has
 * also been observed throwing the bare "not a verified address" string with no code, so that
 * message maps to the same condition. Everything else is the generic send failure. The caller logs
 * the conditionId and code, and returns a send_error status.
 */
export function emailSendFailure(err: unknown): CairnError {
  const onboarding =
    errorCode(err) === 'E_SENDER_NOT_VERIFIED' || String(err).includes('not a verified address');
  return new CairnError(onboarding ? 'email.sender-not-onboarded' : 'email.send-failed', { cause: err });
}
