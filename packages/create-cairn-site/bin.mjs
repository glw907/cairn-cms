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
import { loadSite, findSiteByDir, retireSite } from './src/state.mjs';
import { webBase } from './src/github/api.mjs';

/** Every step a resumed run can still finish the GitHub chapter from. `pushed` is handled
 * separately (the chapter is already done); anything else is not a record this tool ever wrote. */
const RESUMABLE_STEPS = ['scaffolded', 'app-created', 'awaiting-org-approval', 'installed', 'repo-created'];

/**
 * Print the block that names the finished site's GitHub repository and App once the chapter has
 * pushed, shared by the fresh-run and resumed-run paths so the two forms of "the chapter is done"
 * end on identical copy.
 * @param {string} siteId the site's state-store id, already at step `pushed`
 * @returns {Promise<void>}
 */
async function printLiveInfo(siteId) {
  const state = await loadSite(siteId);
  const repoUrl = `${webBase()}/${state.github.repo.owner}/${state.github.repo.repo}`;
  const appUrl = `${webBase()}/apps/${state.github.appSlug}`;
  console.log(
    [
      '',
      `Your site is live on GitHub: ${repoUrl}`,
      `The App that publishes for you: ${appUrl}`,
      '',
      'Deploying it to the internet arrives with the next chapter.',
      '',
      'Run `npx cairn-doctor` any time to check what is set up and what is still missing.',
    ].join('\n'),
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

    if (priorRecord && priorRecord.data.step === 'pushed') {
      console.log(`${priorRecord.data.name}'s GitHub chapter is already complete.`);
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

      const outcome = await runGithubChapter({
        siteId: priorRecord.id,
        siteName: priorRecord.data.name,
        dir: priorRecord.data.dir,
        flags,
        log,
        dryRun: flags.dryRun,
      });
      if (outcome === 'pushed') {
        await printLiveInfo(priorRecord.id);
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

    const outcome = await runGithubChapter({
      siteId,
      siteName: answers.name,
      dir: answers.dir,
      flags,
      log,
      dryRun: flags.dryRun,
    });
    if (outcome === 'pushed') {
      await printLiveInfo(siteId);
    }
  } catch (err) {
    console.error(err.message);
    console.error('Next step: fix the problem above and run the command again.');
    process.exit(1);
  }
}

await main();
