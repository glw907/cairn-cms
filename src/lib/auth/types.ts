// cairn-cms: the auth session and editor shapes shared by the D1 store, the guard, and the
// manage-editors screen. AuthEnv is a structural subset of Platform.env, so auth code takes it
// directly instead of importing a consumer's whole platform type.
import type { D1Database } from '@cloudflare/workers-types';
import type { Capability, RolesDeclaration } from './roles.js';

/**
 * The Register interface a site augments to type its role vocabulary. A site declares
 * `interface CairnRolesRegister { roles: typeof roles }` in `app.d.ts`; `Role` then narrows to the
 * site's declared names. Unaugmented, it stays empty and `Role` defaults to the owner/editor pair.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CairnRolesRegister {}

/**
 * The role names the engine reads on `locals.editor`. Registry-derived: the site's declared names
 * when it augments `CairnRolesRegister`, else the implicit `'owner' | 'editor'` pair.
 */
export type Role = CairnRolesRegister extends { roles: infer R }
  ? R extends RolesDeclaration
    ? Extract<keyof R, string>
    : 'owner' | 'editor'
  : 'owner' | 'editor';

/**
 * The session shape the whole admin reads: guard, loads, content fns, manage-editors. `capability`
 * is resolved from the role wherever the engine materializes an `Editor` (the guard, the store); it
 * is optional here because Task 1 introduces the field and later tasks fill every construction site.
 */
export interface Editor {
  email: string;
  displayName: string;
  role: Role;
  capability?: Capability;
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

/** Worker bindings and vars the auth layer reads; a structural subset of `Platform.env`. */
export interface AuthEnv {
  AUTH_DB?: D1Database;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN?: string;
  /**
   * Dev-backend tripwire flag. The dev backend sets this in local development; if it is ever set in
   * a deployed runtime the guard refuses (the build-foldable `dev` gate should have eliminated the
   * dev backend, so a set flag signals a polluted environment). A string from a Worker var or a
   * boolean.
   */
  CAIRN_DEV_BACKEND?: string | boolean;
  /** Cloudflare Email Sending binding. */
  EMAIL?: {
    send(message: {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
      /** CC recipient(s), optional (live-verified against the Email Sending API, 2026-07-07). */
      cc?: EmailRecipient | EmailRecipient[];
      /** BCC recipient(s), the same shape as `cc`. */
      bcc?: EmailRecipient | EmailRecipient[];
      /**
       * Reply-to address. Unlike `cc`/`bcc`, the platform accepts only a single address here: an
       * array is rejected (live-probed 2026-07-07, ASC migration).
       */
      replyTo?: string;
      /** File and inline attachments. */
      attachments?: EmailAttachment[];
    }): Promise<void>;
  };
}
