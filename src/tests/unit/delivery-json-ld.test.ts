import { describe, it, expect } from 'vitest';
import { renderJsonLdScript } from '../../lib/delivery/json-ld.js';

describe('renderJsonLdScript', () => {
  it('wraps the data in a typed script tag', () => {
    const out = renderJsonLdScript({ '@type': 'WebSite', name: 'X' });
    expect(out.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(out.endsWith('</script>')).toBe(true);
  });

  it('escapes a script-element breakout in a value', () => {
    const out = renderJsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('</script><img');
    expect(out).toContain('\\u003c/script\\u003e');
  });

  it('escapes the U+2028 and U+2029 separators', () => {
    const out = renderJsonLdScript({ name: 'a b c' });
    // The raw separators must not survive into the script text; they get escaped to their \u2028 / \u2029 forms.
    expect(out).not.toContain(' ');
    expect(out).not.toContain(' ');
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
  });

  it('escaped output parses back to the same object', () => {
    const data = { name: 'a < b & c > d', '</script>': 'x' };
    const out = renderJsonLdScript(data);
    const inner = out.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    const unescaped = inner.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&');
    expect(JSON.parse(unescaped)).toEqual(data);
  });
});
