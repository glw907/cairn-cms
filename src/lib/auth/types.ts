// cairn-cms: the auth session and editor shapes shared by the D1 store, the guard, and the
// manage-editors screen.
import type { Capability, RolesDeclaration } from './roles.js';

/**
 * The Register interface a site augments to type its role vocabulary. A site declares
 * `interface CairnRolesRegister { roles: typeof roles }` in `app.d.ts`; `Role` then narrows to the
 * site's declared names. Unaugmented, it stays empty and `Role` defaults to the owner/editor pair.
 */
export interface CairnRolesRegister {}

/**
 * The role names the engine reads on `locals.cairnEditor`. Registry-derived: the site's declared names
 * when it augments `CairnRolesRegister`, else the implicit `'owner' | 'editor'` pair.
 */
export type Role = CairnRolesRegister extends { roles: infer R }
  ? R extends RolesDeclaration
    ? Extract<keyof R, string>
    : 'owner' | 'editor'
  : 'owner' | 'editor';

/**
 * The session shape the whole admin reads: guard, loads, content fns, manage-editors. `capability`
 * is resolved from the role wherever the engine materializes an `Editor`; the store itself does not
 * know the vocabulary, so it returns the narrower `EditorRow` (see `../auth/store.js`) and only the
 * guard and the routes that read the vocabulary fill this field.
 */
export interface Editor {
  email: string;
  displayName: string;
  role: Role;
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
