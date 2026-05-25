// cairn-core: internal encoding helpers shared across modules.
//
// Deliberately NOT re-exported from index.ts — these are implementation details of the
// auth/github crypto, not part of the public API (auth.ts signs tokens, github.ts builds
// the App JWT; both need base64url). Keeping them here stops bytesToB64url leaking through
// the `export *` barrel.

/** Encode bytes as unpadded base64url (RFC 4648 §5) — the JWT/token wire format. */
export function bytesToB64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
