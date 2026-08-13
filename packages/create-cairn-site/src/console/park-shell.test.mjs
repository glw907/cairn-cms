import test from 'node:test';
import assert from 'node:assert/strict';
import { renderParkShell } from './park-shell.mjs';

test('renderParkShell carries the header, the message, the Next: line, the serves sentence, and no refresh meta', () => {
  const html = renderParkShell({
    chapter: 'Chapter 2: Cloudflare',
    hop: 'Point the domain at Cloudflare',
    message: 'The registrar has not delegated this domain yet.',
    next: 'log in to your registrar and set the two nameservers the tool showed you.',
  });
  assert.match(html, /Chapter 2: Cloudflare/);
  assert.match(html, /Point the domain at Cloudflare/);
  assert.match(html, /The registrar has not delegated this domain yet\./);
  assert.match(html, /Next: log in to your registrar/);
  assert.match(html, /served only while this run is waiting/);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
});
