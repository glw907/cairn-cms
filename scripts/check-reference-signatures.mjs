// cairn-cms: the reference-arm signature-currency gate. The sibling reference-coverage.mjs gate
// checks that a page EXISTS per export; it cannot see a page whose declared signature has drifted
// from the export's real type (this is how the auth pages drifted). This gate closes that gap. For
// each function or const-function export it renders the REAL signature through the TypeScript
// compiler API, scans the page's fenced ts blocks for that name's declared signature, and compares
// the two in a normalized form. A drifted declaration fails the gate, and the RED output is the
// fix worklist. It shares CONFIG and enumerateExports with reference-coverage.mjs so the two gates
// stay in lockstep on subpaths.
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, enumerateExports, moduleExports } from './reference-coverage.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Pages intentionally simplified, keyed `${subpath}#${name}`, each with a reason. A declared block
// here is skipped, the way an over-broad signature is tolerated when the page deliberately trades
// exactness for readability. An addition needs a comment naming why the page cannot carry the real
// signature.
const ALLOWLIST = /** @type {Set<string>} */ (
  new Set([
    // The page sums the actions record as `Record<string, (event) => Promise<unknown>>`; the real
    // type expands all fifteen methods. The per-action signatures live on admin-routes.md and the
    // four factory blocks below, so the facade block stays readable.
    '/sveltekit#createCairnAdmin',
    // The page writes the bare `ConceptConfig`; the real type resolves the default type argument to
    // `ConceptConfig<ConceptSchema<readonly FrontmatterField[]>>`. The default carries no reader
    // value here, so the page omits it.
    '.#normalizeConcepts',
    // The page writes the bare `Fieldset` parameter; the real type resolves its default type
    // argument to `Fieldset<Record<string, FieldDescriptor>>`. The default carries no reader value
    // here, so the page omits it, mirroring `normalizeConcepts`.
    '.#initialValues',
  ])
);

// Strip the leading `declare function NAME`/`declare const NAME:` framing, collapse runs of
// whitespace to one space, and canonicalize the function head so the page form `(P): R` and the
// typeToString arrow form `(P) => R` reduce to the same string. The result is the bare `(args)=>ret`
// shape, so two renderings of one signature compare equal.
/** @param {string} sig */
export function normalizeSignature(sig) {
  let s = sig.trim();
  // Drop the declaration keyword and the export name, keeping the signature body.
  s = s.replace(/^declare\s+function\s+[A-Za-z0-9_$]+\s*/, '');
  s = s.replace(/^declare\s+const\s+[A-Za-z0-9_$]+\s*:\s*/, '');
  // A trailing semicolon is page noise.
  s = s.replace(/;\s*$/, '');
  // typeToString with UseFullyQualifiedType prints every named type as `import("/abs/path").Name`.
  // The page writes the bare `Name`. Strip the qualifier down to the final name so the two match.
  s = s.replace(/import\("[^"]*"\)\./g, '');
  // Collapse all whitespace (including the newlines a multi-line page block carries) to one space.
  s = s.replace(/\s+/g, ' ').trim();
  // A multi-line argument list carries layout noise the flat form does not: a trailing comma before
  // the closing paren, and padding just inside the brackets. Drop both so the two forms match.
  s = s.replace(/,\s*\)/g, ')');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // typeToString expands an optional parameter or member `x?: T` to `x?: T | undefined`, which the
  // page writes as the bare `x?: T` (the `?` already carries the undefined). The page never writes
  // an explicit `| undefined`, so a `| undefined` union member is always the optional artifact here;
  // drop it. This trades the ability to gate a deliberately-required `T | undefined` (none in the
  // surface today) for matching the page's `?`-only convention.
  s = s.replace(/\s*\|\s*undefined\b/g, '');
  // typeToString prints a trailing `;` before the closing brace of an object type literal; the page
  // writes `string }` not `string; }`. Drop the semicolon that sits just before a `}`.
  s = s.replace(/;\s*}/g, ' }');
  // Canonicalize the head: the function form `(args): ret` becomes the arrow form `(args) => ret`.
  // The split must respect the parenthesis nesting of the argument list, so a `): ` inside a nested
  // type does not get rewritten; only the top-level `)` that closes the argument list counts.
  s = headToArrow(s);
  // Normalize arrow spacing so `(a)=>b` and `(a) => b` match.
  s = s.replace(/\s*=>\s*/g, ' => ');
  return s.trim();
}

// Rewrite a leading function head `(args): ret` to the arrow head `(args) => ret`. Leaves an input
// that is already in arrow form, or that does not start with a top-level argument list, untouched.
/** @param {string} s */
function headToArrow(s) {
  if (!s.startsWith('(')) return s;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        const rest = s.slice(i + 1).trimStart();
        if (rest.startsWith('=>')) return s; // already arrow form
        if (rest.startsWith(':')) {
          const args = s.slice(0, i + 1);
          const ret = rest.slice(1).trim();
          return `${args} => ${ret}`;
        }
        return s; // no return annotation to rewrite
      }
    }
  }
  return s;
}

// Compare a page's declared signature against the real rendered type. Returns null when they match
// (or the page block is absent), or a problem object describing the drift. A null `pageSig` means
// the page carries no declared block for this name, which is reference-coverage.mjs's concern, not
// this gate's, so it is skipped here.
/**
 * @param {string} name
 * @param {string | null} pageSig
 * @param {string} realSig
 * @param {string} subpath
 * @param {Set<string>} allowlist
 */
export function compareSignature(name, pageSig, realSig, subpath, allowlist = ALLOWLIST) {
  if (pageSig === null) return null;
  if (allowlist.has(`${subpath}#${name}`)) return null;
  const page = normalizeSignature(pageSig);
  const real = normalizeSignature(realSig);
  if (page === real) return null;
  return { name, pageSig: page, realSig: real };
}

// Pull the declared signature for `name` out of a page's fenced ts blocks. Returns the raw text of
// the `declare function NAME(...)` or `declare const NAME: ...` declaration, or null when no block
// declares it. Reads through the balanced parentheses and on to the statement terminator so a
// multi-line declaration is captured whole.
/**
 * @param {string} pageText
 * @param {string} name
 */
export function declaredSignature(pageText, name) {
  const escaped = name.replace(/[$]/g, '\\$&');
  for (const block of fencedTsBlocks(pageText)) {
    const fn = matchDeclaration(block, new RegExp(`declare\\s+function\\s+${escaped}\\s*\\(`));
    if (fn) return fn;
    const co = matchDeclaration(block, new RegExp(`declare\\s+const\\s+${escaped}\\s*:`));
    if (co) return co;
  }
  return null;
}

// Each ```ts (or ```typescript) fenced block's inner text.
/** @param {string} pageText */
function fencedTsBlocks(pageText) {
  const blocks = [];
  const re = /```(?:ts|typescript)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(pageText)) !== null) blocks.push(m[1]);
  return blocks;
}

// From the start position matched by `head`, read a balanced declaration: through the argument-list
// parentheses for a function, then to the next top-level `;` or end of statement. Returns the raw
// declaration text or null when the head does not match.
/**
 * @param {string} block
 * @param {RegExp} head
 */
function matchDeclaration(block, head) {
  const m = head.exec(block);
  if (!m) return null;
  const start = m.index;
  // Read to the statement terminator, respecting bracket nesting so a `;` or newline inside a type
  // literal or object does not end the declaration early. A top-level `;` ends it; otherwise the
  // declaration runs to a top-level newline that is not inside brackets.
  // Track only round, curly, and square nesting. Angle brackets are skipped on purpose: the arrow
  // `=>` carries a `>` with no opening `<`, so counting angles would corrupt the depth and end the
  // declaration early. A generic `<...>` does not span the statement terminator in these blocks.
  let depth = 0;
  let i = start;
  for (; i < block.length; i++) {
    const ch = block[i];
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth--;
    else if (ch === ';' && depth <= 0) {
      i++;
      break;
    } else if (ch === '\n' && depth <= 0) {
      break;
    }
  }
  return block.slice(start, i).trim();
}

// The real rendered signature for each function/const-function export of a dts, keyed by name. A
// non-function value export (a plain const, an interface, a type alias) is omitted: this gate
// covers the callable surface first.
/** @param {string} dtsPath */
function realSignatures(dtsPath) {
  const { checker, symbols } = moduleExports(dtsPath);
  const out = /** @type {Map<string, string>} */ (new Map());
  for (const sym of symbols) {
    const decl = sym.valueDeclaration ?? sym.declarations?.[0];
    if (!decl) continue;
    const type = checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? decl);
    const sigs = type.getCallSignatures();
    if (sigs.length === 0) continue; // not a callable export
    const rendered = checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation |
        ts.TypeFormatFlags.WriteArrowStyleSignature |
        ts.TypeFormatFlags.UseFullyQualifiedType,
    );
    out.set(sym.name, rendered);
  }
  return out;
}

/** @param {{ subpath: string, dts: string, page: string }} entry */
function checkOne(entry) {
  const dtsPath = resolve(ROOT, entry.dts);
  if (!existsSync(dtsPath)) throw new Error(`missing ${entry.dts}; run "npm run package" first`);
  const pagePath = resolve(ROOT, entry.page);
  if (!existsSync(pagePath)) return { subpath: entry.subpath, page: entry.page, noPage: true, problems: [] };
  const pageText = readFileSync(pagePath, 'utf8');
  const real = realSignatures(dtsPath);
  const exported = new Set(enumerateExports(dtsPath));
  const problems = [];
  for (const [name, realSig] of real) {
    if (!exported.has(name)) continue;
    const pageSig = declaredSignature(pageText, name);
    const problem = compareSignature(name, pageSig, realSig, entry.subpath);
    if (problem) problems.push(problem);
  }
  return { subpath: entry.subpath, page: entry.page, problems };
}

function main() {
  const only = process.argv[2];
  const entries = only ? CONFIG.filter((c) => c.subpath === only) : CONFIG;
  if (only && entries.length === 0) {
    console.error(`unknown subpath ${only}`);
    process.exit(2);
  }
  let failed = false;
  for (const entry of entries) {
    const r = checkOne(entry);
    if (r.noPage) {
      console.error(`MISSING PAGE ${r.page} (${r.subpath})`);
      failed = true;
    } else if (r.problems.length) {
      for (const p of r.problems) {
        console.error(`${r.subpath} (${r.page}): ${p.name} declared \`${p.pageSig}\` but real type is \`${p.realSig}\``);
      }
      failed = true;
    } else {
      console.log(`OK ${r.subpath} (${r.page})`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
