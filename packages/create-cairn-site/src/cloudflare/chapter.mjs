// The Cloudflare chapter: the guided path from a pushed scaffold to a live, signed-in site. It
// installs the site's own dependencies, signs wrangler in, builds and deploys the Worker,
// migrates both D1 databases, moves the GitHub App's private key from local state into a Worker
// secret, and seeds the owner's first sign-in straight into the deployed database. Every side
// effect, including every prompt, runs as an Action through T1's runActions, so --dry-run prints
// every step's title and detail and touches neither the network nor the state store.
//
// Per the T3 spike, the install action runs FIRST, ahead of the login: the chapter shells out
// through the site's own wrangler devDependency, which does not exist on a fresh scaffold until
// npm install has run, so a login-first order fails on every fresh run.
import { confirm as clackConfirm, text as clackText, isCancel } from '@clack/prompts';
import { exitOnCancel } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { updateSite, loadSite } from '../state.mjs';
import { workerNameFor, writePublicOrigin } from './config.mjs';
import { ensureInstalled, ensureLogin, buildSite, deployWorker, applyMigrations } from './deploy.mjs';
import { movePemToWorkerSecret } from './secret.mjs';
import { seedOwnerAndToken } from './bootstrap.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';

/** Matches an email with a non-empty local part and a non-empty domain part. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/**
 * Run one chapter step as a single-action batch through runActions, mirroring the GitHub
 * chapter's own `runStep` (src/github/chapter.mjs): the step's title always prints, its detail
 * prints only under --dry-run, and `execute` never runs under --dry-run.
 * @param {{ dryRun: boolean, log: (line: string) => void }} frame the run's dry-run frame and logger
 * @param {string} title the step's title, always printed
 * @param {string} detail the step's detail, printed only under --dry-run
 * @param {() => Promise<void>} execute the step's real work; skipped under --dry-run
 * @returns {Promise<void>}
 */
async function runStep(frame, title, detail, execute) {
  await runActions([defineAction({ title, detail, execute })], frame);
}

/**
 * @typedef {object} RunCloudflareChapterInput
 * @property {string} siteId the site's state-store id
 * @property {string} siteName the site's display name, used in printed copy and to derive the
 *  worker name
 * @property {string} dir the scaffolded directory the tool shells out from
 * @property {object} flags the parsed CLI flags (yes, deploy, ownerEmail)
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every step's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to the given URL; defaults to open.mjs's real opener
 * @property {typeof clackConfirm} [confirm] the yes/no prompt; a test seam, defaulting to
 *  @clack/prompts' own, the way GitHub chapter tests inject openBrowser to keep a real browser
 *  trip out of the suite
 * @property {typeof clackText} [text] the free-text prompt; the same kind of test seam as `confirm`
 */

/**
 * Run the Cloudflare chapter: install, sign in, build, deploy, migrate, move the App's key to a
 * Worker secret, and seed the owner's first sign-in. Every hop is persisted to the site's state
 * record before the next one starts.
 * @param {RunCloudflareChapterInput} input the chapter's inputs
 * @returns {Promise<'live' | 'declined'>} `'live'` once the admin's sign-in link has been opened
 *  and the record reaches its final step; `'declined'` when the admin declined consent, chose to
 *  skip it non-interactively, or this was a dry run
 */
export async function runCloudflareChapter({
  siteId,
  siteName,
  dir,
  flags,
  log,
  dryRun,
  openBrowser = defaultOpenBrowser,
  confirm = clackConfirm,
  text = clackText,
}) {
  const frame = { dryRun, log };
  const workerName = workerNameFor(siteName);

  let record = null;
  if (!dryRun) {
    try {
      record = await loadSite(siteId);
    } catch {
      record = null;
    }
  }

  const consentDetail =
    "The tool will now install your site's dependencies, build it, and deploy it to " +
    `Cloudflare's free workers.dev hosting on your account: one Worker named ${workerName} ` +
    `(deploying again later updates it), two databases (${workerName}-auth, ${workerName}-app), ` +
    `and one storage bucket (${workerName}-media). The free plan is enough; nothing in this ` +
    'step costs money. One browser trip to sign in to Cloudflare if you are not already, then ' +
    'one click to sign in to your own site.';

  let consented = false;
  await runStep(frame, 'Deploy your site to Cloudflare', consentDetail, async () => {
    log(consentDetail);
    if (flags.yes && !flags.deploy) {
      log(
        'Skipping the Cloudflare chapter. Re-run with --deploy to install, build, and deploy ' +
          'your site (add --yes too for a fully unattended run).',
      );
      consented = false;
      return;
    }
    if (flags.yes && flags.deploy) {
      consented = true;
      return;
    }
    const answer = await confirm({ message: 'Install, build, and deploy your site now?' });
    if (isCancel(answer)) exitOnCancel();
    consented = answer;
  });
  if (!dryRun && !consented) {
    return 'declined';
  }

  let ownerEmail = flags.ownerEmail?.trim() || record?.ownerEmail;
  await runStep(
    frame,
    'Enter your sign-in email',
    'Asks for the email you will sign in with (for example, you@example.com), and saves it to ' +
      'your progress record.',
    async () => {
      if (flags.yes) {
        if (!ownerEmail || !EMAIL_PATTERN.test(ownerEmail)) {
          throw new Error(
            'A sign-in email is needed to finish this chapter, and --yes leaves no way to ask ' +
              'for one.\nNext step: re-run with --owner-email <you@example.com>.',
          );
        }
      } else {
        for (;;) {
          if (ownerEmail === undefined) {
            const answer = await text({
              message: 'Sign-in email (you will use this to sign in to your own site)',
              placeholder: 'you@example.com',
            });
            if (isCancel(answer)) exitOnCancel();
            ownerEmail = answer;
          }
          if (EMAIL_PATTERN.test(ownerEmail)) break;
          log('That does not look like an email address (needs an @ with something on both sides).');
          ownerEmail = undefined;
        }
      }
      await updateSite(siteId, { ownerEmail });
    },
  );

  await runStep(
    frame,
    "Install your site's dependencies",
    `Runs npm install in ${dir} if its dependencies are not already installed.`,
    () => ensureInstalled({ dir, log }),
  );

  await runStep(
    frame,
    'Sign in to Cloudflare',
    "Confirms wrangler has a signed-in Cloudflare account, driving wrangler's own browser " +
      'sign-in when it does not.',
    () => ensureLogin({ dir, log }),
  );

  await runStep(frame, 'Build your site', `Runs npm run build in ${dir}.`, () => buildSite({ dir, log }));

  let deployUrl;
  await runStep(
    frame,
    'Deploy to workers.dev',
    'Deploys the Worker, writes its URL as PUBLIC_ORIGIN, applies both databases\' migrations, ' +
      'then deploys again so the running site carries its own real origin.',
    async () => {
      const first = await deployWorker({ dir, log });
      await writePublicOrigin(dir, first.url);
      await applyMigrations({ dir, log });
      const second = await deployWorker({ dir, log });
      if (second.url !== first.url) {
        throw new Error(
          `The redeploy came back with a different URL (${second.url}) than the first deploy ` +
            `(${first.url}); the worker name may have changed between the two deploys.\n` +
            `Next step: re-run npx create-cairn-site --dir ${dir}.`,
        );
      }
      deployUrl = second.url;
      await updateSite(siteId, { step: 'deployed', cloudflare: { url: deployUrl, workerName } });
    },
  );

  await runStep(
    frame,
    "Protect your site's App key",
    "Moves the GitHub App's private key from local state into a Worker secret.",
    () => movePemToWorkerSecret({ siteId, dir, log }),
  );

  await runStep(
    frame,
    'Sign you in',
    'Writes your owner row and a ten-minute sign-in link straight into the deployed database, ' +
      'then opens it.',
    async () => {
      const { confirmPath } = await seedOwnerAndToken({ dir, email: ownerEmail, log });
      await openBrowser(`${deployUrl}${confirmPath}`, log);
      log(
        'A sign-in page just opened; click Sign in there. The link works for ten minutes; if it ' +
          'expires, re-run with --sign-in for a fresh one.',
      );
      await updateSite(siteId, { step: 'live' });
    },
  );

  return dryRun ? 'declined' : 'live';
}
