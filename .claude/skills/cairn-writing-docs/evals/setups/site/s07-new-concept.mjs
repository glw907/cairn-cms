// Setup for S07-new-concept: two event files already sit on disk, with no concept to read them.
// The session declares the concept, wires its content glob and manifest pattern, and regenerates
// the committed manifest.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EVENTS = {
  '2026-09-12-fall-work-party.md': `---
title: Fall work party
date: 2026-09-12
endDate: 2026-09-13
location: Ridge Road trailhead
capacity: 25
signupUrl: https://example.com/signup/fall-work-party
---
Bring gloves and a lunch. We clear drainage on the lower loop before the first snow.
`,
  '2026-10-03-annual-meeting.md': `---
title: Annual meeting
date: 2026-10-03
location: Library annex
---
The board presents the year in review and takes questions.
`,
};

/** @param {string} root */
export default function setup(root) {
  const dir = join(root, 'src/content/events');
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(EVENTS)) writeFileSync(join(dir, name), text);
}
