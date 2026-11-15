// Builds the gzipped tar the catalog publishes for a theme or a content set, the same bytes every
// time from the same source, because the publish job's resume rule compares a release path's
// digest with the one it would write and fails on any difference.
//
// The tar is ustar written here: entries sorted bytewise by path, directories 0755 and files 0644
// whatever the checkout's bits, mtime 0, uid and gid 0, empty owner names. The gzip wrapper is
// written here too, with mtime 0, no file name, and a fixed OS byte, and its deflate stream is
// stored blocks only. A zlib-compressed stream is not a fixed function of its input: Node bundles
// Chromium's zlib, whose output can change with the zlib version and the CPU's SIMD paths, so the
// workstation and the runner could disagree on the digest. Theme and set payloads are mostly
// woff2 fonts and images, which deflate does not shrink, so storing costs little.
//
// A theme archive's root is `theme/` and holds what a lay-in puts in `src/theme/` (generated
// `theme-names.ts` included) plus `app-html-block.html`, the lines the lay-in writes between the
// two markers in `src/app.html`, unindented. A set archive's root is `set/` and holds the set
// directory as it is.
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { layIn } from '../theme/lay-in.mjs';

/** The largest theme or set archive the catalog accepts, in bytes (8 MiB). */
export const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;

/** The largest single image a set may carry, in bytes (400 KB). */
export const MAX_SET_IMAGE_BYTES = 400_000;

/** The line a set's site configuration must carry, which the installer overwrites with the owner's site name. */
export const SITE_NAME_LITERAL = 'siteName: Waymark';

const IMAGE = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const BLOCK = 512;
const START = 'cairn-theme-names:start';
const END = 'cairn-theme-names:end';

/**
 * @typedef {object} Archive
 * @property {Buffer} bytes the gzipped tar
 * @property {string} integrity the SRI string, `sha512-` and the base64 digest of `bytes`
 * @property {number} size the length of `bytes`
 */

/**
 * @typedef {object} Entry
 * @property {string} path the entry's path inside the archive; a directory's ends in `/`
 * @property {Buffer} [data] a file's content; absent for a directory
 */

/**
 * Writes `value` as zero-padded octal into `field` bytes of `header` at `offset`, NUL-terminated.
 * @param {Buffer} header
 * @param {number} offset
 * @param {number} field
 * @param {number} value
 */
function octal(header, offset, field, value) {
  header.write(`${value.toString(8).padStart(field - 1, '0')}\0`, offset, field, 'ascii');
}

/**
 * Splits a path into ustar's `prefix` and `name` fields, throwing when it fits neither form.
 * @param {string} entryPath
 * @returns {{ prefix: Buffer, name: Buffer }}
 */
function splitPath(entryPath) {
  const whole = Buffer.from(entryPath, 'utf8');
  if (whole.length <= 100) return { prefix: Buffer.alloc(0), name: whole };
  // The split must fall on a slash, with at most 155 bytes before it and 100 after.
  for (let i = whole.length - 1; i > 0; i--) {
    if (whole[i] !== 0x2f) continue;
    if (i <= 155 && whole.length - i - 1 <= 100 && whole.length - i - 1 > 0) {
      return { prefix: whole.subarray(0, i), name: whole.subarray(i + 1) };
    }
  }
  throw new Error(`archive: the path ${entryPath} is too long for a ustar header`);
}

/**
 * The 512-byte ustar header for one entry.
 * @param {Entry} entry
 * @returns {Buffer}
 */
function header(entry) {
  const isDir = entry.data === undefined;
  const { prefix, name } = splitPath(entry.path);
  const h = Buffer.alloc(BLOCK);
  name.copy(h, 0);
  octal(h, 100, 8, isDir ? 0o755 : 0o644);
  octal(h, 108, 8, 0);
  octal(h, 116, 8, 0);
  octal(h, 124, 12, isDir ? 0 : entry.data.length);
  octal(h, 136, 12, 0);
  h.fill(0x20, 148, 156);
  h.write(isDir ? '5' : '0', 156, 1, 'ascii');
  h.write('ustar\0', 257, 6, 'ascii');
  h.write('00', 263, 2, 'ascii');
  octal(h, 329, 8, 0);
  octal(h, 337, 8, 0);
  prefix.copy(h, 345);
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  return h;
}

/**
 * A ustar stream of the entries in bytewise path order, ended by two zero blocks.
 * @param {Entry[]} entries
 * @returns {Buffer}
 */
export function tar(entries) {
  const sorted = [...entries].sort((a, b) => Buffer.compare(Buffer.from(a.path, 'utf8'), Buffer.from(b.path, 'utf8')));
  const parts = [];
  for (const entry of sorted) {
    parts.push(header(entry));
    if (entry.data !== undefined && entry.data.length > 0) {
      parts.push(entry.data);
      const pad = (BLOCK - (entry.data.length % BLOCK)) % BLOCK;
      if (pad) parts.push(Buffer.alloc(pad));
    }
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  return Buffer.concat(parts);
}

/**
 * A gzip member holding `data` in stored deflate blocks, with mtime 0, no name, and OS byte 255.
 * @param {Buffer} data
 * @returns {Buffer}
 */
export function gzipStored(data) {
  // ID1 ID2, CM deflate, FLG none, MTIME 0, XFL 0, OS 255 (unknown), so no byte names the host.
  const parts = [Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0x00, 0xff])];
  const MAX = 0xffff;
  let offset = 0;
  do {
    const len = Math.min(MAX, data.length - offset);
    const final = offset + len >= data.length;
    const block = Buffer.alloc(5);
    block[0] = final ? 0x01 : 0x00;
    block.writeUInt16LE(len, 1);
    block.writeUInt16LE(~len & 0xffff, 3);
    parts.push(block, data.subarray(offset, offset + len));
    offset += len;
  } while (offset < data.length);
  const trailer = Buffer.alloc(8);
  trailer.writeUInt32LE(crc32(data) >>> 0, 0);
  trailer.writeUInt32LE(data.length >>> 0, 4);
  parts.push(trailer);
  return Buffer.concat(parts);
}

/**
 * The gzipped tar, its integrity string, and its size, refused over {@link MAX_ARCHIVE_BYTES}.
 * @param {Entry[]} entries
 * @returns {Archive}
 */
function seal(entries) {
  const bytes = gzipStored(tar(entries));
  if (bytes.length > MAX_ARCHIVE_BYTES) {
    throw new Error(`archive: ${bytes.length} bytes is over the 8 MiB limit (${MAX_ARCHIVE_BYTES} bytes)`);
  }
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  return { bytes, integrity, size: bytes.length };
}

/**
 * Every directory and file under `dir` as entries rooted at `root`, refusing anything that is
 * neither, since a link would carry a path from the build machine into the archive.
 * @param {string} dir
 * @param {string} root
 * @returns {Entry[]}
 */
function walk(dir, root) {
  /** @type {Entry[]} */
  const entries = [{ path: `${root}/` }];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = lstatSync(full);
    const inner = `${root}/${name}`;
    if (stat.isDirectory()) entries.push(...walk(full, inner));
    else if (stat.isFile()) entries.push({ path: inner, data: readFileSync(full) });
    else throw new Error(`archive: ${full} is neither a file nor a directory`);
  }
  return entries;
}

/**
 * The lines between the two theme-name markers in an `app.html`, each without its indentation.
 * @param {string} html
 * @returns {string}
 */
function markedBlock(html) {
  const lines = html.split('\n');
  const start = lines.findIndex((l) => l.includes(START));
  const end = lines.findIndex((l) => l.includes(END));
  return `${lines.slice(start + 1, end).map((l) => l.trimStart()).join('\n')}\n`;
}

/**
 * Builds a theme's archive by laying the theme into a scratch site, so the archive holds exactly
 * what a lay-in writes and no second copy of its rules exists.
 * @param {string} themeDir the theme directory, holding `cairn-theme.json`
 * @returns {Archive}
 */
export function buildThemeArchive(themeDir) {
  const scratch = mkdtempSync(path.join(tmpdir(), 'cairn-archive-'));
  try {
    mkdirSync(path.join(scratch, 'src'), { recursive: true });
    writeFileSync(path.join(scratch, 'package.json'), '{ "name": "cairn-archive-scratch" }\n');
    writeFileSync(path.join(scratch, 'src/app.html'), `<script>\n// ${START}\n// ${END}\n</script>\n`);
    layIn(themeDir, scratch);
    const entries = walk(path.join(scratch, 'src/theme'), 'theme');
    const block = markedBlock(readFileSync(path.join(scratch, 'src/app.html'), 'utf8'));
    entries.push({ path: 'theme/app-html-block.html', data: Buffer.from(block, 'utf8') });
    return seal(entries);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Builds a content set's archive, refusing a set whose site configuration lacks
 * {@link SITE_NAME_LITERAL} or that carries an image over {@link MAX_SET_IMAGE_BYTES}.
 * @param {string} setDir the set directory, holding `cairn-set.json`
 * @returns {Archive}
 */
export function buildSetArchive(setDir) {
  const configPath = path.join(setDir, 'src/site/site.config.yaml');
  let config = '';
  try {
    config = readFileSync(configPath, 'utf8');
  } catch {
    throw new Error(`archive: ${configPath} is missing, and a set must carry its site configuration`);
  }
  // The installer finds the literal as a plain substring, so the check matches it the same way.
  if (!config.includes(SITE_NAME_LITERAL)) {
    throw new Error(`archive: ${configPath} lacks the line "${SITE_NAME_LITERAL}" the installer replaces`);
  }
  const entries = walk(setDir, 'set');
  for (const entry of entries) {
    if (entry.data && IMAGE.test(entry.path) && entry.data.length > MAX_SET_IMAGE_BYTES) {
      throw new Error(
        `archive: the image ${entry.path} is ${entry.data.length} bytes, over the 400 KB limit (${MAX_SET_IMAGE_BYTES} bytes)`,
      );
    }
  }
  return seal(entries);
}
