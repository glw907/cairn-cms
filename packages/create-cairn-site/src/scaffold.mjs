// The composable scaffold core. It builds the Action list from the separately tested modules
// beside it (the template copy, the package rename, the substitution pass, the out-of-scaffold
// state save) and hands it to the shared action runner, so bin.mjs's job is only argument
// plumbing and printing: --dry-run stays a property of runActions' frame, never a branch
// repeated here.
//
// Two guards run before any action is built, not just before it runs: an unbaked template (a git
// checkout never carries one; only `npm run prepack` does) and a non-empty target directory. Both
// would otherwise surface as a raw ENOENT or a silently overwritten file deep inside the copy
// action, so each is checked up front and fails with a message naming the fix.
import { access, cp, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineAction, runActions } from './runner.mjs';
import { applySubstitutions } from './substitute.mjs';
import { newSiteId, saveSite, siteStateDir } from './state.mjs';
import { slugify } from './slug.mjs';

const ADMIN_URL = 'http://localhost:5173/admin';

/**
 * Fail with a message naming the missing template directory and the bake command that creates
 * it, rather than let cp's raw ENOENT surface from inside the copy action or, worse, let a
 * scaffold proceed against an empty template.
 * @param {string} templateDir the resolved template directory, beside bin.mjs at runtime
 * @returns {Promise<void>}
 */
async function assertTemplateBaked(templateDir) {
  try {
    await access(templateDir);
  } catch {
    throw new Error(
      `scaffold: no template found at ${templateDir}. Run "npm run prepack" inside ` +
        'packages/create-cairn-site to bake it before running the CLI from a checkout.',
    );
  }
}

/**
 * Fail when the target directory already exists and holds files, naming the directory and the
 * two ways forward. An existing empty directory is fine, since the recursive copy fills it in.
 * @param {string} dir the target scaffold directory
 * @returns {Promise<void>}
 */
async function assertTargetDirEmpty(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch (cause) {
    if (cause.code === 'ENOENT') return;
    if (cause.code === 'ENOTDIR') {
      throw new Error(`scaffold: ${dir} is a file, not a directory. Choose a different --dir.`);
    }
    throw cause;
  }
  if (entries.length > 0) {
    throw new Error(
      `scaffold: ${dir} already exists and is not empty. Choose another --dir, or remove it ` +
        'and run the command again.',
    );
  }
}

/**
 * Build the scaffold's action list and run it through the shared action runner.
 * @param {{ templateDir: string, answers: { name: string, description?: string, brandColor?: string },
 *  dir: string, dryRun: boolean, log: (line: string) => void }} options `templateDir` is the baked
 *  template to copy from; `dir` is the scaffold target; `answers` are collectAnswers' result;
 *  `dryRun` and `log` pass straight through to runActions
 * @returns {Promise<{ executed: number, skipped: number }>} the action runner's result
 */
export async function scaffold({ templateDir, answers, dir, dryRun, log }) {
  await assertTemplateBaked(templateDir);
  await assertTargetDirEmpty(dir);

  const slug = slugify(answers.name, 'cairn-site');
  const packageJsonPath = path.join(dir, 'package.json');

  const actions = [
    defineAction({
      title: `Create ${dir} from the template`,
      detail: `Copies the baked template into ${dir}.`,
      execute: async () => {
        await cp(templateDir, dir, { recursive: true });
      },
    }),
    defineAction({
      title: 'Set the package name',
      detail: `Renames package.json's "name" to "${slug}".`,
      execute: async () => {
        const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
        pkg.name = slug;
        await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      },
    }),
    defineAction({
      title: 'Personalize the site',
      detail: 'Writes the site name, description, and brand color into the template.',
      execute: async () => {
        await applySubstitutions(dir, answers);
      },
    }),
    defineAction({
      title: 'Save the site record',
      detail: `Records the scaffold in the state store, outside ${dir}.`,
      // The site is already fully written by the time this action runs. The state record is
      // bookkeeping, not the product, so a failure here (an unwritable state dir, a stray file
      // where it should be, a full disk) is reported and swallowed rather than rejecting the
      // whole run: a rejection here would abort a scaffold that actually succeeded, and the
      // retry would then hit the non-empty-directory guard and tell the user to remove a
      // perfectly good site.
      execute: async () => {
        try {
          await saveSite(newSiteId(answers.name), { name: answers.name, dir, step: 'scaffolded' });
        } catch (cause) {
          log(
            `Warning: could not save the site record at ${siteStateDir()} (${cause.message}). ` +
              'The site itself is complete; only this bookkeeping record failed.',
          );
        }
      },
    }),
  ];

  return runActions(actions, { dryRun, log });
}

/**
 * Build the closing line for a dry run, which must never read as though a site now exists. The
 * hand-over block opens "Your site is scaffolded at ...", true only after a real run; printing it
 * after a dry run would claim a directory the run deliberately did not create.
 * @param {{ dir: string }} options `dir` is the scaffold target the run only described
 * @returns {string} the dry-run closing text, ready to print as-is
 */
export function dryRunNotice({ dir }) {
  return [
    `Dry run: nothing was written, and ${dir} was not created.`,
    '',
    'Run the same command without --dry-run to scaffold the site.',
  ].join('\n');
}

/**
 * Build the printed hand-over block: the terminal script that starts a working local admin, and
 * what T1 does and does not yet cover. Its wording is fixed by the recorded baseline walk
 * (docs/internal/2026-08-unagented-setup-baseline.md), which found a plain `npm run dev` never
 * reaches the admin (the dev backend needs `CAIRN_DEV_BACKEND=1` at runtime on top of its
 * build-time define) and that a scaffolded reader has no idea the admin they land on is a local
 * stand-in. Both facts are load-bearing here, not phrasing to simplify away.
 * @param {{ dir: string, platform: string }} options `dir` is the scaffolded directory to `cd`
 *  into; `platform` selects the shell form of the dev command (`process.platform`)
 * @returns {string} the hand-over text, ready to print as-is
 */
export function handoverText({ dir, platform }) {
  const devCommand =
    platform === 'win32'
      ? '$env:CAIRN_DEV_BACKEND=1; npm run dev'
      : 'CAIRN_DEV_BACKEND=1 npm run dev';
  // path.isAbsolute guards the "./<dir>" copy against a doubled slash when --dir was given as an
  // absolute path (an absolute --dir is a legitimate answer, not just a test convenience).
  const location = path.isAbsolute(dir) ? dir : `./${dir}`;
  return [
    `Your site is scaffolded at ${location}.`,
    '',
    'Next:',
    '',
    `  cd ${dir}`,
    '  npm install',
    `  ${devCommand}`,
    '',
    `Then open ${ADMIN_URL} (vite prints the URL it actually used).`,
    '',
    'That admin runs against a local stand-in. It signs you in without an email loop, and nothing',
    'you write there touches GitHub or sends real email. Write a post, save it, publish it, and',
    'watch it appear on the site. CAIRN_DEV_BACKEND=1 is the switch that turns the stand-in on.',
    '',
    'Run `npx cairn-doctor` any time to check what is set up and what is still missing.',
    '',
    'This scaffold is local only. Putting the site on the internet needs a GitHub repository, a',
    'Cloudflare account, and a domain you own; sending sign-in email to anyone but yourself also',
    "needs Cloudflare's Workers Paid plan. Those steps arrive with the next release.",
  ].join('\n');
}
