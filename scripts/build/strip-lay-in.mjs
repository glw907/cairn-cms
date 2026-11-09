// Strips the theme lay-in step from an emitted package.json's scripts. It lives apart from the bake so
// the theme-fixture harness, which copies the showcase, can use it without importing the whole bake.

const LAY_IN_COMMAND = 'npm --prefix ../.. run theme:lay-in';

// The showcase lays its theme in before these scripts run; a scaffolded site's theme is already in
// `src/theme/`, and `scripts/theme/lay-in.mjs` exists only in cairn-cms. Each value is the script's
// form in the template, after the lay-in step is stripped.
const LAY_IN_SCRIPTS = {
  predev: 'npm run build:admin-css',
  prebuild: 'npm run build:admin-css',
  precheck: 'npm run build:admin-css',
  'pretest:unit': 'svelte-kit sync',
};

/**
 * Strip the lay-in step from an emitted package.json's scripts in place, leaving each in its
 * template form. Throws naming the script when it is not the exact string expected, so a change to
 * a showcase script surfaces here rather than shipping a script that calls a file the site lacks.
 * @param {{ scripts?: Record<string, string> }} pkg the parsed, emitted package.json
 * @returns {void}
 */
export function stripLayIn(pkg) {
  const scripts = pkg.scripts ?? {};
  for (const [name, templateForm] of Object.entries(LAY_IN_SCRIPTS)) {
    const expected = `${LAY_IN_COMMAND} && ${templateForm}`;
    if (scripts[name] !== expected) {
      throw new Error(`bake: expected the showcase script "${name}" to be "${expected}", found "${scripts[name]}"`);
    }
    scripts[name] = templateForm;
  }
}
