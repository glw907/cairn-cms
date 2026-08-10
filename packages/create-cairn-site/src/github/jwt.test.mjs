import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { appJwt } from './jwt.mjs';

test('appJwt produces a real RS256-signed JWT with the GitHub App claim shape', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });
  const now = 1_700_000_000;

  const jwt = appJwt(12345, privateKey, now);
  const [headerB64, payloadB64, signatureB64] = jwt.split('.');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  assert.ok(verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url')));

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  assert.equal(header.alg, 'RS256');
  assert.equal(header.typ, 'JWT');

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  assert.equal(payload.iat, now - 60);
  assert.equal(payload.exp, now + 540);
  assert.equal(payload.iss, '12345');
});

test('appJwt stringifies a numeric app id in the iss claim', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });
  const jwt = appJwt(99, privateKey, 1_700_000_000);
  const [, payloadB64] = jwt.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  assert.equal(typeof payload.iss, 'string');
  assert.equal(payload.iss, '99');
});
