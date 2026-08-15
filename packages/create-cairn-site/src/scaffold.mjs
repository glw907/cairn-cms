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
import { access, cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineAction, runActions } from './runner.mjs';
import { applySubstitutions } from './substitute.mjs';
import { newSiteId, saveSite, siteStateDir } from './state.mjs';
import { slugify } from './slug.mjs';
import { nameWranglerResources, workerNameFor } from './cloudflare/config.mjs';

const ADMIN_URL = 'http://localhost:5173/admin';

/**
 * The name of the atomic-claim marker file a scaffolded directory carries until the GitHub
 * chapter finishes pushing it. Defined here (rather than in the GitHub chapter's own module)
 * so `src/github/repo.mjs`'s tree walk can skip it without an import cycle; Task 11 builds the
 * claim mechanism that writes and clears it.
 */
export const SCAFFOLD_SENTINEL = '.cairn-scaffold-claim';

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
 * Rename the copied template's dot-free `gitignore` file (see bake-template.mjs's
 * `renameGitignoreForPacking`, which stores it that way because npm's packlist strips any file
 * literally named `.gitignore` from a published tarball) back to the working `.gitignore` name
 * inside a newly scaffolded site. Throws naming the template when the file is missing, since a
 * scaffold with no `.gitignore` leaves `pushScaffold`'s own ignore-honoring with nothing to read,
 * and `.dev.vars`/`.wrangler/` would then be one `git add -A` away from reaching GitHub.
 * @param {string} dir the scaffold target, already carrying the copied template
 * @returns {Promise<void>}
 */
async function restoreGitignore(dir) {
  try {
    await rename(path.join(dir, 'gitignore'), path.join(dir, '.gitignore'));
  } catch (cause) {
    if (cause.code === 'ENOENT') {
      throw new Error(
        `scaffold: the template carries no "gitignore" file to restore as .gitignore in ${dir}. ` +
          'Run "npm run prepack" to re-bake the template, or check examples/showcase/.gitignore.',
      );
    }
    throw cause;
  }
}

/**
 * Fail when the target directory already exists and holds files, naming the directory and the
 * two ways forward. An existing empty directory is fine, since the recursive copy fills it in. A
 * directory whose only entry is the atomic-claim sentinel is a distinct case, an earlier run that
 * crashed mid-copy, so it gets its own, more specific message and recovery instruction rather than
 * the generic "not empty" refusal.
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
  if (entries.length === 1 && entries[0] === SCAFFOLD_SENTINEL) {
    throw new Error(
      `scaffold: a previous create-cairn-site run was interrupted while scaffolding ${dir}. ` +
        'Remove the directory and run the command again.',
    );
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
 * @returns {Promise<{ executed: number, skipped: number, siteId: string }>} the action runner's
 *  result, plus the site id the state record was (or, under --dry-run, would be) saved under; the
 *  id is generated up front rather than inside the state action so a caller (bin.mjs, wiring the
 *  GitHub chapter) has it even when the state-save action itself was skipped
 */
export async function scaffold({ templateDir, answers, dir, dryRun, log }) {
  await assertTemplateBaked(templateDir);
  await assertTargetDirEmpty(dir);

  const slug = slugify(answers.name, 'cairn-site');
  const packageJsonPath = path.join(dir, 'package.json');
  const siteId = newSiteId(answers.name);

  const actions = [
    defineAction({
      title: `Create ${dir} from the template`,
      detail: `Copies the baked template into ${dir}.`,
      // Claim the directory atomically before copying into it, so two runs racing on the same
      // --dir (the early assertTargetDirEmpty check above cannot close this window by itself)
      // fail one of them loudly instead of interleaving two copies. `wx` is the load-bearing
      // flag: it is the write that either creates the sentinel or fails with EEXIST, never both
      // succeeding for two concurrent callers.
      execute: async () => {
        await mkdir(dir, { recursive: true });
        const sentinelPath = path.join(dir, SCAFFOLD_SENTINEL);
        try {
          await writeFile(sentinelPath, String(process.pid), { flag: 'wx' });
        } catch (cause) {
          if (cause.code === 'EEXIST') {
            throw new Error(
              `scaffold: another create-cairn-site run is already scaffolding ${dir}. Wait for ` +
                'it to finish, or if it crashed, remove the directory and run the command again.',
            );
          }
          throw cause;
        }
        try {
          await cp(templateDir, dir, { recursive: true });
          await restoreGitignore(dir);
        } finally {
          await rm(sentinelPath, { force: true });
        }
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
      detail:
        'Writes the site name, description, and brand color into the template, and names its ' +
        "wrangler.jsonc resources after the site's slug.",
      execute: async () => {
        await applySubstitutions(dir, answers);
        await nameWranglerResources(dir, workerNameFor(answers.name));
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
          await saveSite(siteId, { name: answers.name, dir, step: 'scaffolded' });
        } catch (cause) {
          log(
            `Warning: could not save the site record at ${siteStateDir()} (${cause.message}). ` +
              'The site itself is complete; only this bookkeeping record failed.',
          );
        }
      },
    }),
  ];

  const result = await runActions(actions, { dryRun, log });
  return { ...result, siteId };
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
 * reached the admin (the dev backend needed `CAIRN_DEV_BACKEND=1` at runtime on top of its
 * build-time define) and that a scaffolded reader has no idea the admin they land on is a local
 * stand-in. The second fact is still load-bearing; the first is now fixed at the source, by the
 * scaffold's own `npm run dev` (a shim baked into `scripts/dev.mjs`, see bake-template.mjs),
 * so this text prints the plain command rather than teach a variable it no longer needs.
 * @param {{ dir: string }} options `dir` is the scaffolded directory to `cd` into
 * @returns {string} the hand-over text, ready to print as-is
 */
export function handoverText({ dir }) {
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
    '  npm run dev',
    '',
    `Then open ${ADMIN_URL} (vite prints the URL it actually used).`,
    '',
    'That admin runs against a local stand-in. It signs you in without an email loop, and nothing',
    'you write there touches GitHub or sends real email. Write a post, save it, publish it, and',
    "watch it appear on the site. The scaffold's own dev script turns the stand-in on.",
    '',
    'Run `npx cairn-doctor` any time to check what is set up and what is still missing.',
    '',
    'This scaffold is local only. Putting the site on the internet needs a GitHub repository, a',
    'Cloudflare account, and a domain you own; sending sign-in email to anyone but yourself also',
    "needs Cloudflare's Workers Paid plan. Those steps arrive with the next release.",
  ].join('\n');
}
