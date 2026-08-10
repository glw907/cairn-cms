#!/usr/bin/env node
// The create-cairn-site CLI entry: parse args, pre-flight the machine, collect the site's
// identity, scaffold it (honoring --dry-run), and print the hand-over block. Every branch below
// prints a next step before it stops, including the failure ones, per the plan's global
// constraint against a bare stack-trace termination.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from './src/args.mjs';
import { runPreflight } from './src/preflight.mjs';
import { collectAnswers } from './src/prompts.mjs';
import { scaffold, handoverText, dryRunNotice } from './src/scaffold.mjs';

let flags;
try {
  flags = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  console.error('Next step: fix the flag above and run the command again.');
  process.exit(1);
}

// Every success path below falls off the end rather than calling process.exit(0), which can cut
// off a buffered stdout write when the output is piped. Only a failure path exits explicitly.
if (flags.version) {
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
} else {
  const findings = await runPreflight();
  for (const finding of findings) {
    console.log(`[${finding.ok ? 'ok' : 'fail'}] ${finding.check}: ${finding.remedy}`);
  }
  const failure = findings.find((finding) => !finding.ok);
  if (failure) {
    console.error(`Next step: ${failure.remedy}`);
    process.exit(1);
  } else {
    try {
      const answers = await collectAnswers(flags);
      const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'template');
      await scaffold({
        templateDir,
        answers,
        dir: answers.dir,
        dryRun: flags.dryRun,
        log: (line) => console.log(line),
      });
      console.log(
        flags.dryRun
          ? dryRunNotice({ dir: answers.dir })
          : handoverText({ dir: answers.dir, platform: process.platform }),
      );
    } catch (err) {
      console.error(err.message);
      console.error('Next step: fix the problem above and run the command again.');
      process.exit(1);
    }
  }
}
