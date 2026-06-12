import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../lib/escape.js';

describe('escapeHtml', () => {
  it('escapes the five entities', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Powered by Cairn')).toBe('Powered by Cairn');
  });
});
