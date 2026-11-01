#!/usr/bin/env node
// Builds guidance-hashes.json: the sha256 of every file `cairn-guidance install` has ever shipped
// under `.claude/skills/` or `.claude/agents/`, keyed by destination path. `install` deletes a
// path it no longer ships only when the file on disk hashes to one of these, so a developer's
// edit survives. Run it at release time, after the release tag exists, and commit the result.
//
//   node scripts/build/build-guidance-hashes.mjs            rebuild from every shipping tag
//   node scripts/build/build-guidance-hashes.mjs --check    exit 1 when the committed file is stale
//
// `v0.97.0` is the first release that shipped the bin (`0.84.4` shipped none, and no tag between
// them did), so the tag list starts there and takes every later `v*` tag.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

const FIRST_SHIPPING = '0.97.0';
const OUT = resolve(ROOT, 'guidance-hashes.json');

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function versionParts(tag) {
  return tag
    .replace(/^v/, '')
    .split(/[.-]/)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function atOrAfterFirst(tag) {
  const [a, b, c] = versionParts(tag);
  const [x, y, z] = FIRST_SHIPPING.split('.').map(Number);
  if (![a, b, c].every(Number.isInteger)) return false;
  return a !== x ? a > x : b !== y ? b > y : c >= z;
}

/** The tags that shipped the bin: `v<semver>` at or after the first shipping version. */
export function shippingTags() {
  return git('tag', '--list', 'v*')
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => /^v\d+\.\d+\.\d+(-.+)?$/.test(tag) && atOrAfterFirst(tag))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Map one tag's packaged skills and agents to `.claude/...` destination paths and hashes. */
function hashesAt(tag) {
  const out = {};
  const listed = git('ls-tree', '-r', '--name-only', tag, '--', 'skills', 'claude/agents')
    .split('\n')
    .filter(Boolean);
  for (const path of listed) {
    const dest = path.startsWith('skills/')
      ? `.claude/${path}`
      : `.claude/agents/${path.slice('claude/agents/'.length)}`;
    const content = git('show', `${tag}:${path}`);
    out[dest] = createHash('sha256').update(content, 'utf8').digest('hex');
  }
  return out;
}

export function buildTable() {
  const files = {};
  for (const tag of shippingTags()) {
    for (const [dest, hash] of Object.entries(hashesAt(tag))) {
      const seen = (files[dest] ??= []);
      if (!seen.includes(hash)) seen.push(hash);
    }
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
  return `${JSON.stringify({ version: 1, files: sorted }, null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const next = buildTable();
  if (process.argv.includes('--check')) {
    const current = readFileSync(OUT, 'utf8');
    if (current !== next) {
      console.error('guidance-hashes.json is stale: run scripts/build/build-guidance-hashes.mjs');
      process.exit(1);
    }
  } else {
    writeFileSync(OUT, next);
    console.log(`wrote guidance-hashes.json from ${shippingTags().join(', ')}`);
  }
}
