#!/usr/bin/env node
// The theme viewer: renders the standard content and the conformance set under any theme, option,
// color mode, and width, on a workstation with no Cloudflare account.
//
//   npm run theme:view -- [--theme <id|dir>]
//     Interactive: serves a control page and prints one JSON line naming its address and the site's.
//       THEME_VIEWER_PORT and THEME_VIEWER_SITE_PORT pin the two ports; each defaults to a free one.
//   npm run theme:view -- --headless --pages <list|all> --widths <list> [--modes <list>]
//       [--option <key>=<value[,value]>]... [--viewport-only] [--out <dir>] [--theme <id|dir>]
//     Headless: builds once per option combination and mode, saves a PNG per page and width, and
//       prints a JSON list of what it wrote.
//
// A theme is found only through templates/catalog.json and its manifest, or a directory given to
// `--theme`.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { repoRoot } from '../repo-root.mjs';
import { runHeadless } from './viewer/headless.mjs';
import { startInteractive } from './viewer/interactive.mjs';

export { runHeadless, startInteractive };

/**
 * Split a comma list.
 * @param {string | undefined} value
 * @returns {string[] | undefined}
 */
function list(value) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : undefined;
}

/**
 * Run the CLI.
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
async function main(argv) {
  const root = repoRoot(import.meta.url);
  const { values } = parseArgs({
    args: argv,
    options: {
      theme: { type: 'string' },
      headless: { type: 'boolean', default: false },
      pages: { type: 'string' },
      widths: { type: 'string' },
      modes: { type: 'string' },
      option: { type: 'string', multiple: true },
      'viewport-only': { type: 'boolean', default: false },
      out: { type: 'string' },
    },
  });
  if (!values.headless) {
    const viewer = await startInteractive({ root, theme: values.theme });
    process.on('exit', viewer.stop);
    console.log(JSON.stringify({ control: viewer.controlUrl, site: viewer.siteUrl }));
    console.error('theme viewer running; press Ctrl-C to stop');
    return;
  }
  /** @type {Record<string, string[]>} */
  const options = {};
  for (const pair of values.option ?? []) {
    const [key, ...rest] = pair.split('=');
    if (!key || rest.length === 0) throw new Error(`--option takes <key>=<value>, not "${pair}"`);
    options[key] = [...(options[key] ?? []), ...rest.join('=').split(',')];
  }
  const pages = values.pages === 'all' ? 'all' : (list(values.pages) ?? ['/']);
  const shots = await runHeadless({
    root,
    theme: values.theme,
    pages,
    widths: (list(values.widths) ?? ['1440']).map(Number),
    modes: list(values.modes),
    options,
    viewportOnly: values['viewport-only'],
    outDir: values.out ? path.resolve(values.out) : undefined,
  });
  console.log(JSON.stringify(shots, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    () => {
      // Interactive mode keeps the process alive on its servers; headless mode ends here.
      if (process.argv.includes('--headless')) process.exit(0);
    },
    (error) => {
      console.error(`theme:view: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    },
  );
}
