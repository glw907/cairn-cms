#!/usr/bin/env node
// Reports cadence measurements for a markdown file. Reports only; nothing here gates.
// Usage: node scripts/checks/measure-prose.mjs <file.md> [--until "## Heading"] [--json]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Splits a prose block into sentence-like chunks of three words or more.
 * @param {string} s the block's joined text
 * @returns {string[]}
 */
export const splitSentences = (s) =>
  s.split(/(?<=[.!?])\s+(?=[A-Z"'(`])/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);

// A hinged pair: two clauses joined by a comma-coordinator, a colon, a semicolon, a dash,
// or a relative-clause chain.
// Serial lists are excluded: a ", and" or ", or" that follows another comma in the same
// sentence is read as the last item of a list, never as a hinge.
const HINGE_PUNCT = /[;:]\s+\S|\s[-–—]\s/;
const HINGE_SUB = /,\s+(?:but|so|yet|which|where|while|because|since|although|though|as)\b|,\s+(?:which|that)\s+\w+\s+\w+/;
const HINGE_AND = /,\s+(?:and|or)\b/;
function isHinged(s) {
  if (HINGE_PUNCT.test(s) || HINGE_SUB.test(s)) return true;
  const m = HINGE_AND.exec(s);
  if (!m) return false;
  return !s.slice(0, m.index).includes(',');
}

/**
 * Splits a markdown file's stripped text into prose and list blocks, joining wrapped list items
 * into one line each.
 * @param {string} text the markdown text with code, tables, headings, links, and emphasis stripped
 * @returns {{ list: boolean, text: string }[]}
 */
export function toBlocks(text) {
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
  return blocks;
}

/**
 * Measures sentence and paragraph cadence over a block selection.
 * @param {{ list: boolean, text: string }[]} blocks the file's prose and list blocks
 * @param {'all' | 'prose'} sel whether list blocks are included
 * @param {boolean} [showParas] whether to log each long paragraph as it is found
 * @returns {object} the cadence measurements
 */
export function measure(blocks, sel, showParas = false) {
  const sents = [];
  const paras = [];
  for (const b of blocks) {
    if (sel === 'prose' && b.list) continue;
    const ss = splitSentences(b.text);
    sents.push(...ss);
    if (!b.list) {
      const para = { sentences: ss.length, words: b.text.split(/\s+/).length, leadIn: /[:]$/.test(b.text.trim()), start: b.text.slice(0, 60) };
      paras.push(para);
      if (showParas && sel === 'all' && (para.sentences > 8 || para.words > 150)) console.error(`long paragraph (${para.sentences} sentences, ${para.words} words): ${b.text.slice(0, 90)}`);
    }
  }
  const lens = sents.map((s) => s.split(/\s+/).length);
  const n = lens.length;
  const mean = n ? lens.reduce((a, b) => a + b, 0) / n : 0;
  const hinge = sents.filter(isHinged).length;
  const short = lens.filter((l) => l < 8).length;
  const longPara = paras.filter((p) => p.sentences > 8 || p.words > 150).length;
  const shortList = paras.filter((p) => p.sentences < 3 && !p.leadIn).map((p) => p.start);
  const shortPara = shortList.length;
  return {
    sentences: n,
    mean: Math.round(mean * 10) / 10,
    max: n ? Math.max(...lens) : 0,
    hingePct: n ? Math.round((100 * hinge) / n) : 0,
    shortPct: n ? Math.round((100 * short) / n) : 0,
    longParagraphs: longPara,
    shortParagraphs: shortPara,
    shortParagraphStarts: shortList,
    paragraphs: paras.length,
  };
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const untilIdx = args.indexOf('--until');
  const until = untilIdx >= 0 ? args[untilIdx + 1] : null;
  const asJson = args.includes('--json');
  const showParas = args.includes('--paras');
  if (!file) {
    console.error('usage: measure-prose.mjs <file.md> [--until "## Heading"] [--json]');
    process.exitCode = 2;
    return;
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

  const blocks = toBlocks(text);
  const out = { file, until, all: measure(blocks, 'all', showParas), prose: measure(blocks, 'prose', showParas) };
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    for (const k of ['all', 'prose']) {
      const m = out[k];
      console.log(`${k}: sentences ${m.sentences}, mean ${m.mean}, max ${m.max}, hinged ${m.hingePct}%, short ${m.shortPct}%, long paragraphs ${m.longParagraphs}/${m.paragraphs}, short paragraphs ${m.shortParagraphs}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
