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
import { loadSite } from './src/state.mjs';
import { webBase } from './src/github/api.mjs';

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

  try {
    const answers = await collectAnswers(flags);
    const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'template');
    const log = (line) => console.log(line);
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
  } catch (err) {
    console.error(err.message);
    console.error('Next step: fix the problem above and run the command again.');
    process.exit(1);
  }
}

await main();
