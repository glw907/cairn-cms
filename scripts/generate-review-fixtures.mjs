#!/usr/bin/env node
// generate-review-fixtures.mjs: emits the archive-scale content fixture for the Wayfinder design
// review's content-robustness lens (ROADMAP.md, "Wayfinder final design review", lens five). It
// writes ~200 short posts with varied dates and titles into the showcase's posts directory, so the
// review's archive/pagination/typography-at-scale checks have a reproducible corpus to render.
//
// This script lives ONLY on the standing wayfinder-review-fixtures branch. It is never merged to
// main, and its output (the generated posts under examples/showcase/src/content/posts/) is
// committed alongside it on that branch. Re-run it any time the fixture set needs regenerating; it
// is deterministic (a fixed PRNG seed), so a re-run reproduces the same corpus rather than growing
// it further, as long as the manual, hand-authored fixtures above it are left alone.
//
// Usage: node scripts/generate-review-fixtures.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(HERE, '../examples/showcase/src/content/posts');
const POST_COUNT = 200;
const SEED = 907;

// A tiny deterministic PRNG (mulberry32), so re-running this script reproduces the same corpus
// rather than a fresh random one. No dependency needed for ~200 draws.
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const pick = (list) => list[Math.floor(rand() * list.length)];

const trails = [
  'Ridge Loop', 'Valley Connector', 'North Saddle', 'Old Fire Road', 'Tarn Basin Trail',
  'Switchback Section', 'Reservoir Path', 'South Overlook', 'Cedar Gap Trail', 'Boulder Field Route',
];

const topics = ['trail-reports', 'gear', 'weather', 'routes', 'season-notes'];

const titleTemplates = [
  (t) => `Trail Report: ${t}`,
  (t) => `Conditions on the ${t}`,
  (t) => `This Week on the ${t}`,
  (t) => `Weekend Notes from the ${t}`,
  (t) => `A Quiet Morning on the ${t}`,
  (t) => `Work Crew Update: ${t}`,
  (t) => `What Changed on the ${t} This Season`,
  (t) => `Trip Log: ${t}`,
];

const descriptionTemplates = [
  (t) => `A short update on current conditions along the ${t}.`,
  (t) => `Notes from this week's outing on the ${t}.`,
  (t) => `What the work crew found on the ${t} this pass.`,
  (t) => `A quick trail report for anyone planning the ${t} soon.`,
];

const bodyTemplates = [
  (t) => `The ${t} was in good shape this week, with no new blowdowns and the usual mud in the low spots. Footing was solid past the first mile marker.`,
  (t) => `A short crew went out to clear two blowdowns near the start of the ${t}. The rest of the route is clear and the blazes are easy to follow.`,
  (t) => `Conditions on the ${t} are typical for the season: dry above the tree line, damp below it. Bring layers for the exposed sections.`,
  (t) => `Not much to report from the ${t} this week beyond a quiet, uneventful hike. A good route if you want an easy afternoon out.`,
  (t) => `The creek crossing on the ${t} is running higher than usual after last week's rain. Plan for wet feet if you go before it drops.`,
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isoDate(daysBeforeStart, start) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() - daysBeforeStart);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function frontmatterList(key, values) {
  return `${key}:\n${values.map((v) => `  - ${v}`).join('\n')}`;
}

function main() {
  mkdirSync(POSTS_DIR, { recursive: true });

  const usedSlugs = new Set();
  // Spread the archive across roughly two years, ending well before the hand-authored 2026-07
  // fixtures above so the two sets never collide on a date.
  const startDate = '2026-06-01';

  for (let i = 0; i < POST_COUNT; i += 1) {
    const trail = pick(trails);
    const title = pick(titleTemplates)(trail);
    const description = pick(descriptionTemplates)(trail);
    const body = pick(bodyTemplates)(trail);
    const date = isoDate(i * 4 + 3, startDate);

    let slug = slugify(title);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    const postTopics = [pick(topics)];
    const escapedTitle = title.includes(':') ? `"${title.replace(/"/g, '\\"')}"` : title;

    const frontmatter = [
      '---',
      `title: ${escapedTitle}`,
      `date: ${date}`,
      `description: ${description}`,
      frontmatterList('topics', postTopics),
      '---',
    ].join('\n');

    const contents = `${frontmatter}\n${body}\n`;
    const filename = `${date}-${slug}.md`;
    writeFileSync(path.join(POSTS_DIR, filename), contents, 'utf8');
  }

  console.log(`wrote ${POST_COUNT} posts to ${path.relative(process.cwd(), POSTS_DIR)}`);
}

main();
