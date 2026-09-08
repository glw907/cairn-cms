#!/usr/bin/env node
// Reports cadence measurements for a markdown file. Reports only; nothing here gates.
// Usage: node scripts/checks/measure-prose.mjs <file.md> [--until "## Heading"] [--json]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const untilIdx = args.indexOf('--until');
const until = untilIdx >= 0 ? args[untilIdx + 1] : null;
const asJson = args.includes('--json');
if (!file) {
  console.error('usage: measure-prose.mjs <file.md> [--until "## Heading"] [--json]');
  process.exit(2);
}

let text = readFileSync(file, 'utf8');
if (until && text.includes(until)) text = text.slice(0, text.indexOf(until));

// Strip fenced code, tables, headings, link targets, and inline code.
text = text.replace(/```[\s\S]*?```/g, '');
text = text.replace(/^\|.*$/gm, '');
text = text.replace(/^#{1,6} .*$/gm, '');
text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
text = text.replace(/`[^`]*`/g, 'Code');
text = text.replace(/\*\*([^*]+)\*\*/g, '$1');

// Join wrapped list items into one line each, then mark list items.
const lines = text.split('\n');
const blocks = [];
let cur = null;
for (const raw of lines) {
  const line = raw.replace(/\s+$/, '');
  const isItem = /^\s*(?:[-*]|\d+\.)\s+/.test(line);
  const isCont = /^\s{2,}\S/.test(line) && cur && cur.list;
  if (line.trim() === '') { if (cur) blocks.push(cur); cur = null; continue; }
  if (isItem) { if (cur) blocks.push(cur); cur = { list: true, text: line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '') }; continue; }
  if (isCont) { cur.text += ' ' + line.trim(); continue; }
  if (cur && !cur.list) cur.text += ' ' + line.trim();
  else { if (cur) blocks.push(cur); cur = { list: false, text: line.trim() }; }
}
if (cur) blocks.push(cur);

const splitSentences = (s) =>
  s.split(/(?<=[.!?])\s+(?=[A-Z"'(`])/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);

// A hinged pair: two clauses joined by a comma-coordinator, a colon, a semicolon, a dash,
// or a relative-clause chain. Serial-list commas are excluded by requiring a coordinator or
// relative word after the comma.
const HINGE = /(?:,\s+(?:and|but|so|or|yet|which|where|while|because|since|although|though|as)\b)|[;:]\s+\S|\s[-–—]\s|,\s+(?:which|that)\s+\w+\s+\w+/;

function measure(sel) {
  const sents = [];
  const paras = [];
  for (const b of blocks) {
    if (sel === 'prose' && b.list) continue;
    const ss = splitSentences(b.text);
    sents.push(...ss);
    if (!b.list) paras.push({ sentences: ss.length, words: b.text.split(/\s+/).length });
  }
  const lens = sents.map((s) => s.split(/\s+/).length);
  const n = lens.length;
  const mean = n ? lens.reduce((a, b) => a + b, 0) / n : 0;
  const hinge = sents.filter((s) => HINGE.test(s)).length;
  const short = lens.filter((l) => l < 8).length;
  const longPara = paras.filter((p) => p.sentences > 8 || p.words > 150).length;
  return {
    sentences: n,
    mean: Math.round(mean * 10) / 10,
    max: n ? Math.max(...lens) : 0,
    hingePct: n ? Math.round((100 * hinge) / n) : 0,
    shortPct: n ? Math.round((100 * short) / n) : 0,
    longParagraphs: longPara,
    paragraphs: paras.length,
  };
}

const out = { file, until, all: measure('all'), prose: measure('prose') };
if (asJson) console.log(JSON.stringify(out, null, 2));
else {
  for (const k of ['all', 'prose']) {
    const m = out[k];
    console.log(`${k}: sentences ${m.sentences}, mean ${m.mean}, max ${m.max}, hinged ${m.hingePct}%, short ${m.shortPct}%, long paragraphs ${m.longParagraphs}/${m.paragraphs}`);
  }
}
