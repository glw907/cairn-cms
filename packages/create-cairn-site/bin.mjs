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
import { seedOwnerAndToken } from './src/cloudflare/bootstrap.mjs';
import { loadSite, findSiteByDir, retireSite } from './src/state.mjs';
import { webBase } from './src/github/api.mjs';
import { openBrowser } from './src/github/open.mjs';

/** Every step a resumed run can still finish the GitHub chapter from. */
const GITHUB_RESUMABLE_STEPS = ['scaffolded', 'app-created', 'awaiting-org-approval', 'installed', 'repo-created'];

/** Every step a resumed run can still finish the Cloudflare chapter from, with no GitHub work
 * left to redo. */
const CLOUDFLARE_RESUMABLE_STEPS = ['pushed', 'deployed'];

/** Every step a resumed run can still finish from. `live` is handled separately (the whole
 * chapter is already done); anything else is not a record this tool ever wrote. */
const RESUMABLE_STEPS = [...GITHUB_RESUMABLE_STEPS, ...CLOUDFLARE_RESUMABLE_STEPS];

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
  const repoUrl = `${webBase()}/${state.github.repo.owner}/${state.github.repo.repo}`;
  const appUrl = `${webBase()}/apps/${state.github.appSlug}`;
  const lines = ['', `Your site is live on GitHub: ${repoUrl}`, `The App that publishes for you: ${appUrl}`];

  if (state.cloudflare?.url) {
    lines.push(
      '',
      `Your site is live at: ${state.cloudflare.url}`,
      `Sign in at: ${state.cloudflare.url}/admin`,
      '',
      'What exists now: one Worker, two databases, one storage bucket, and the GitHub App\'s ' +
        'private key, stored as a Worker secret.',
      '',
      'Your domain and email arrive with the next chapter.',
    );
  } else {
    lines.push('', 'Deploying it to the internet arrives with the next chapter.');
  }

  lines.push('', 'Run `npx cairn-doctor` any time to check what is set up and what is still missing.');
  console.log(lines.join('\n'));
}

/**
 * Reseed the owner's bootstrap sign-in token and reopen the confirm page, without touching the
 * deploy: the `--sign-in` recovery for a token that already expired on an already-live site.
 * @param {{ dir: string, ownerEmail?: string, cloudflare?: { url?: string } }} state the site's
 *  current state record, already at step `live`
 * @param {(line: string) => void} log receives one printed line per call
 * @returns {Promise<void>}
 */
async function reseedAndOpen(state, log) {
  const { confirmPath } = await seedOwnerAndToken({ dir: state.dir, email: state.ownerEmail, log });
  await openBrowser(`${state.cloudflare.url}${confirmPath}`, log);
  console.log(
    'A sign-in page just opened; click Sign in there. The link works for ten minutes; if it ' +
      'expires, re-run with --sign-in for a fresh one.',
  );
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

    if (priorRecord && flags.startOver) {
      await retireSite(priorRecord.id);
      console.log(`Setting aside the previous record for ${priorRecord.data.name} and starting over.`);
      priorRecord = null;
    }

    if (priorRecord && priorRecord.data.step === 'live') {
      console.log(`${priorRecord.data.name} is already live.`);
      if (flags.signIn) {
        await reseedAndOpen(priorRecord.data, log);
      }
      await printLiveInfo(priorRecord.id);
      return;
    }

    if (priorRecord && RESUMABLE_STEPS.includes(priorRecord.data.step)) {
      const overridable = [
        ['org', '--org'],
        ['repoName', '--repo-name'],
        ['appName', '--app-name'],
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
        const cloudflareOutcome = await runCloudflareChapter({
          siteId: priorRecord.id,
          siteName: priorRecord.data.name,
          dir: priorRecord.data.dir,
          flags,
          log,
          dryRun: flags.dryRun,
        });
        if (cloudflareOutcome === 'live') {
          console.log('This site is set up end to end.');
          await printLiveInfo(priorRecord.id);
        }
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

    if (flags.dryRun) {
      // runGithubChapter always reports 'declined' under --dry-run, since nothing is ever
      // actually created; the Cloudflare chapter's own dry run runs unconditionally here, which
      // is the only way the whole chapter's actions all print in one dry run.
      await runCloudflareChapter({
        siteId,
        siteName: answers.name,
        dir: answers.dir,
        flags,
        log,
        dryRun: true,
      });
    } else if (githubOutcome === 'pushed') {
      const cloudflareOutcome = await runCloudflareChapter({
        siteId,
        siteName: answers.name,
        dir: answers.dir,
        flags,
        log,
        dryRun: false,
      });
      if (cloudflareOutcome === 'live') {
        console.log('This site is set up end to end.');
        await printLiveInfo(siteId);
      }
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
