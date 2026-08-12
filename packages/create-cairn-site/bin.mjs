#!/usr/bin/env node
// The create-cairn-site CLI entry: parse args, pre-flight the machine, collect the site's
// identity, scaffold it (honoring --dry-run), run the GitHub chapter, and print the hand-over
// block. Every branch below prints a next step before it stops, including the failure ones, per
// the plan's global constraint against a bare stack-trace termination.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from './src/args.mjs';
import { runPreflight } from './src/preflight.mjs';
import { collectAnswers } from './src/prompts.mjs';
import { scaffold, handoverText, dryRunNotice } from './src/scaffold.mjs';
import { runGithubChapter } from './src/github/chapter.mjs';
import { runCloudflareChapter } from './src/cloudflare/chapter.mjs';
import { runChapter2, TERMINAL_STEPS } from './src/cloudflare/chapter2.mjs';
import { seedOwnerAndToken, SIGN_IN_OPENED_NOTICE } from './src/cloudflare/bootstrap.mjs';
import { printCostPreamble } from './src/money.mjs';
import { loadSite, updateSite, findSiteByDir, retireSite } from './src/state.mjs';
import { webBase } from './src/github/api.mjs';
import { openBrowser } from './src/github/open.mjs';

/** Every step a resumed run can still finish the GitHub chapter from. */
const GITHUB_RESUMABLE_STEPS = ['scaffolded', 'app-created', 'awaiting-org-approval', 'installed', 'repo-created'];

/**
 * Every step a resumed run can still finish the Cloudflare chapter from, with no GitHub work left
 * to redo.
 */
const CLOUDFLARE_RESUMABLE_STEPS = ['pushed', 'deployed'];

/**
 * Every step a resumed run can still finish chapter 2 from, entering it directly and skipping
 * both `runGithubChapter` and chapter 1's `runCloudflareChapter` entirely: there is no GitHub or
 * chapter-1 work left to redo, and re-entering either would try to rebuild a context this branch
 * never reconstructs. `domain-live` and `email-onboarded` belong here too, since T4b: neither is
 * a stopping point for chapter 2 anymore (the email half continues from either), so a resumed
 * record at one is routed through runChapter2 exactly like any other in-progress chapter-2 step.
 * Chapter 2's real terminal steps, `TERMINAL_STEPS`, are handled separately below.
 */
const CHAPTER2_RESUMABLE_STEPS = ['zone-created', 'records-carried', 'delegated', 'domain-live', 'email-onboarded'];

/** Every step a resumed run can still finish from. `live` and chapter 2's `TERMINAL_STEPS`
 * (`email-live`, a recorded decline) are each handled separately; anything else is not a record
 * this tool ever wrote. */
const RESUMABLE_STEPS = [...GITHUB_RESUMABLE_STEPS, ...CLOUDFLARE_RESUMABLE_STEPS];

/**
 * Build the lines every closing block ends on, whichever hop of the chapter reached it: the
 * finished site's GitHub repository and App links, and the `npx cairn-doctor` reminder. Shared by
 * `printLiveInfo`, `printEmailLiveInfo`, `printDeclinedInfo`, and `continueIntoChapter2`'s own
 * terminal completion print, so none of them can drift into printing a different version of the
 * same information.
 * @param {{ github: { repo: { owner: string, repo: string }, appSlug: string } }} state the
 *  site's saved state record, already carrying its GitHub fields
 * @returns {{ repoLines: string[], doctorLine: string }} `repoLines` leads a block with the repo
 *  and App links; `doctorLine` closes one with the doctor reminder
 */
function closingInfoLines(state) {
  const repoUrl = `${webBase()}/${state.github.repo.owner}/${state.github.repo.repo}`;
  const appUrl = `${webBase()}/apps/${state.github.appSlug}`;
  return {
    repoLines: [`Your site is live on GitHub: ${repoUrl}`, `The App that publishes for you: ${appUrl}`],
    doctorLine: 'Run `npx cairn-doctor` any time to check what is set up and what is still missing.',
  };
}

/**
 * Print the block that names the finished site's GitHub repository and App, and, once the
 * Cloudflare chapter has reached its own hops, the live URL and what exists on Cloudflare. Shared
 * by the fresh-run and resumed-run paths so every form of "the chapter is done" ends on identical
 * copy.
 * @param {string} siteId the site's state-store id, already at step `pushed` or later
 * @returns {Promise<void>}
 */
async function printLiveInfo(siteId) {
  const state = await loadSite(siteId);
  const { repoLines, doctorLine } = closingInfoLines(state);
  const lines = ['', ...repoLines];

  if (state.cloudflare?.url) {
    lines.push(
      '',
      `Your site is live at: ${state.cloudflare.url}`,
      `Sign in at: ${state.cloudflare.url}/admin`,
      '',
      "What exists now: one Worker, two databases, one storage bucket, and the GitHub App's " +
        'private key, stored as a Worker secret.',
      '',
      `Connect your own domain any time by re-running npx create-cairn-site --dir ${state.dir}. ` +
        'Turn on email sign-in the same way, by adding --domain <name> and --email to that command.',
    );
  } else {
    lines.push('', 'Deploying it to the internet arrives with the next chapter.');
  }

  lines.push('', doctorLine);
  console.log(lines.join('\n'));
}

/**
 * Build the three lines every closing block prints once a site has its own domain connected: the
 * live URL, the admin sign-in URL, and the note that its workers.dev address still works. Shared
 * by `printEmailLiveInfo` and `printDeclinedInfo`, both of which describe a site whose domain half
 * finished, so the two can never drift on how they name that domain.
 * @param {{ cloudflare: { domain: string, url: string } }} state the site's saved state record,
 *  already at `domain-live` or later
 * @returns {string[]}
 */
function domainLiveLines(state) {
  const domain = state.cloudflare.domain;
  return [
    `Your site is live at your own domain: https://${domain}`,
    `Sign in at: https://${domain}/admin`,
    `Your workers.dev address (${state.cloudflare.url}) keeps working too.`,
  ];
}

/**
 * Print the closing block for a site already at `email-live`: its own domain, admin sign-in URL,
 * and workers.dev note, plus the address it sends its own sign-in email from, and the shared
 * repo/App lines and `npx cairn-doctor` line every closing block ends with. `email-live` is
 * chapter 2's real finish line (`TERMINAL_STEPS`), so this returns without ever calling
 * `runChapter2` again.
 * @param {string} siteId the site's state-store id, already at step `email-live`
 * @returns {Promise<void>}
 */
async function printEmailLiveInfo(siteId) {
  const state = await loadSite(siteId);
  const { repoLines, doctorLine } = closingInfoLines(state);
  const lines = [
    '',
    ...repoLines,
    '',
    ...domainLiveLines(state),
    '',
    `Your sign-in sender address is ${state.cloudflare.emailFrom}. Cloudflare accepted a test ` +
      'message from it during setup; the doctor line below can check that again.',
    '',
    doctorLine,
  ];
  console.log(lines.join('\n'));
}

/**
 * Print the closing block for a site whose owner declined the paid plan (`paid-plan-declined`,
 * the other member of `TERMINAL_STEPS`): its own domain, admin sign-in URL, and workers.dev note,
 * same as a site at `email-live`, but naming that email sign-in is off rather than claiming it
 * works, since a declined site has no email path at all. `--sign-in` is that owner's only way
 * back in, which this names alongside the shared repo/App lines and doctor line.
 * @param {string} siteId the site's state-store id, already at step `paid-plan-declined`
 * @returns {Promise<void>}
 */
async function printDeclinedInfo(siteId) {
  const state = await loadSite(siteId);
  const { repoLines, doctorLine } = closingInfoLines(state);
  const lines = [
    '',
    ...repoLines,
    '',
    ...domainLiveLines(state),
    '',
    'Email sign-in is off, so you are still the only one who can sign in: use --sign-in any time ' +
      'to open a fresh link.',
    '',
    doctorLine,
  ];
  console.log(lines.join('\n'));
}

/**
 * Run chapter 2 to whatever point the site's current saved state lets it reach, and print the
 * closing block. A run that reaches one of `TERMINAL_STEPS` (`email-live`, a fresh decline)
 * already saw chapter 2's own completion hop print the domain, the admin sign-in URL, and (for
 * `email-live`) the sending address, so this adds only what that hop did not already say, the
 * repo/App links and the doctor reminder, rather than repeating `printEmailLiveInfo` or
 * `printDeclinedInfo`'s whole block on top of it; a later resumed run at either of those steps
 * takes bin.mjs's own dedicated terminal branch instead, which never reaches this function at all
 * (its own dedicated blocks carry the domain and email lines this run's hop already printed).
 * Shared by the `live`-branch reopening and the fresh/resumed chapter-1-to-2 handoff in
 * `runCloudflareAndReport`, so the two paths cannot diverge on what "continuing into chapter 2"
 * means.
 * @param {{ siteId: string, dir: string, flags: object, log: (line: string) => void, dryRun: boolean }} args
 * @returns {Promise<{ outcome: string }>} chapter 2's own outcome
 */
async function continueIntoChapter2({ siteId, dir, flags, log, dryRun }) {
  const record = dryRun ? null : await loadSite(siteId);
  const outcome = await runChapter2({ siteId, record, dir, args: flags, log, dryRun });
  if (!dryRun) {
    if (TERMINAL_STEPS.includes(outcome.outcome)) {
      const { repoLines, doctorLine } = closingInfoLines(record);
      console.log(['', ...repoLines, '', doctorLine].join('\n'));
    } else {
      await printLiveInfo(siteId);
    }
  }
  return outcome;
}

/**
 * Reseed the owner's bootstrap sign-in token and reopen the confirm page, without touching the
 * deploy: the `--sign-in` recovery for a token that already expired on an already-live site.
 * `ownerEmailOverride` takes precedence over the saved `state.ownerEmail` and, when it differs,
 * is persisted back to the record so a later plain `--sign-in` reuses it. A record with neither
 * (hand-edited, or written by a version that never persisted the field) fails loud here rather
 * than reaching `seedOwnerAndToken`, whose own `.trim()` would otherwise raise a bare TypeError
 * that names no next step. The same guard covers a record with no saved `cloudflare.url`: without
 * it, the seed would already have written a live token to the database before a bare dereference
 * of `state.cloudflare.url` threw, leaving no way to reach the link it minted.
 * @param {{ siteId: string, state: { dir: string, ownerEmail?: string, cloudflare?: { url?: string } },
 *  ownerEmailOverride?: string, log: (line: string) => void }} args
 * @returns {Promise<void>}
 */
async function reseedAndOpen({ siteId, state, ownerEmailOverride, log }) {
  const ownerEmail = ownerEmailOverride?.trim() || state.ownerEmail;
  if (!ownerEmail) {
    throw new Error(
      'This site has no saved sign-in email, so --sign-in has nothing to send the link to.\n' +
        'Next step: re-run with --owner-email <you@example.com> to set one.',
    );
  }
  if (!state.cloudflare?.url) {
    throw new Error(
      'This site has no saved Cloudflare URL, so --sign-in has nowhere to open the sign-in link.\n' +
        `Next step: re-run npx create-cairn-site --dir ${state.dir} to finish deploying first.`,
    );
  }
  if (ownerEmail !== state.ownerEmail) {
    await updateSite(siteId, { ownerEmail });
  }
  const { confirmPath } = await seedOwnerAndToken({ dir: state.dir, email: ownerEmail, log });
  await openBrowser(`${state.cloudflare.url}${confirmPath}`, log, { secret: true });
  console.log(SIGN_IN_OPENED_NOTICE);
}

/**
 * Run the Cloudflare chapter for one site and, when it carries the site all the way to live,
 * continue straight into chapter 2 (the domain half) rather than stopping, so a first-time run
 * reaches the domain admission prompt without a second invocation. Shared by the fresh-run and
 * resumed-run paths so a change to what "chapter 1 finished" does can never land on one and miss
 * the other.
 *
 * A dry run always reports `'declined'` from chapter 1 (nothing is ever actually created), but
 * still continues into chapter 2's own dry run unconditionally, passing `record: null` (chapter
 * 1's own `dryRun ? null` precedent): that is the only way the whole chapter's hops, across both
 * halves, print in one dry run.
 * @param {{ siteId: string, siteName: string, dir: string, flags: object,
 *  log: (line: string) => void, dryRun: boolean }} args the chapter's inputs
 * @returns {Promise<void>}
 */
async function runCloudflareAndReport({ siteId, siteName, dir, flags, log, dryRun }) {
  const outcome = await runCloudflareChapter({ siteId, siteName, dir, flags, log, dryRun });
  if (!dryRun) {
    if (outcome !== 'live') return;
    console.log('This site is set up end to end.');
  }
  await continueIntoChapter2({ siteId, dir, flags, log, dryRun });
}

/**
 * Run the CLI end to end. Every success path returns rather than calling process.exit(0), which
 * can cut off a buffered stdout write when the output is piped; only a failure path exits
 * explicitly, and always after printing its next step.
 * @returns {Promise<void>}
 */
async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error('Next step: fix the flag above and run the command again.');
    process.exit(1);
  }

  if (flags.version) {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
    return;
  }

  const findings = await runPreflight();
  for (const finding of findings) {
    console.log(`[${finding.ok ? 'ok' : 'fail'}] ${finding.check}: ${finding.remedy}`);
  }
  const failure = findings.find((finding) => !finding.ok);
  if (failure) {
    console.error(`Next step: ${failure.remedy}`);
    process.exit(1);
  }

  const log = (line) => console.log(line);

  try {
    // Resume detection runs before collectAnswers, and only when --dir is already known: a
    // resuming admin who names the same directory again is never re-asked the site's name. An
    // interactive run with no --dir has no directory to look up yet, so it always takes the
    // fresh path below, same as before this task.
    let priorRecord = flags.dir !== undefined && !flags.dryRun ? await findSiteByDir(flags.dir) : null;

    // The cost preamble opens the whole tool: an owner learns the money picture before typing a
    // site name, not at the moment a bill arrives. isFreshRun rides the same lookup above rather
    // than a second one, so this can never disagree with the resume branches below about whether
    // this run has already seen this directory before.
    printCostPreamble({ log, isFreshRun: !priorRecord });

    if (
      priorRecord &&
      flags.startOver &&
      [...CHAPTER2_RESUMABLE_STEPS, ...TERMINAL_STEPS].includes(priorRecord.data.step)
    ) {
      // A record this far into chapter 2 has real Cloudflare resources connected to it: retiring
      // it here would leave a zone, its copied DNS records, and a Worker attached to the admin's
      // domain orphaned with no record pointing back at them. --start-over refuses instead of
      // silently discarding that state. TERMINAL_STEPS records carry the same resources (a
      // decline still has the connected domain; email-live also has its onboarded sending
      // domain), so they refuse for the same reason.
      throw new Error(
        `${priorRecord.data.name} already has Cloudflare resources connected for ` +
          `${priorRecord.data.cloudflare?.domain ?? 'its domain'}: a Cloudflare zone, the DNS ` +
          "records copied into it, and the deployed Worker attached to it. --start-over cannot " +
          'safely retire this record without also cleaning those up.\n' +
          `Next: re-run npx create-cairn-site --dir ${priorRecord.data.dir} without --start-over ` +
          'to continue connecting your domain, or remove those Cloudflare resources yourself ' +
          'first.',
      );
    }

    if (priorRecord && flags.startOver) {
      await retireSite(priorRecord.id);
      console.log(`Setting aside the previous record for ${priorRecord.data.name} and starting over.`);
      priorRecord = null;
    }

    if (priorRecord && TERMINAL_STEPS.includes(priorRecord.data.step)) {
      // --sign-in reseeds a bootstrap token and opens the confirm page directly, with no email
      // round trip, then stops. It is a declined owner's ONLY way back in, since declining means
      // there is no email path to send a link through, and it must not fall into chapter 2's
      // admission prompt: an admin recovering an expired sign-in has no attention to spare for it.
      if (flags.signIn) {
        await reseedAndOpen({
          siteId: priorRecord.id,
          state: priorRecord.data,
          ownerEmailOverride: flags.ownerEmail,
          log,
        });
        if (priorRecord.data.step === 'email-live') {
          await printEmailLiveInfo(priorRecord.id);
        } else {
          await printDeclinedInfo(priorRecord.id);
        }
        return;
      }

      // email-live is the chapter's real finish line: nothing left to do, so print and stop.
      if (priorRecord.data.step === 'email-live') {
        await printEmailLiveInfo(priorRecord.id);
        return;
      }

      // A recorded decline is terminal for the TOKEN (deleted) and for the EXIT CODE (0, because
      // nothing is wrong), and deliberately NOT terminal for re-entry. Both decline rows tell the
      // owner in as many words to re-run when they are ready, and chapter 2's admission re-offers
      // with its own `reoffered` copy. Returning here instead would make that promise unreachable
      // and, since --start-over refuses at this step too, would leave an owner who declined no way
      // to turn email on at all. This branch is what keeps the decline a choice rather than a trap.
      console.log(`Resuming ${priorRecord.data.name} after a declined paid plan.`);
      await continueIntoChapter2({
        siteId: priorRecord.id,
        dir: priorRecord.data.dir,
        flags,
        log,
        dryRun: flags.dryRun,
      });
      return;
    }

    if (priorRecord && priorRecord.data.step === 'live') {
      console.log(`${priorRecord.data.name} is already live.`);
      if (flags.signIn) {
        // --sign-in is a mid-browser recovery for an expired sign-in link; an admin in that
        // state has no attention to spare for chapter 2's own domain admission prompt, so this
        // reseeds, prints the same closing block every other already-live run ends on, and
        // stops rather than falling into continueIntoChapter2 below.
        await reseedAndOpen({
          siteId: priorRecord.id,
          state: priorRecord.data,
          ownerEmailOverride: flags.ownerEmail,
          log,
        });
        await printLiveInfo(priorRecord.id);
        return;
      }
      await continueIntoChapter2({
        siteId: priorRecord.id,
        dir: priorRecord.data.dir,
        flags,
        log,
        dryRun: flags.dryRun,
      });
      return;
    }

    if (priorRecord && CHAPTER2_RESUMABLE_STEPS.includes(priorRecord.data.step)) {
      console.log(`Resuming ${priorRecord.data.name} at ${priorRecord.data.step}.`);
      await continueIntoChapter2({
        siteId: priorRecord.id,
        dir: priorRecord.data.dir,
        flags,
        log,
        dryRun: flags.dryRun,
      });
      return;
    }

    if (priorRecord && RESUMABLE_STEPS.includes(priorRecord.data.step)) {
      const overridable = [
        ['org', '--org'],
        ['repoName', '--repo-name'],
        ['appName', '--app-name'],
        ['ownerEmail', '--owner-email'],
      ];
      const overridden = overridable.filter(([key]) => flags[key] !== undefined).map(([, flag]) => flag);
      const overrideNote =
        overridden.length > 0
          ? ` (using this run's ${overridden.join(', ')} instead of the saved answer)`
          : '';
      console.log(`Resuming ${priorRecord.data.name} at ${priorRecord.data.step}${overrideNote}.`);

      // A record already past the GitHub chapter (pushed or deployed) skips runGithubChapter
      // entirely: there is no GitHub work left to redo, and re-entering it would try to reuse an
      // App/repo context this branch never rebuilds.
      let pushed = CLOUDFLARE_RESUMABLE_STEPS.includes(priorRecord.data.step);
      if (!pushed) {
        const githubOutcome = await runGithubChapter({
          siteId: priorRecord.id,
          siteName: priorRecord.data.name,
          dir: priorRecord.data.dir,
          flags,
          log,
          dryRun: flags.dryRun,
        });
        pushed = githubOutcome === 'pushed';
      }

      if (pushed) {
        await runCloudflareAndReport({
          siteId: priorRecord.id,
          siteName: priorRecord.data.name,
          dir: priorRecord.data.dir,
          flags,
          log,
          dryRun: flags.dryRun,
        });
      }
      return;
    }

    const answers = await collectAnswers(flags);
    const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'template');
    const { siteId } = await scaffold({
      templateDir,
      answers,
      dir: answers.dir,
      dryRun: flags.dryRun,
      log,
    });
    console.log(
      flags.dryRun
        ? dryRunNotice({ dir: answers.dir })
        : handoverText({ dir: answers.dir }),
    );

    const githubOutcome = await runGithubChapter({
      siteId,
      siteName: answers.name,
      dir: answers.dir,
      flags,
      log,
      dryRun: flags.dryRun,
    });

    // runGithubChapter always reports 'declined' under --dry-run, since nothing is ever actually
    // created; the Cloudflare chapter's own dry run runs unconditionally, which is the only way
    // the whole chapter's actions all print in one dry run.
    if (flags.dryRun || githubOutcome === 'pushed') {
      await runCloudflareAndReport({
        siteId,
        siteName: answers.name,
        dir: answers.dir,
        flags,
        log,
        dryRun: flags.dryRun,
      });
    }
  } catch (err) {
    console.error(err.message);
    // A catalogue error's message already ends with its own "Next:" line, and every plain Error
    // this tool raises writes its own "Next step:" line too; printing the generic line on top of
    // either duplicates (and can contradict) the specific one. Only an error that names neither
    // gets this fallback.
    if (!err.catalogue && !err.message.includes('Next')) {
      console.error('Next step: fix the problem above and run the command again.');
    }
    process.exit(1);
  }
}

await main();
