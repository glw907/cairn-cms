import test from 'node:test';
import assert from 'node:assert/strict';
import { EXIT_TEXT, renderExitPage } from './exit-render.mjs';

test('renderExitPage carries the cleared text, the header, and no refresh meta', () => {
  const html = renderExitPage({ chapter: 'Chapter 3: Workers Builds', hop: 'Watch your first Workers Builds deploy' });
  assert.match(html, /Chapter 3: Workers Builds/);
  assert.match(html, /Watch your first Workers Builds deploy/);
  assert.match(html, new RegExp(EXIT_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, /http-equiv="refresh"/);
});
