// Setup for `S03-second-sign-in-group`: the two pieces of a members channel that are the site's
// own code, the roster lookup and the mail transport, so the session works only on the channel
// itself. The roster is a fixed list and the mailer a stub, which keeps the case static.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROSTER = `// The member roster. A real site reads its own store; this one is a fixed list.
const MEMBERS = new Map<string, string>([
  ['ada@example.com', 'member-1'],
  ['grace@example.com', 'member-2'],
]);

/** The member's stable id for a lowercased, trimmed email, or null when the email is not a member. */
export async function memberIdFor(email: string): Promise<string | null> {
  return MEMBERS.get(email) ?? null;
}
`;

const MAILER = `// The site's mail transport for member sign-in codes. The provider call lands here later.
const outbox: { email: string; code: string }[] = [];

/** Send a member their one-time sign-in code. */
export async function sendMemberCode(email: string, code: string): Promise<void> {
  outbox.push({ email, code });
}
`;

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/lib/server'), { recursive: true });
  writeFileSync(join(root, 'src/lib/server/roster.ts'), ROSTER);
  writeFileSync(join(root, 'src/lib/server/mailer.ts'), MAILER);
}
