// The /delivery entry must not pull the server backend into a public bundle. The delivery
// modules and the public-routes loader they re-export must import nothing from github, auth,
// or email. This reads the source statically rather than introspecting a built graph.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const files = [
  ...readdirSync('src/lib/delivery').filter((f) => f.endsWith('.ts')).map((f) => `src/lib/delivery/${f}`),
  'src/lib/sveltekit/public-routes.ts',
];
const forbidden = [/from '\.\.\/github/, /from '\.\.\/auth/, /from '\.\.\/email/, /from '\.\.\/\.\.\/lib\/(github|auth|email)/];

describe('/delivery backend-free boundary', () => {
  it('exposes a barrel', () => {
    const barrel = readFileSync('src/lib/delivery/index.ts', 'utf8');
    expect(barrel).toContain('createSiteIndex');
    // CairnHead moved to the dedicated ./delivery/head entry so the data barrel stays
    // component-free and loads under node without the Svelte vitest plugin.
    expect(barrel).not.toContain('CairnHead');
  });

  it('imports no github, auth, or email module', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(src, `${file} must not import a backend module`).not.toMatch(pattern);
      }
    }
  });
});
