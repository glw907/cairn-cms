// cairn-core: pluggable magic-link email sender.
//
// Default adapter is Cloudflare Email Service → Email Sending (transactional, arbitrary
// recipients) — distinct from Email Routing's recipient-restricted `EmailMessage` flow.
// It is reached through the same `send_email` binding (configured without a
// destination_address) but a different call shape: `binding.send({ to, from, ... })`.
// Resend can slot in behind the same `sendMagicLink` signature if needed.

/** Cloudflare Email Sending binding surface (the object-form `send`, not the MIME form). */
export interface EmailSender {
  send(message: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ messageId: string }>;
}

export async function sendMagicLink(
  sender: EmailSender,
  to: string,
  link: string,
  siteName: string,
  from: string,
): Promise<void> {
  const expiry = "This link expires in 10 minutes and works only once. If you didn't request it, ignore this email.";
  await sender.send({
    to,
    from,
    subject: `Your ${siteName} sign-in link`,
    text: `Sign in to ${siteName}:\n\n${link}\n\n${expiry}`,
    html: `<p>Sign in to ${siteName}:</p><p><a href="${link}">Sign in</a></p><p style="color:#666;font-size:0.9em">${expiry}</p>`,
  });
}
