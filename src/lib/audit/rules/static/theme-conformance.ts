// cairn-audit's theme-conformance rule: a site's public theme defines everything the public
// stylesheets read, and defines it the way the engine's defaults expect. Two halves.
//
// Completeness. Each named daisyUI theme block (`@plugin "daisyui/theme"`) defines every key
// daisyUI's own theme object carries, except a block named after a built-in theme, which daisyUI
// completes by merging. A hole in the default block is a runtime hole; one in a secondary block is
// filled by the default block's value and is reported as the quieter thing it is.
//
// Resolution. A `var(--x)` with no fallback resolves to one of four sources: the real `@import`
// chain, Tailwind's theme variables (or the `--tw-` namespace), the daisyUI keys of a block found
// complete, or a custom property declared anywhere in the scanned tree. Anything else is a typo or
// a token no stylesheet defines.
//
// Three more findings guard the engine's contract: the chain never imports `cairn-public.css`, a
// chassis file redeclares one of its defaults (a stale copy beats the layered default and cancels
// ink derivation), and a `--font-<name>` face sits beside a `--font-weight-<name>` weight (Tailwind
// resolves the utility to the face, so the weight never generates).
//
// Stylesheets are read through `sheet.ts`, never a regex over raw text. The rule needs `daisyui`
// and `tailwindcss`, resolved from the audited root when the rule runs (peers.ts).
import { resolve } from 'node:path';
import { loadDaisyThemeKeys, loadTailwindVariables, nodePeers } from '../../peers.js';
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import type { CssScopeRule } from './css-scope.js';
import type { ChainFile } from '../../import-chain.js';
import type { PeerAccess } from '../../peers.js';
import type { SheetRule } from '../../sheet.js';
import type { Finding, StaticRule, StaticRuleContext } from '../../types.js';

const RULE_ID = 'theme-conformance';

/** The specifier a site imports the engine's public stylesheet by. */
const CAIRN_PUBLIC = '@glw907/cairn-cms/cairn-public.css';

const DAISY_THEME_BLOCK = /^@plugin\s+(["'])daisyui\/theme\1$/;
const PROPERTY_AT_RULE = /^@property\s+(--\S+)/;
const CUSTOM_PROPERTY = /^--[A-Za-z0-9_\u0080-￿-]+$/;

/** One rule of the stylesheets the run considers, with where it came from. */
interface Site extends CssScopeRule {
  /** Whether the file is under the public scope, as opposed to reached only through the chain. */
  inScope: boolean;
  /** The chain's record of the file, when the chain read it. */
  chainFile?: ChainFile;
}

/** One daisyUI theme block. */
interface ThemeBlock {
  site: Site;
  name: string;
  isDefault: boolean;
  missing: string[];
  /** Whether daisyUI completes the block by merging with the built-in theme of the same name. */
  builtIn: boolean;
}

/** A declaration's value with its surrounding quotes removed. */
function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, '$2');
}

/**
 * The custom-property names a value reads through `var()` with no fallback. A `var()` with a
 * fallback is skipped whole, its own fallback included, and so is a name that is not a plain
 * custom-property identifier or a call that never closes.
 */
export function unresolvedReads(value: string): string[] {
  const names: string[] = [];
  const opener = /var\(/gi;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(value)) !== null) {
    let depth = 1;
    let comma = -1;
    let i = match.index + match[0].length;
    const inside = i;
    while (i < value.length && depth > 0) {
      if (value[i] === '(') depth++;
      else if (value[i] === ')') depth--;
      else if (value[i] === ',' && depth === 1 && comma === -1) comma = i;
      i++;
    }
    if (depth > 0) break;
    opener.lastIndex = i;
    if (comma !== -1) continue;
    const name = value.slice(inside, i - 1).trim();
    if (CUSTOM_PROPERTY.test(name)) names.push(name);
  }
  return names;
}

/** Tailwind's arbitrary-value forms that read a custom property: `[var(--x)]` and `(--x)`. */
function classTokenReads(token: string): string[] {
  const shorthand = [...token.matchAll(/(?<![A-Za-z])\((--[A-Za-z0-9_-]+)\)/g)].map((found) => found[1]);
  return [...unresolvedReads(token), ...shorthand];
}

/** The custom property a Tailwind arbitrary property (`[--x:1px]`) declares. */
function classTokenDeclaration(token: string): string | undefined {
  return /\[(--[A-Za-z0-9_-]+):/.exec(token)?.[1];
}

/**
 * Whether a rule sets values for the whole page: an `@theme` block, or a selector list with an
 * alternative that is the root element or a `[data-theme]` region. A local rule that sets the same
 * name on one element (prose.css scopes `--flow-space` to a class) overrides nothing the engine sets.
 */
function setsPageValues(selector: string): boolean {
  if (selector.startsWith('@theme')) return true;
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => /^(?::root|html)(?:\[[^\]]*\]|:not\([^)]*\)|:where\([^)]*\))*$|^\[data-theme[^\]]*\]$/.test(part));
}

/** Whether a root-relative path lies in a chassis directory. */
function inChassis(file: string): boolean {
  return file.split('/').includes('chassis');
}

/**
 * Build the theme-conformance rule over a given peer access. The registered rule reads the real
 * installed peers; a test injects its own to drive the missing-peer and bad-key-list failures.
 */
export function createThemeConformance(peers: PeerAccess = nodePeers): StaticRule {
  return {
    id: RULE_ID,
    tier: 'advisory',
    publicScope: true,
    importChain: true,
    check(ctx) {
      const { keys, builtInThemes } = loadDaisyThemeKeys(ctx.config.root, peers);
      const tailwindVariables = loadTailwindVariables(ctx.config.root, peers);
      return conformanceFindings(ctx, keys, builtInThemes, tailwindVariables);
    },
  };
}

/** The registered rule: `theme-conformance` over the peers installed beside the audited site. */
export const themeConformance: StaticRule = createThemeConformance();

function conformanceFindings(
  ctx: StaticRuleContext,
  keys: string[],
  builtInThemes: Set<string>,
  tailwindVariables: Set<string>
): Finding[] {
  const findings: Finding[] = [];
  const chain = ctx.chain ?? { files: [], imports: [], unread: [] };
  const root = ctx.config.root;
  const chainByAbs = new Map(chain.files.map((file) => [file.abs, file]));

  // Every rule the run considers: the scope's own, then any chain file the scope does not hold.
  const scopeRules = [...cssScopeRules(ctx)];
  const scopeAbs = new Set(scopeRules.map((scope) => resolve(root, scope.file)));
  const sites: Site[] = scopeRules.map((scope) => ({
    ...scope,
    inScope: true,
    chainFile: chainByAbs.get(resolve(root, scope.file)),
  }));
  for (const file of chain.files) {
    if (scopeAbs.has(file.abs)) continue;
    for (const rule of file.sheet.rules) {
      sites.push({ file: file.file, source: file.source, rule, inScope: false, chainFile: file });
    }
  }

  const at = (site: CssScopeRule, message: string): Finding => ({
    ruleId: RULE_ID,
    tier: 'advisory',
    ...cssRulePosition(site),
    message,
  });
  const entry = chain.files.find((file) => file.entry);
  const anchor = (message: string): Finding => ({
    ruleId: RULE_ID,
    tier: 'advisory',
    file: entry?.file ?? ctx.config.publicStylesheets[0] ?? ctx.cssFiles?.[0]?.file ?? 'src/theme/theme.css',
    line: 1,
    start: 0,
    end: 0,
    message,
  });

  // Completeness: each theme block against the key list.
  const blocks: ThemeBlock[] = [];
  for (const site of sites) {
    if (!DAISY_THEME_BLOCK.test(site.rule.selector)) continue;
    const value = (property: string) => site.rule.declarations.find((d) => d.property === property)?.value;
    const defined = new Set(site.rule.declarations.map((d) => d.property));
    const name = unquote(value('name') ?? '');
    const builtIn = builtInThemes.has(name);
    blocks.push({
      site,
      name,
      isDefault: unquote(value('default') ?? '') === 'true',
      missing: builtIn ? [] : keys.filter((key) => !defined.has(key)),
      builtIn,
    });
  }
  if (blocks.length === 0) {
    findings.push(
      anchor('no daisyUI theme block: the public scope defines no @plugin "daisyui/theme" block, so no theme defines the roles a page reads')
    );
  }
  for (const block of blocks) {
    if (block.missing.length === 0) continue;
    const label = block.name === '' ? 'an unnamed theme block' : `theme block "${block.name}"`;
    const list = block.missing.join(', ');
    const isDefault = block.isDefault || blocks.length === 1;
    findings.push(
      at(
        block.site,
        isDefault
          ? `${label} (the default block) is missing ${list}: a runtime hole, since nothing else defines it for a page that reads it`
          : `${label} is a secondary block missing ${list}: the default block's value fills it, which hides a per-scheme choice you have not made. Define it here`
      )
    );
  }
  const completeBlockFound = blocks.some((block) => block.missing.length === 0);
  const incomplete = new Set(blocks.filter((block) => block.missing.length > 0).map((block) => block.site.rule));

  // Every custom property the tree and the chain declare.
  const declared = new Set<string>(tailwindVariables);
  if (completeBlockFound) for (const key of keys) if (key.startsWith('--')) declared.add(key);
  const keySet = new Set(keys);
  for (const site of sites) {
    const property = PROPERTY_AT_RULE.exec(site.rule.selector)?.[1];
    if (property) declared.add(property);
    for (const decl of site.rule.declarations) {
      if (!decl.property.startsWith('--')) continue;
      if (incomplete.has(site.rule) && keySet.has(decl.property)) continue;
      declared.add(decl.property);
    }
  }
  for (const file of ctx.files) {
    for (const style of file.styleValues) if (style.property?.startsWith('--')) declared.add(style.property);
    for (const token of file.classTokens) {
      const property = classTokenDeclaration(token.value);
      if (property) declared.add(property);
    }
  }

  // Resolution: every var() read in the scanned tree.
  const unresolved = (name: string) => `var(${name}) resolves to nothing: no imported stylesheet, Tailwind theme variable, complete daisyUI block, or declaration in the scanned tree defines ${name}`;
  const known = (name: string) => declared.has(name) || name.startsWith('--tw-');
  for (const site of sites) {
    if (!site.inScope) continue;
    const seen = new Set<string>();
    for (const decl of site.rule.declarations) {
      for (const name of unresolvedReads(decl.value)) {
        if (known(name) || seen.has(name)) continue;
        seen.add(name);
        findings.push(at(site, unresolved(name)));
      }
    }
  }
  for (const file of ctx.files) {
    const report = (name: string, position: { line: number; start: number; end: number }) =>
      findings.push({ ruleId: RULE_ID, tier: 'advisory', file: file.file, ...position, message: unresolved(name) });
    for (const style of file.styleValues) {
      for (const name of unresolvedReads(style.value)) if (!known(name)) report(name, style);
    }
    for (const token of file.classTokens) {
      for (const name of classTokenReads(token.value)) if (!known(name)) report(name, token);
    }
  }

  // The chain imports the engine's public stylesheet.
  const cairnPublic = chain.files.find((file) => file.specifier === CAIRN_PUBLIC);
  const importsCairnPublic = chain.imports.some((entryImport) => entryImport.specifier === CAIRN_PUBLIC);
  if (entry && !importsCairnPublic) {
    findings.push(
      anchor(
        `the public stylesheet chain does not import "${CAIRN_PUBLIC}", so the engine's role defaults (status inks, muted, shadow) are undefined. Add @import "${CAIRN_PUBLIC}" after @import "tailwindcss"`
      )
    );
  }

  // A chassis file that redeclares one of the engine's defaults.
  if (cairnPublic) {
    const engineDefaults = new Set<string>();
    for (const rule of cairnPublic.sheet.rules) {
      for (const decl of rule.declarations) if (decl.property.startsWith('--')) engineDefaults.add(decl.property);
    }
    for (const file of chain.files) {
      if (file === cairnPublic || !inChassis(file.file)) continue;
      const redeclared = new Set<string>();
      let first: SheetRule | undefined;
      for (const rule of file.sheet.rules) {
        if (!setsPageValues(rule.selector)) continue;
        for (const decl of rule.declarations) {
          if (!engineDefaults.has(decl.property)) continue;
          redeclared.add(decl.property);
          first ??= rule;
        }
      }
      if (!first) continue;
      findings.push(
        at(
          { file: file.file, source: file.source, rule: first },
          `chassis file redeclares engine defaults from cairn-public.css: ${[...redeclared].join(', ')}. An unlayered declaration beats the engine's layered default and cancels its derivation. Delete the copy, and set a per-theme value in a daisyUI block`
        )
      );
    }
  }

  // A face and a weight under one name in @theme.
  const faces = new Map<string, Site>();
  const weights = new Set<string>();
  for (const site of sites) {
    if (!site.rule.selector.startsWith('@theme')) continue;
    for (const decl of site.rule.declarations) {
      const weight = /^--font-weight-(.+)$/.exec(decl.property);
      if (weight) {
        weights.add(weight[1]);
        continue;
      }
      const face = /^--font-(.+)$/.exec(decl.property);
      if (face && !faces.has(face[1])) faces.set(face[1], site);
    }
  }
  for (const [name, site] of faces) {
    if (!weights.has(name)) continue;
    findings.push(
      at(
        site,
        `--font-${name} declares a face and --font-weight-${name} a weight under one name: Tailwind resolves the font-${name} utility to the face, so the weight never generates. Rename one`
      )
    );
  }

  // An import that resolved to a file that is not a stylesheet.
  for (const entryImport of chain.imports) {
    if (entryImport.status !== 'non-css') continue;
    const importer = chainByAbs.get(resolve(root, entryImport.from));
    if (!importer) continue;
    const before = importer.source.slice(0, entryImport.start);
    findings.push({
      ruleId: RULE_ID,
      tier: 'advisory',
      file: importer.file,
      line: before.split('\n').length,
      start: entryImport.start,
      end: entryImport.end,
      message: `@import "${entryImport.specifier}" resolves to ${entryImport.resolved}, which is not a stylesheet; it was not read`,
    });
  }
  return findings;
}
