import { describe, it, expect } from 'vitest';
import { jsonLdScript } from '../../lib/delivery/json-ld.js';

describe('jsonLdScript', () => {
  it('wraps the data in a typed script tag', () => {
    const out = jsonLdScript({ '@type': 'WebSite', name: 'X' });
    expect(out.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(out.endsWith('</script>')).toBe(true);
  });

  it('escapes a script-element breakout in a value', () => {
    const out = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('</script><img');
    expect(out).toContain('\\u003c/script\\u003e');
  });

  it('escaped output parses back to the same object', () => {
    const data = { name: 'a < b & c > d', '</script>': 'x' };
    const out = jsonLdScript(data);
    const inner = out.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    const unescaped = inner.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&');
    expect(JSON.parse(unescaped)).toEqual(data);
  });
});
