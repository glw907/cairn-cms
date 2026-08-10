// GitHub App JWT signing (RS256), the credential a client presents to act as the App itself
// (creating installation tokens, listing installations) rather than as an installed account.
// This module is deliberately narrow: it builds and signs the token, nothing more, so the
// caller controls when it is minted and how long it is trusted for.
import { createSign } from 'node:crypto';

/**
 * Base64url-encode a JSON-serializable value, per RFC 7515's JWS segment encoding.
 * @param {unknown} value the value to encode
 * @returns {string} the base64url-encoded JSON
 */
function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Build and RS256-sign a GitHub App JWT.
 * @param {number | string} appId the GitHub App id, stringified into the `iss` claim
 * @param {string} pem the App's PKCS#1 or PKCS#8 RSA private key, PEM-encoded
 * @param {number} [nowSeconds] the clock to mint against, in Unix seconds; defaults to the
 *  current time, and is otherwise injectable so a test can sign against a fixed clock
 * @returns {string} the compact JWS: `<header>.<payload>.<signature>`, each segment base64url
 */
export function appJwt(appId, pem, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = encodeSegment({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeSegment({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: String(appId) });
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(pem).toString('base64url');
  return `${signingInput}.${signature}`;
}
