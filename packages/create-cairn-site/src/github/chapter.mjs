// The GitHub chapter: the guided path from a local scaffold to a real, publishable site. It
// wires the manifest flow (App creation), the install-and-authorize trip, repo creation, and the
// scaffold push into one ordered run, persisting each hop to the site's state record so a
// failure or a later re-run resumes rather than repeats. Every side effect, including every
// prompt, runs as an Action through T1's runActions, so --dry-run prints every step's title and
// detail and touches neither the network nor the state store; the user access token collected
// during the install trip is a local variable that spans install through push and is never
// written anywhere.
import { confirm, select, text, isCancel, cancel } from '@clack/prompts';
import { defineAction, runActions } from '../runner.mjs';
import { updateSite, siteStateDir } from '../state.mjs';
import { slugify } from '../slug.mjs';
import { startLoopback } from './loopback.mjs';
import { githubRequest } from './api.mjs';
import { runManifestFlow } from './manifest.mjs';
import { installAndAuthorize } from './install.mjs';
import { createRepo, verifyInstallationCovers, pushScaffold } from './repo.mjs';
import { openBrowser as defaultOpenBrowser } from './open.mjs';

const PERMISSION_COST =
  "The App will be able to write this site's content and manage the repository's settings, " +
  "including deleting it. GitHub does not allow an App's permissions to be reduced later, so " +
  'this stays for as long as the App exists. This is what lets the tool create and publish to ' +
  'the repository for you.';

/**
 * End the process after a cancelled prompt, printing a next step rather than letting the
 * cancellation surface as an unhandled rejection. Mirrors prompts.mjs's own exitOnCancel: a
 * mid-chapter Ctrl+C is no different from a mid-scaffold one.
 * @returns {never}
 */
function exitOnCancel() {
  cancel('Cancelled. Run create-cairn-site again when you are ready to continue.');
  process.exit(1);
}

/**
 * Resolve one field: the flag value when supplied (an explicit flag always wins, even under
 * --yes), the given default under --yes, or the interactively prompted answer otherwise. Mirrors
 * prompts.mjs's own resolveField.
 * @param {string | undefined} flagValue the value already supplied on the command line
 * @param {boolean} yes whether --yes was passed
 * @param {string} fallback the default to use under --yes
 * @param {() => Promise<string | symbol>} prompt the @clack/prompts call to run interactively
 * @returns {Promise<string>} the resolved answer
 */
async function resolveField(flagValue, yes, fallback, prompt) {
  if (flagValue !== undefined) return flagValue;
  if (yes) return fallback;
  const answer = await prompt();
  if (isCancel(answer)) exitOnCancel();
  return answer;
}

/**
 * Resolve the organization login for the org branch: `--org` when given, else an interactive
 * prompt. Either source is validated against GitHub with an unauthenticated `GET /orgs/<org>`
 * before it is trusted; a 404 re-prompts interactively, or, with no prompt available under
 * --yes, raises a plain error naming the fix.
 * @param {{ flags: object, log: (line: string) => void }} input the flags and the run's logger
 * @returns {Promise<string>} a login GitHub confirms exists
 */
async function resolveOrgLogin({ flags, log }) {
  let candidate = flags.org;
  for (;;) {
    if (candidate === undefined) {
      const answer = await text({
        message: 'Organization login (the name in github.com/<login>)',
        placeholder: 'your-org',
      });
      if (isCancel(answer)) exitOnCancel();
      candidate = answer;
    }
    const { status } = await githubRequest('GET', `/orgs/${candidate}`);
    if (status !== 404) return candidate;
    const message =
      `GitHub has no organization called '${candidate}'. Use the name from your organization's ` +
      'URL: github.com/<this part>';
    if (flags.yes) {
      throw new Error(`${message}\nNext step: re-run with --org <a-valid-organization-login>.`);
    }
    log(message);
    candidate = undefined;
  }
}

/**
 * Run one chapter step as a single-action batch through runActions, so every step's title always
 * prints, its detail prints only under --dry-run, and `execute` never runs under --dry-run. This
 * is what makes the chapter's steps into Actions without collecting them into one upfront list:
 * later steps can be defined only once earlier steps (consent, the account prompts) have decided
 * whether to reach them.
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
 * @typedef {object} RunGithubChapterInput
 * @property {string} siteId the site's state-store id, as returned by scaffold()
 * @property {string} siteName the site's display name, used only in printed copy
 * @property {string} dir the scaffolded directory, pushed to the new repository and interpolated
 *  into every raised error's message
 * @property {object} flags the parsed CLI flags (yes, github, appName, org, repoName)
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every step's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens
 *  the admin's browser to the given URL; defaults to open.mjs's real opener
 * @property {number} [manifestTimeoutMs] overrides the manifest loopback wait's timeout; a test seam
 * @property {number} [installPollIntervalMs] overrides the install JWT poll interval; a test seam
 * @property {number} [installMaxWaitMs] overrides the install loopback wait and poll budget; a test seam
 */

/**
 * Run the GitHub chapter: create a GitHub App for this site, install and authorize it, create a
 * private repository, and push the scaffold into it. Every hop is persisted to the site's state
 * record before the next one starts, so a later re-run resumes rather than repeats.
 * @param {RunGithubChapterInput} input the chapter's inputs
 * @returns {Promise<'pushed' | 'parked' | 'declined'>} `'pushed'` once the scaffold has landed on
 *  GitHub; `'parked'` when an organization owner's approval is pending (a success state, not a
 *  failure); `'declined'` when the admin declined consent, chose to skip it non-interactively, or
 *  this was a dry run (nothing is ever actually created under --dry-run, so it always reports
 *  declined)
 */
export async function runGithubChapter({
  siteId,
  siteName,
  dir,
  flags,
  log,
  dryRun,
  openBrowser = defaultOpenBrowser,
  manifestTimeoutMs,
  installPollIntervalMs,
  installMaxWaitMs,
}) {
  const frame = { dryRun, log };
  const slug = slugify(siteName, 'cairn-site');

  const ctx = {
    appName: flags.appName ?? `cairn-${slug}`,
    repoName: flags.repoName ?? slug,
    ownerType: flags.org !== undefined ? 'org' : 'user',
    org: flags.org,
    credentials: null,
    userToken: null,
    installationId: null,
    repo: null,
  };

  if (!dryRun) {
    await runStep(
      frame,
      'Check the local progress store',
      `Confirms ${siteStateDir()} is writable before anything is created on GitHub.`,
      async () => {
        try {
          await updateSite(siteId, {});
        } catch (cause) {
          throw new Error(
            `The tool could not save its progress record under ${siteStateDir()} (${cause.message}).\n` +
              'Next step: make that directory writable, then re-run npx create-cairn-site --dir ' +
              `${dir}.`,
          );
        }
      },
    );
  }

  const consentDetail =
    `This step creates a GitHub App named ${ctx.appName} that only this site uses, a private ` +
    `repository named ${ctx.repoName}, and needs two trips to your browser.\n\n${PERMISSION_COST}`;

  let consented = false;
  await runStep(frame, 'Confirm the GitHub App and repository', consentDetail, async () => {
    log(consentDetail);
    if (flags.yes && !flags.github) {
      log(
        'Skipping the GitHub chapter. Re-run with --github to create the App and repository ' +
          '(add --yes too for a fully unattended run).',
      );
      consented = false;
      return;
    }
    if (flags.yes && flags.github) {
      consented = true;
      return;
    }
    const answer = await confirm({ message: 'Create the GitHub App and repository now?' });
    if (isCancel(answer)) exitOnCancel();
    consented = answer;
  });
  if (!dryRun && !consented) {
    return 'declined';
  }

  await runStep(
    frame,
    'Choose the GitHub account and names',
    `Uses ${ctx.ownerType === 'org' ? 'an organization' : 'your personal account'}, App name ` +
      `${ctx.appName}, repository name ${ctx.repoName}.`,
    async () => {
      if (flags.org === undefined) {
        if (flags.yes) {
          ctx.ownerType = 'user';
        } else {
          const answer = await select({
            message: 'Where should the GitHub App and repository live?',
            options: [
              { value: 'user', label: 'My personal account' },
              { value: 'org', label: 'An organization' },
            ],
          });
          if (isCancel(answer)) exitOnCancel();
          ctx.ownerType = answer;
        }
      }

      if (ctx.ownerType === 'org') {
        ctx.org = await resolveOrgLogin({ flags, log });
      }

      ctx.repoName = await resolveField(flags.repoName, flags.yes, ctx.repoName, () =>
        text({ message: 'Repository name', placeholder: ctx.repoName, defaultValue: ctx.repoName }));
      ctx.appName = await resolveField(flags.appName, flags.yes, ctx.appName, () =>
        text({ message: 'GitHub App name', placeholder: ctx.appName, defaultValue: ctx.appName }));
    },
  );

  let parked = false;
  let loopback = null;
  try {
    if (!dryRun) {
      loopback = await startLoopback();
    }

    await runStep(
      frame,
      'Create your GitHub App',
      `Opens GitHub's "Create GitHub App" page for ${ctx.appName} and waits for it to be created.`,
      async () => {
        const credentials = await runManifestFlow({
          appName: ctx.appName,
          siteName,
          ownerType: ctx.ownerType,
          org: ctx.org,
          openBrowser,
          log,
          dir,
          loopback,
          timeoutMs: manifestTimeoutMs,
        });
        ctx.credentials = credentials;
        await updateSite(siteId, {
          step: 'app-created',
          github: { ...credentials, ownerType: ctx.ownerType },
        });
      },
    );

    await runStep(
      frame,
      'Install the App and sign in',
      `Opens the install page for ${ctx.appName} and signs you in.`,
      async () => {
        try {
          const result = await installAndAuthorize({
            appId: ctx.credentials.appId,
            appSlug: ctx.credentials.appSlug,
            appName: ctx.appName,
            clientId: ctx.credentials.clientId,
            clientSecret: ctx.credentials.clientSecret,
            pem: ctx.credentials.pem,
            owner: ctx.credentials.owner,
            ownerType: ctx.ownerType,
            dir,
            openBrowser,
            log,
            loopback,
            pollIntervalMs: installPollIntervalMs,
            maxWaitMs: installMaxWaitMs,
          });
          ctx.userToken = result.userToken;
          ctx.installationId = result.installationId;
          await updateSite(siteId, { step: 'installed', github: { installationId: result.installationId } });
        } catch (err) {
          if (err.catalogue?.code === 'org-approval-pending') {
            await updateSite(siteId, { step: 'awaiting-org-approval' });
            log(err.message);
            parked = true;
            return;
          }
          throw err;
        }
      },
    );
  } finally {
    if (loopback) await loopback.close();
  }
  if (!dryRun && parked) {
    return 'parked';
  }

  await runStep(
    frame,
    `Create the private repository ${ctx.repoName}`,
    `Creates ${ctx.repoName} under ${ctx.ownerType === 'org' ? ctx.org : 'your account'} and ` +
      'confirms the App can commit to it.',
    async () => {
      const { status: userStatus, json: userJson } = await githubRequest('GET', '/user', { token: ctx.userToken });
      if (userStatus !== 200) {
        throw new Error(
          `github: GET /user returned ${userStatus} while creating the repository.\n` +
            `Next step: re-run npx create-cairn-site --dir ${dir}.`,
        );
      }
      log(`Signed in as ${userJson.login}`);

      if (ctx.ownerType === 'org') {
        const { status: memberStatus } = await githubRequest(
          'GET',
          `/orgs/${ctx.org}/memberships/${userJson.login}`,
          { token: ctx.userToken },
        );
        if (memberStatus !== 200) {
          throw new Error(
            `github: could not confirm your membership in ${ctx.org} (status ${memberStatus}).\n` +
              `Next step: confirm you are a member of ${ctx.org}, then re-run npx create-cairn-site ` +
              `--dir ${dir}.`,
          );
        }
      }

      const created = await createRepo(ctx.userToken, {
        name: ctx.repoName,
        ownerType: ctx.ownerType,
        org: ctx.org,
        dir,
        appName: ctx.appName,
      });
      await verifyInstallationCovers(ctx.userToken, {
        installationId: ctx.installationId,
        owner: created.owner,
        repo: created.repo,
        dir,
      });
      ctx.repo = created;
      await updateSite(siteId, { step: 'repo-created', github: { repo: created } });
    },
  );

  await runStep(
    frame,
    'Push your site to GitHub',
    `Pushes ${dir} into ${ctx.repoName}.`,
    async () => {
      await pushScaffold(ctx.userToken, { owner: ctx.repo.owner, repo: ctx.repo.repo, dir, log });
      await updateSite(siteId, { step: 'pushed' });
    },
  );

  return dryRun ? 'declined' : 'pushed';
}
