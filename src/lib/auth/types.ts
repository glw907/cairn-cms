// cairn-cms: the auth session and editor shapes shared by the D1 store, the guard, and the
// manage-editors screen.
import type { Capability } from './roles.js';

/**
 * The session shape the whole admin reads: guard, loads, content fns, manage-editors. `role` is
 * the site's declared role name, open (`string`): custom roles are first-class, so the engine
 * types no fixed vocabulary here. `capability` is resolved from the role wherever the engine
 * materializes an `Editor`; the store itself does not know the vocabulary, so it returns the
 * narrower `EditorRow` (see `../auth/store.js`) and only the guard and the routes that read the
 * vocabulary fill this field.
 */
export interface Editor {
  email: string;
  displayName: string;
  role: string;
  capability: Capability;
}

/**
 * A recipient address for the Email Sending API: a bare address string, or an object naming an
 * optional display name alongside it. `cc`/`bcc` accept one of these or an array of them.
 */
export type EmailRecipient = string | { email: string; name?: string };

/**
 * A file or inline attachment for the Email Sending API. `content` is base64-encoded text or raw
 * binary; `disposition` distinguishes a standard file attachment from an image embedded in the
 * HTML body.
 */
export interface EmailAttachment {
  content: string | ArrayBuffer | ArrayBufferView;
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}
