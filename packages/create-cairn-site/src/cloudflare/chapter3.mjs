// Chapter 3's spine: the guided path from chapter 2's finish (or, later, a resumed `--connect`
// entry from any allowlisted state) to a repository connected to Workers Builds, with a trigger
// bound to the site's own Worker. This file carries admission, the token, connect, and trigger;
// the reconcile commit, the build watch, and the completion hop are a later task's own extension
// of the same module. Modelled directly on chapter2.mjs: the same runStep/runActions idiom
// (a title always prints, a detail prints only under --dry-run, execute never runs under
// --dry-run), one state writer, pure step logic over an in-memory record.
//
// TOKEN LIFECYCLE: chapter 2 already deletes its own saved `cloudflare.apiToken` at its own
// terminal steps (email-live, paid-plan-declined), so this chapter always starts with none saved
// and always asks for a fresh one, per the design's "one fresh token paste" framing. Once this
// chapter's own token hop saves one, its presence is what lets a re-run (after a park) skip
// re-asking admission: `record.cloudflare.apiToken` can only be set by THIS chapter, since chapter
// 2 has already cleared its own copy by the time chapter 3 ever runs, so seeing one saved is an
// unambiguous "admission and the token hop already ran" signal that survives a connect or trigger
// park (neither of which advances `step`, so `step` alone cannot carry this signal the way it
// carries "connect and trigger both finished", CHAPTER3_RESUMABLE_STEPS below). The token is
// deleted only at a terminal step (builds-live, once the later task implements it, or
// builds-connect-declined here); a park keeps it, since a later re-run needs the same credential.
// Early clearing on token-scope-missing/token-invalid mirrors chapter2's own try/catch exactly.
import { confirm as clackConfirm, select as clackSelect, isCancel } from '@clack/prompts';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { exitOnCancel, promptSecret } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { updateSite } from '../state.mjs';
import { ensureAccountId } from './account.mjs';
import { ensureApiToken, CHAPTER3_PERMISSION_KEYS } from './prefill.mjs';
import { makeApi } from './api.mjs';
import { cloudflareError } from './catalogue.mjs';
import { deleteApiToken } from './chapter2.mjs';
import { githubRequest } from '../github/api.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';

/**
 * The step names this chapter's own success terminal and its declined terminal write, exported
 * for a later task's `bin.mjs` routing (aliased on import there, since it already imports chapter
 * 2's own `TERMINAL_STEPS`). `builds-live` is a later task's own deliverable; the name is
 * reserved here so both tasks agree on it.
 * @type {string[]}
 */
export const CHAPTER3_TERMINAL_STEPS = ['builds-live', 'builds-connect-declined'];

/**
 * The step names a resumed record can still finish this chapter from, past this task's own
 * connect-and-trigger hop: `builds-connected` (this task's own finish line) and
 * `config-reconciled` (a later task's). Exported for the same `bin.mjs` routing `bin.mjs`
 * consumes CHAPTER3_TERMINAL_STEPS from. Membership in this list, checked here by plain
 * inclusion rather than a numeric index, is also what this module's own internal resumption
 * (skipping connect and trigger on a record that already reached one of these) is built on: an
 * index-based check like chapter2's own `stepIndex` defaults any unrecognized string to "as if
 * already past `live`", which would wrongly admit a record still mid-chapter-1 (for example
 * `scaffolded` or `deployed`); a plain membership test against this chapter's own explicit step
 * names carries no such default.
 * @type {string[]}
 */
export const CHAPTER3_RESUMABLE_STEPS = ['builds-connected', 'config-reconciled'];

/** The trigger name every created trigger carries, matching the shape the spike captured live. */
const BUILDS_TRIGGER_NAME = 'Deploy default branch';

/** The build command every created trigger carries: the scaffold's own `npm run build` script. */
const BUILD_COMMAND = 'npm run build';

/** The deploy command every created trigger carries: wrangler's own default deploy invocation. */
const DEPLOY_COMMAND = 'npx wrangler deploy';

/** The name registered against the admin's pasted token when it becomes the build token. */
const BUILD_TOKEN_NAME = 'cairn create-cairn-site build token';

/** Matches the top-level `"name": "..."` line in a scaffold's wrangler.jsonc. */
const WORKER_NAME_PATTERN = /"name":\s*"([^"]+)"/;

/**
 * Read the Worker's name straight from the local wrangler.jsonc, rather than trusting a saved
 * `cloudflare.workerName` field: an admin who renamed the Worker by hand between deploys has
 * already moved the name Cloudflare actually deployed under, and this chapter's own trigger needs
 * to bind the tag that name resolves to right now, not whatever chapter 1 last wrote to state.
 * @param {string} dir the scaffold root
 * @returns {Promise<string>} the worker name
 */
async function readWorkerName(dir) {
  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  const match = WORKER_NAME_PATTERN.exec(content);
  if (!match) {
    throw new Error(
      `chapter3: expected to find a "name" entry in wrangler.jsonc under ${dir}, but it is missing`,
    );
  }
  return match[1];
}

/**
 * Run one hop as a single-action batch through runActions, mirroring chapter2.mjs's own
 * `runStep`: the hop's title always prints, its detail prints only under --dry-run, and `execute`
 * never runs under --dry-run.
 * @param {{ dryRun: boolean, log: (line: string) => void }} frame the run's dry-run frame and logger
 * @param {string} title the hop's title, always printed
 * @param {string} detail the hop's detail, printed only under --dry-run
 * @param {() => Promise<void>} execute the hop's real work; skipped under --dry-run
 * @returns {Promise<void>}
 */
async function runStep(frame, title, detail, execute) {
  await runActions([defineAction({ title, detail, execute })], frame);
}

/**
 * The admission copy: what this chapter needs (the App authorization, a fresh token paste, one
 * later sign-in click) and what it costs (nothing new). The free-tier figures carry the date they
 * were verified, per the standing cost-copy rule every other admission in this tool follows.
 */
const ADMISSION_DETAIL =
  "Connects this repository to Cloudflare Workers Builds, so every commit to your default " +
  'branch deploys itself, no laptop required. This needs three things: a one-time authorization ' +
  'of Cloudflare\'s "Workers and Pages" GitHub App on your account (if you have not already done ' +
  'this), a fresh Cloudflare API token pasted the same way chapter 2 asked for one, and one ' +
  'sign-in click later in this chapter, when it commits its own config changes back to your ' +
  'repository. This costs nothing: Workers Builds\' free tier includes 3,000 build minutes a ' +
  'month and one build running at a time, as of 2026-08-12 ' +
  '(https://developers.cloudflare.com/workers/platform/pricing/). Your site keeps working ' +
  'exactly as it does now the whole time.';

/**
 * @typedef {object} RunChapter3Input
 * @property {string} siteId the site's state-store id; the only id this module ever writes under
 * @property {object | null} record the site's current in-memory state record, already loaded by
 *  the caller; `null` under --dry-run, chapter 1 and chapter 2's own `dryRun ? null` precedent
 * @property {string} dir the scaffolded directory, used in printed copy and read for the local
 *  Worker name
 * @property {{ yes: boolean }} args the parsed CLI flags this chapter reads: `yes` for an
 *  unattended run
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every hop's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to the create-token page; defaults to open.mjs's own opener
 * @property {typeof clackConfirm} [confirm] the yes/no prompt; a test seam, defaulting to
 *  @clack/prompts' own
 * @property {typeof clackSelect} [select] the account picker prompt `ensureAccountId` uses; the
 *  same kind of test seam as `confirm`
 * @property {(message: string) => Promise<string>} [promptSecretFn] the token paste prompt,
 *  forwarded to `ensureApiToken`; a test seam defaulting to prompts.mjs's own `promptSecret`
 * @property {typeof makeApi} [makeApiFn] builds the Cloudflare API client; a test seam defaulting
 *  to api.mjs's own `makeApi`
 * @property {Record<string, string | undefined>} [env] the environment `ensureApiToken` reads
 *  `CAIRN_CF_API_TOKEN` from under `yes`; defaults to `process.env`, injected in tests
 * @property {string[]} [argv] the argument vector `ensureApiToken` scans for a mistakenly-passed
 *  token; defaults to `process.argv.slice(2)`, injected in tests
 */

/**
 * Run chapter 3's spine: admission, the Cloudflare token, connecting the repository to Workers
 * Builds, and binding a trigger to the site's own Worker. Re-entry reads the step already reached
 * on `record`: `builds-connect-declined` short-circuits at the top (the token is cleared again,
 * in case an earlier run somehow left one behind, and the decline is reported back unchanged); a
 * saved `cloudflare.apiToken` or a step already in CHAPTER3_RESUMABLE_STEPS means admission has
 * already run and is not re-asked; a step already in CHAPTER3_RESUMABLE_STEPS additionally skips
 * connect and trigger, both of which are otherwise safe to repeat (the connections PUT is a proven
 * upsert, and trigger creation always lists first and adopts a match).
 *
 * A connect-time authorization refusal (the App not authorized, or authorized but this repository
 * not selected) is a wait-class park: it is returned, never thrown, and `step` is left untouched,
 * so a plain re-run re-attempts connect from the same point once the admin has fixed it on
 * Cloudflare's side. Only an unexpected failure (a missing repository, a missing Worker) throws.
 * @param {RunChapter3Input} input the chapter's inputs
 * @returns {Promise<{ outcome: string, message?: string }>} the outcome reached:
 *  `'builds-connect-declined'` | `'builds-app-not-authorized'` | `'builds-repo-not-selected'` |
 *  `'builds-connected'` | `'dry-run'`. A park also carries the row's own printed `message`.
 */
export async function runChapter3({
  siteId,
  record,
  dir,
  args,
  log,
  dryRun,
  openBrowser = defaultOpenBrowser,
  confirm = clackConfirm,
  select = clackSelect,
  promptSecretFn = promptSecret,
  makeApiFn = makeApi,
  env = process.env,
  argv = process.argv.slice(2),
}) {
  const frame = { dryRun, log };

  if (!dryRun && record?.step === 'builds-connect-declined') {
    await deleteApiToken(siteId);
    return { outcome: 'builds-connect-declined' };
  }

  let accountId = record?.cloudflare?.accountId;
  let token = record?.cloudflare?.apiToken;
  let connectionUuid = record?.cloudflare?.buildsConnectionUuid;
  let triggerUuid = record?.cloudflare?.buildsTriggerUuid;

  const chapter3Reached = CHAPTER3_RESUMABLE_STEPS.includes(record?.step);
  const alreadyAdmitted = Boolean(record?.cloudflare?.apiToken) || chapter3Reached;

  // --- Admission: only asked once, per the module doc's token-presence signal above.
  if (!alreadyAdmitted) {
    let consented = false;
    await runStep(frame, 'Connect to Workers Builds', ADMISSION_DETAIL, async () => {
      log(ADMISSION_DETAIL);
      if (args.yes) {
        consented = true;
        return;
      }
      const answer = await confirm({ message: 'Connect this repository to Workers Builds now? (Free.)' });
      if (isCancel(answer)) exitOnCancel();
      consented = Boolean(answer);
    });
    if (!dryRun && !consented) {
      const declineErr = cloudflareError('builds-connect-declined', { dir });
      log(declineErr.message);
      await updateSite(siteId, { step: 'builds-connect-declined' });
      await deleteApiToken(siteId);
      return { outcome: 'builds-connect-declined', message: declineErr.message };
    }
  }

  // --- Account selection: cheap and silent when an earlier chapter already saved an id.
  await runStep(
    frame,
    'Find your Cloudflare account',
    'Confirms the Cloudflare account your site already deployed to.',
    async () => {
      const result = await ensureAccountId({ record, dir, yes: args.yes, prompt: select, log });
      accountId = result.accountId;
      if (result.learned && !dryRun) {
        await updateSite(siteId, { cloudflare: { accountId } });
      }
    },
  );

  // Wrapped in one try/catch from the token hop onward (mirroring chapter2.mjs's own T4b.1
  // half): a token-scope-missing or token-invalid failure anywhere below clears the saved token
  // before the error surfaces, so the re-run the row already tells the admin to do actually
  // re-collects one instead of silently reusing the bad one.
  try {
    await runStep(
      frame,
      'Get a fresh Cloudflare API token',
      "Opens Cloudflare's create-token page with the permissions this chapter needs already " +
        'filled in (the same five chapter 2 already asked for, plus the Workers Builds ones), ' +
        'and asks you to paste the token back.',
      async () => {
        token = await ensureApiToken({
          record,
          log,
          openBrowser,
          yes: args.yes,
          promptSecretFn,
          env,
          argv,
          permissionKeys: CHAPTER3_PERMISSION_KEYS,
        });
        if (!dryRun && token !== record?.cloudflare?.apiToken) {
          await updateSite(siteId, { cloudflare: { apiToken: token } });
        }
      },
    );

    const api = makeApiFn({ token, accountId, dir });

    if (!chapter3Reached) {
      // --- Connect: the repository's numeric id and its owner's numeric id both come from one
      // GET, then the connections PUT (a proven upsert, per the spike).
      const { owner, repo, defaultBranch } = record?.github?.repo ?? {};
      let parkError;

      await runStep(
        frame,
        'Connect your repository to Workers Builds',
        "Reads your repository's numeric ids from GitHub, then connects it to Workers Builds.",
        async () => {
          const { status, json } = await githubRequest('GET', `/repos/${owner}/${repo}`);
          if (status !== 200) {
            throw new Error(
              `chapter3: could not read ${owner}/${repo} from GitHub (status ${status}), so ` +
                'Workers Builds has nothing to connect to.\n' +
                `Next: verify the repository still exists, then re-run npx create-cairn-site ` +
                `--dir ${dir} --connect.`,
            );
          }
          try {
            const result = await api.putBuildConnection({
              providerAccountId: String(json.owner.id),
              providerAccountName: json.owner.login,
              repoId: String(json.id),
              repoName: json.name,
            });
            connectionUuid = result.repo_connection_uuid;
          } catch (err) {
            const code = err?.catalogue?.code;
            if (code === 'builds-app-not-authorized' || code === 'builds-repo-not-selected') {
              parkError = err;
              log(err.message);
              return;
            }
            throw err;
          }
        },
      );
      if (!dryRun && parkError) {
        return { outcome: parkError.catalogue.code, message: parkError.message };
      }
      if (!dryRun) {
        await updateSite(siteId, { cloudflare: { buildsConnectionUuid: connectionUuid } });
      }

      // --- Trigger: bind the existing Worker, read before write throughout (the tag lookup, the
      // triggers list, and the build-tokens list all read before this ever writes).
      await runStep(
        frame,
        'Create your Workers Builds trigger',
        'Binds your Worker to the connected repository, so every push to its default branch ' +
          'builds and deploys automatically.',
        async () => {
          const workerName = await readWorkerName(dir);
          const tag = await api.findWorkerTag(workerName);
          if (!tag) {
            throw new Error(
              `chapter3: no Cloudflare Worker named "${workerName}" was found on this account, ` +
                'so Workers Builds has nothing to bind to.\n' +
                `Next: run npx create-cairn-site --dir ${dir} to finish deploying first, then ` +
                `re-run npx create-cairn-site --dir ${dir} --connect.`,
            );
          }

          const triggers = await api.listBuildTriggers(tag);
          const existing = triggers.find(
            (candidate) => candidate.repo_connection?.repo_connection_uuid === connectionUuid,
          );
          if (existing) {
            triggerUuid = existing.trigger_uuid;
            return;
          }

          const verified = await api.verifyToken();
          const existingTokens = await api.getBuildTokens();
          let buildTokenUuid = existingTokens.find(
            (candidate) => candidate.cloudflare_token_id === verified.id,
          )?.build_token_uuid;
          if (!buildTokenUuid) {
            const createdToken = await api.createBuildToken({
              name: BUILD_TOKEN_NAME,
              secret: token,
              cloudflareTokenId: verified.id,
            });
            buildTokenUuid = createdToken.build_token_uuid;
          }

          const createdTrigger = await api.createBuildTrigger({
            workerTag: tag,
            repoConnectionUuid: connectionUuid,
            buildTokenUuid,
            triggerName: BUILDS_TRIGGER_NAME,
            branchIncludes: [defaultBranch],
            buildCommand: BUILD_COMMAND,
            deployCommand: DEPLOY_COMMAND,
          });
          triggerUuid = createdTrigger.trigger_uuid;
        },
      );
      if (!dryRun) {
        await updateSite(siteId, { step: 'builds-connected', cloudflare: { buildsTriggerUuid: triggerUuid } });
      }
    }
  } catch (error) {
    const code = error?.cause?.catalogue?.code;
    if (!dryRun && (code === 'token-scope-missing' || code === 'token-invalid')) {
      await deleteApiToken(siteId);
    }
    throw error;
  }

  if (dryRun) {
    return { outcome: 'dry-run' };
  }
  return { outcome: 'builds-connected' };
}
