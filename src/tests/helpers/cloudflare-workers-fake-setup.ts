// Setup file for the projects that alias `cloudflare:workers` to the fake: a fresh, empty,
// non-throwing fake before every test.
import { beforeEach } from 'vitest';
import { resetFakeEnv } from './cloudflare-workers-fake.js';

// The log sink and the dev handle read the Workers user agent. Node tests default to Workers so a
// record stays an object; Chromium keeps its real navigator for CodeMirror's detection.
if (typeof document === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { userAgent: 'Cloudflare-Workers' },
  });
}

beforeEach(() => {
  resetFakeEnv();
});
