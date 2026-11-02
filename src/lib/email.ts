// The email boundary. The send is injected so tests capture links in a sink with no
// send_email binding; production passes `cloudflareSend`, which calls env.EMAIL.send
// (Cloudflare Email Sending, arbitrary recipients).
import type { EmailAttachment, EmailRecipient } from './auth/types.js';
import type { CairnEnv } from './env.js';
import { CairnError } from './diagnostics/index.js';
import { escapeHtml } from './escape.js';
import { log } from './log/index.js';

export type { EmailAttachment, EmailRecipient };

/**
 * The message a built magic-link email carries. `to`/`from`/`subject`/`html`/`text` are the
 * shape `buildMagicLinkMessage` fills; `cc`/`bcc`/`replyTo`/`attachments` are optional widenings
 * of the Email Sending API surface (live-verified 2026-07-07) that a custom `SendMagicLink` or a
 * site composing its message may set. `replyTo` takes a single address only, since the
 * platform rejects an array there (live-probed 2026-07-07 during a consumer-site migration),
 * unlike `cc`/`bcc`.
 * @public
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

/**
 * The email-sending seam `CairnEnv['EMAIL']` and `CairnPlatformBindings['EMAIL']` both reference:
 * a binding, or an injected sender, that takes a built magic-link message. The return type is
 * `Promise<unknown>`, not `Promise<void>`, so a Cloudflare Email Sending binding's `SendEmail.send`
 * (`@cloudflare/workers-types`), which resolves `Promise<EmailSendResult>`, satisfies this
 * structurally with no cast.
 * @public
 */
export interface EmailSender {
  send(message: MagicLinkMessage): Promise<unknown>;
}

/**
 * The injected send. Production uses `cloudflareSend`; tests pass a sink. A thrown error's
 *  text reaches the structured log (scrubbed and truncated), so a custom sender must not embed
 *  the message body or the magic link in what it throws.
 * @public
 */
export type SendMagicLink = (env: CairnEnv, message: MagicLinkMessage) => Promise<void>;

/** Build the confirmation email. The link is the only action; the copy stays plain. */
export function buildMagicLinkMessage(input: {
  to: string;
  siteName: string;
  /** The runtime's `SenderConfig`, spelled structurally: this module loads in the site-shaped type program, which must not reach the render pipeline through `content/types`. */
  sender: { from: string; replyTo?: string };
  link: string;
}): MagicLinkMessage {
  const { to, siteName, sender, link } = input;
  const subject = `Sign in to ${siteName}`;
  const expiry = 'The link expires in 10 minutes.';
  const ignore = 'If you didn’t request it, you can ignore this email.';
  const text = `${siteName}\n\nSign in: ${link}\n\n${expiry}\n${ignore}`;
  // Both `link` and `siteName` are escaped: the site name is site config, and the link lands in
  // an attribute and in text. Mail clients strip <style> and remote assets, so the layout is
  // inline styles on a one-cell table, in fixed hex values near the admin's Warm Stone neutrals.
  const name = escapeHtml(siteName);
  const href = escapeHtml(link);
  const font = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const html =
    `<div style="background:#f6f3f0;padding:24px;${font};color:#3a3632">` +
    `<div style="max-width:480px;margin:0 auto;background:#fcfaf8;border:1px solid #e1dcd7;border-radius:8px;padding:32px">` +
    `<p style="margin:0 0 24px;font-size:18px;font-weight:600">${name}</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px"><tr>` +
    `<td style="background:#6a45c9;border-radius:6px"><a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none">Sign in</a></td>` +
    `</tr></table>` +
    `<p style="margin:0 0 24px;font-size:14px;word-break:break-all">${href}</p>` +
    `<p style="margin:0 0 8px;font-size:14px">${expiry}</p>` +
    `<p style="margin:0;font-size:14px;color:#6b645d">${ignore}</p>` +
    `</div></div>`;
  return { to, from: sender.from, subject, html, text, replyTo: sender.replyTo };
}

/** The production send: Cloudflare Email Sending through the EMAIL binding. Logs `auth.link.sent` with the ID Cloudflare returned; a custom `send` logs for itself. */
export const cloudflareSend: SendMagicLink = async (env, message) => {
  if (!env.EMAIL) {
    throw new CairnError('config.bindings-missing', { message: 'EMAIL binding is not configured' });
  }
  const result = await env.EMAIL.send(message);
  // The binding returns `unknown` here, and a test fake returns nothing, so read the id defensively.
  const messageId = (result as { messageId?: string } | undefined)?.messageId;
  log.info('auth.link.sent', { email: message.to, messageId });
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
 * as the cause. The not-verified code is the onboarding gap (a real-world consumer fault); the
 * live binding has also been observed throwing the bare "not a verified address" string with no
 * code, so that message maps to the same condition. Everything else is the generic send failure.
 * The caller logs the conditionId and code, and returns a send-error outcome.
 */
export function emailSendFailure(err: unknown): CairnError {
  const onboarding =
    errorCode(err) === 'E_SENDER_NOT_VERIFIED' || String(err).includes('not a verified address');
  return new CairnError(onboarding ? 'email.sender-not-onboarded' : 'email.send-failed', { cause: err });
}
