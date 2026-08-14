import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, pickAllowlist, renderHeader, renderPage, SERVES_DURING_RUN_SENTENCE } from './render.mjs';

test('escapeHtml escapes every HTML-significant character', () => {
  assert.equal(escapeHtml(`<script>alert('x')</script> & "quoted"`), '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quoted&quot;');
});

test('escapeHtml coerces a non-string value to a string first', () => {
  assert.equal(escapeHtml(42), '42');
});

test('pickAllowlist keeps only the named dotted paths, preserving nesting', () => {
  const record = {
    id: 'site-a1b2c3',
    cloudflare: { domain: 'example.com', apiToken: 'SECRET', zoneId: 'z1' },
    github: { pem: 'PEM-SECRET' },
  };
  const safe = pickAllowlist(record, ['id', 'cloudflare.domain']);
  assert.deepEqual(safe, { id: 'site-a1b2c3', cloudflare: { domain: 'example.com' } });
});

test('pickAllowlist silently skips a field the record does not have', () => {
  const safe = pickAllowlist({ id: 'x' }, ['id', 'cloudflare.domain']);
  assert.deepEqual(safe, { id: 'x' });
});

test('renderHeader escapes and joins the chapter and hop', () => {
  const header = renderHeader({ chapter: 'Chapter 3: Workers Builds', hop: 'Watch <the> build' });
  assert.match(header, /Chapter 3: Workers Builds/);
  assert.match(header, /Watch &lt;the&gt; build/);
});

test('renderPage includes the header, the body, and the serves-during-a-run-only sentence', () => {
  const html = renderPage({ chapter: 'Chapter 3', hop: 'Watch the build', bodyHtml: '<p>hello</p>' });
  assert.match(html, /Chapter 3/);
  assert.match(html, /Watch the build/);
  assert.match(html, /<p>hello<\/p>/);
  assert.match(html, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('renderPage with no refreshSeconds emits no meta refresh at all', () => {
  const html = renderPage({ chapter: 'Chapter 3', hop: 'Watch the build', bodyHtml: '<p>hello</p>' });
  assert.doesNotMatch(html, /http-equiv="refresh"/);
});

test('renderPage with refreshSeconds emits a meta refresh at that interval', () => {
  const html = renderPage({ chapter: 'Chapter 3', hop: 'Watch the build', bodyHtml: '<p>hello</p>', refreshSeconds: 5 });
  assert.match(html, /<meta http-equiv="refresh" content="5">/);
});

test('renderPage defaults the document title to the chapter label', () => {
  const html = renderPage({ chapter: 'Chapter 3', hop: 'Watch the build', bodyHtml: '<p>hello</p>' });
  assert.match(html, /<title>Chapter 3<\/title>/);
});
