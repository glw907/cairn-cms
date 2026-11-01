// Setup for S09-component-with-island: a post already uses a `countdown` directive that no
// component declares yet, so it prints as literal text. The committed manifest is regenerated so
// the new post does not leave the build stale.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POST = `---
title: Trail day is coming
date: 2026-07-20
description: A placeholder post that uses the countdown block.
---
Registration for the annual trail day closes soon.

:::countdown{label="Trail day" date="2026-09-19"}
:::

Bring gloves and a lunch.
`;

/** @param {string} root */
export default function setup(root) {
  writeFileSync(join(root, 'src/content/posts/2026-07-20-trail-day.md'), POST);
  execFileSync('npx', ['--no-install', 'cairn-manifest'], { cwd: root, stdio: 'pipe' });
}
