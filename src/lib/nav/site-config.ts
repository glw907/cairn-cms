// The navigation tree and its YAML site-config. A menu lives in the site's git-committed config
// under `menus.<name>`, read at build time by the public layout and edited from /admin/nav, which
// commits the file back through the GitHub-App pipeline. This module is pure: parse, validate, and
// rewrite only. The engine returns data; each site renders the tree with its own markup.
import { parse as parseYaml, parseDocument } from 'yaml';

/** One navigation node. An omitted or empty `url` is a label-only grouping header; no `children` is a leaf. */
export interface NavNode {
  label: string;
  url?: string;
  children?: NavNode[];
}

/** Total node cap across the whole tree, a guard against a runaway payload. */
export const MAX_NAV_NODES = 200;

/** Maximum character length for a node label. */
export const MAX_LABEL_LENGTH = 500;

/** Maximum character length for a node URL. */
export const MAX_URL_LENGTH = 2048;

/** Allowlist for safe URL schemes: site-relative, in-page anchors, http(s), mailto, and tel. */
const SAFE_URL = /^(\/|#|https?:\/\/|mailto:|tel:)/i;

/** A valid vocabulary `value`: lowercase alphanumeric segments joined by single hyphens, the stored token and filter key. */
const SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class NavValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavValidationError';
  }
}

/**
 * Validate and normalize an untrusted value into a NavNode[]: arrays only, non-empty labels, depth
 * within `maxDepth` (1 is flat), a bounded node count, and only the three known keys kept. Throws
 * NavValidationError on any violation. Used by navSave before writing.
 */
export function validateNavTree(value: unknown, maxDepth: number): NavNode[] {
  let count = 0;

  function walk(nodes: unknown, depth: number): NavNode[] {
    if (!Array.isArray(nodes)) throw new NavValidationError('Navigation must be a list of items');
    if (depth > maxDepth) throw new NavValidationError(`Navigation is nested deeper than ${maxDepth} levels`);
    return nodes.map((raw) => {
      if (typeof raw !== 'object' || raw === null) throw new NavValidationError('Each item must be an object');
      const item = raw as Record<string, unknown>;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) throw new NavValidationError('Each item needs a label');
      if (label.length > MAX_LABEL_LENGTH) throw new NavValidationError('Label is too long (max 500 characters)');
      if (++count > MAX_NAV_NODES) throw new NavValidationError('Too many navigation items');
      const node: NavNode = { label };
      if (typeof item.url === 'string' && item.url.trim()) {
        const url = item.url.trim();
        if (url.length > MAX_URL_LENGTH) throw new NavValidationError('URL is too long (max 2048 characters)');
        if (!SAFE_URL.test(url)) throw new NavValidationError('URL must start with /, #, http(s)://, mailto:, or tel:');
        node.url = url;
      }
      if (item.children !== undefined) {
        const children = walk(item.children, depth + 1);
        if (children.length) node.children = children;
      }
      return node;
    });
  }

  return walk(value, 1);
}

/**
 * Shape of the YAML site-config file. Unknown keys are ignored so the file can grow without an
 * engine change. Read at build time by the public site.
 */
export interface SiteConfig {
  siteName: string;
  description?: string;
  author?: string;
  locale?: string;
  /** Named navigation menus, each a NavNode[] (normalized by extractMenu). */
  menus?: Record<string, unknown>;
  /**
   * The editor spellcheck settings. The dialect is declared once per site (spec 1.2), so a British
   *  site loads the British word list and "colour" reads as correct. Today only US English ships, so an
   *  unset or unknown dialect resolves to it.
   */
  spellcheck?: { dialect?: string };
  /**
   * The editor tidy (LLM copy-edit) settings. Opt-in at the site level (spec 2.8): tidy is a remote,
   *  costly model call, so the whole block is optional and `enabled` defaults false. The model is a
   *  developer-tier fact; the `conventions` block is the editor-tier per-convention config that builds
   *  the prompt's CONVENTIONS section. The Anthropic API key is a Worker secret, never config.
   */
  tidy?: TidyConfig;
  /**
   * The editor-owned tag vocabulary (spec, tag management). Each entry is a frozen slug `value` (the
   *  stored frontmatter token and the filter key) plus an editable display `label`. Global, not
   *  per-concept. Absent means the taxonomy field stays the open creatable multiselect (opt-in).
   */
  vocabulary?: VocabularyEntry[];
  [key: string]: unknown;
}

/**
 * One vocabulary entry: a frozen slug `value` and an editable display `label`. The object stays open
 * to richer fields later (descriptions, per-concept scope), so this carries only the two locked keys.
 */
export interface VocabularyEntry {
  /** The stored frontmatter token and the filter key. A lowercase hyphenated slug (SAFE_TAG_VALUE). */
  value: string;
  /** The editable display name shown in the editor and the tag-admin screen. */
  label: string;
}

/**
 * The tidy block on the site config. Every field is optional so the YAML can carry as little as
 * `tidy: { enabled: true }` and the defaults fill the rest.
 */
export interface TidyConfig {
  /** Master switch. Default false; tidy is opt-in (spec 2.8, decision 1). */
  enabled?: boolean;
  /** The model id. Default `claude-sonnet-4-6`; the alternative is `claude-haiku-4-5` (spec 2.2). */
  model?: string;
  /** The per-convention toggles that build the prompt's CONVENTIONS section. */
  conventions?: Partial<TidyConventions>;
}

/** The default tidy model when a site sets none: Sonnet, the judgment floor for a light copy-edit. */
export const DEFAULT_TIDY_MODEL = 'claude-sonnet-4-6';

/**
 * The corrected convention set (spec "The corrected convention set"), the resolved shape the prompt
 * builder consumes. Every field carries a concrete value; `resolveTidyConventions` fills the defaults
 * from a partial config. The Fixes group is the objective fixes (default on, governed by the always-on
 * core); the style tier defaults off (a falsy variant means off); the advanced tier defaults off.
 * Sentence spacing is dropped on purpose and regional spelling is `spellcheck.dialect`, not a toggle.
 */
export interface TidyConventions {
  /**
   * The objective Fixes group (spelling, grammar, doubled words, whitespace, capitals, terminal
   *  punctuation). Default on. The always-on core governs it; this toggle lets the screen turn the
   *  group off.
   */
  fixes: boolean;
  /** Oxford comma position. Off when undefined; `always` | `complex-only` (AP) | `never`. */
  oxfordComma?: 'always' | 'complex-only' | 'never';
  /**
   * Number style threshold. Off when undefined; the always-numeral exception sets (ages, dates,
   *  measurements, percentages) apply at any threshold.
   */
  numberStyle?: 'under-ten' | 'under-hundred' | 'always-numerals';
  /** Measurement notation only (never the system, never the number). Off when undefined. */
  measurements?: 'abbreviate' | 'spell-out';
  /** Percent rendering. Off when undefined; `sign` is "%", `word` is "percent". */
  percent?: 'sign' | 'word';
  /** Em-dash spacing. Off when undefined. */
  emDash?: 'spaced' | 'closed';
  /** Turn a hyphen between two numbers into an en dash. Default off. */
  enDashRanges: boolean;
  /** Ellipsis rendering. Off when undefined. */
  ellipsis?: 'single-char' | 'three-dots';
  /** Time format. Off when undefined. */
  timeFormat?: '5 PM' | '5pm' | '5 p.m.';
  /** Advanced: convert straight quotes to curly with the full apostrophe rule set. Default off. */
  smartQuotes: boolean;
  /** Advanced: correct brand and proper-noun capitalization on a curated list only. Default off. */
  brandCaps: boolean;
}

/** The resting tidy convention set: Fixes on, every style and advanced toggle off. */
export function defaultTidyConventions(): TidyConventions {
  return { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false };
}

/**
 * Resolve a partial conventions config (from the YAML) into the concrete TidyConventions the prompt
 * builder consumes. An absent field falls to its default: Fixes on, the style and advanced toggles
 * off. A multi-position toggle stays undefined (off) unless the config names a variant.
 */
export function resolveTidyConventions(partial: Partial<TidyConventions> | undefined): TidyConventions {
  const base = defaultTidyConventions();
  if (partial === undefined) return base;
  return {
    fixes: partial.fixes ?? base.fixes,
    oxfordComma: partial.oxfordComma,
    numberStyle: partial.numberStyle,
    measurements: partial.measurements,
    percent: partial.percent,
    emDash: partial.emDash,
    enDashRanges: partial.enDashRanges ?? base.enDashRanges,
    ellipsis: partial.ellipsis,
    timeFormat: partial.timeFormat,
    smartQuotes: partial.smartQuotes ?? base.smartQuotes,
    brandCaps: partial.brandCaps ?? base.brandCaps,
  };
}

// The allowed values for each multi-position style toggle, the single source the validator checks an
// untrusted settings payload against. A value outside its list is rejected, so the committed YAML can
// only ever carry a known variant the prompt builder understands.
const OXFORD_COMMA_VALUES = ['always', 'complex-only', 'never'] as const;
const NUMBER_STYLE_VALUES = ['under-ten', 'under-hundred', 'always-numerals'] as const;
const MEASUREMENTS_VALUES = ['abbreviate', 'spell-out'] as const;
const PERCENT_VALUES = ['sign', 'word'] as const;
const EM_DASH_VALUES = ['spaced', 'closed'] as const;
const ELLIPSIS_VALUES = ['single-char', 'three-dots'] as const;
const TIME_FORMAT_VALUES = ['5 PM', '5pm', '5 p.m.'] as const;

export class TidyConventionsError extends Error {
  /** A malformed settings payload maps to the same diagnostic as a malformed config. */
  readonly conditionId = 'config.site-config-invalid';

  constructor(message: string) {
    super(message);
    this.name = 'TidyConventionsError';
  }
}

/**
 * Validate and normalize an untrusted conventions object (from the settings form) into a concrete
 * TidyConventions. This input is committed to the repo, so every field is bounded to its known set:
 * a boolean toggle must be a boolean, and a multi-position toggle must be one of its listed variants
 * or absent (off). An unknown key is dropped rather than carried, so the committed block can never
 * grow a junk key. Throws TidyConventionsError on a value outside its allowed set.
 */
export function validateTidyConventions(value: unknown): TidyConventions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TidyConventionsError('Tidy conventions must be an object');
  }
  const input = value as Record<string, unknown>;

  function bool(key: string, fallback: boolean): boolean {
    const v = input[key];
    if (v === undefined) return fallback;
    if (typeof v !== 'boolean') throw new TidyConventionsError(`${key} must be true or false`);
    return v;
  }
  function variant<T extends string>(key: string, allowed: readonly T[]): T | undefined {
    const v = input[key];
    if (v === undefined || v === null || v === false) return undefined;
    if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
      throw new TidyConventionsError(`${key} must be one of ${allowed.join(', ')}`);
    }
    return v as T;
  }

  return {
    fixes: bool('fixes', true),
    oxfordComma: variant('oxfordComma', OXFORD_COMMA_VALUES),
    numberStyle: variant('numberStyle', NUMBER_STYLE_VALUES),
    measurements: variant('measurements', MEASUREMENTS_VALUES),
    percent: variant('percent', PERCENT_VALUES),
    emDash: variant('emDash', EM_DASH_VALUES),
    enDashRanges: bool('enDashRanges', false),
    ellipsis: variant('ellipsis', ELLIPSIS_VALUES),
    timeFormat: variant('timeFormat', TIME_FORMAT_VALUES),
    smartQuotes: bool('smartQuotes', false),
    brandCaps: bool('brandCaps', false),
  };
}

/** The dialect string when a site sets none: US English, the only dictionary that ships today. */
export const DEFAULT_DIALECT = 'en-US';

// The dialect-to-dictionary map. Only US English ships now; a new locale adds one entry here and one
// committed dictionary file under spellcheck-assets, and the rest of the chain (the main-thread URL
// resolution, the worker fetch) needs no change. An unknown or unset dialect falls back to the default
// rather than throwing, so a typo or a future-locale config never breaks the editor.
const DICTIONARY_BY_DIALECT: Record<string, string> = {
  'en-US': 'dictionary-en-us.txt',
};

/**
 * The dictionary asset file for a site's configured dialect, defaulting to US English. The main thread
 * resolves this filename to a real URL (the spike's out-of-bundle asset) and hands it to the Worker in
 * the `init` message; the Worker never reads config. An unknown dialect falls back to the default file.
 */
export function dictionaryFileForDialect(dialect: string | undefined): string {
  const key = dialect ?? DEFAULT_DIALECT;
  return DICTIONARY_BY_DIALECT[key] ?? DICTIONARY_BY_DIALECT[DEFAULT_DIALECT]!;
}

export class SiteConfigError extends Error {
  /** The registered diagnostic condition a malformed site config maps to (mirrors CairnError). */
  readonly conditionId = 'config.site-config-invalid';

  constructor(message: string) {
    super(message);
    this.name = 'SiteConfigError';
  }
}

/** The top-level keys the engine reads from site.config.yaml (spec 1.2, Contract v2, tag management). */
const KNOWN_TOP_LEVEL_KEYS = new Set([
  'siteName',
  'description',
  'author',
  'locale',
  'menus',
  'spellcheck',
  'tidy',
  'vocabulary',
]);

// Adapter-owned settings a site author might reach for in the YAML by mistake, each mapped to the
// message naming its correct home (`cairn.config.ts`). The `content` entry is the Contract v2
// migration guard (a leftover per-concept block would silently do nothing while the concept
// defaulted its permalink); the rest are the other CairnAdapter top-level groups, named here so the
// same boundary message teaches a developer who reaches for the wrong file for any of them.
const ADAPTER_MISPLACEMENTS: Readonly<Record<string, string>> = {
  content:
    'cairn: site config no longer carries per-concept URL policy; move permalink/datePrefix into defineConcept (Contract v2)',
  backend: 'cairn: "backend" belongs in cairn.config.ts (githubApp(...)), not site.config.yaml',
  email: 'cairn: "email" belongs in cairn.config.ts (the adapter\'s SenderConfig), not site.config.yaml',
  rendering: 'cairn: "rendering" belongs in cairn.config.ts (the adapter\'s render subsystem), not site.config.yaml',
  media: 'cairn: "media" belongs in cairn.config.ts (the adapter\'s AssetConfig), not site.config.yaml',
  editor: 'cairn: "editor" belongs in cairn.config.ts (the adapter\'s preview/nav/supportContact knobs), not site.config.yaml',
};

/** Parse the YAML site-config text into a typed object. Throws SiteConfigError on a malformed root. */
export function parseSiteConfig(raw: string): SiteConfig {
  const parsed = parseYaml(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SiteConfigError('Site config must be a YAML mapping');
  }
  const { siteName } = parsed as SiteConfig;
  if (typeof siteName !== 'string' || !siteName.trim()) {
    throw new SiteConfigError('Site config needs a siteName');
  }
  // The config boundary: every top-level key must be one the engine reads from the YAML. A key that
  // belongs on the adapter names its correct home; anything else is simply unrecognized. Fail on the
  // first offending key, mirroring the single-cause `content:` guard this generalizes.
  for (const key of Object.keys(parsed as Record<string, unknown>)) {
    if (KNOWN_TOP_LEVEL_KEYS.has(key)) continue;
    const misplacement = ADAPTER_MISPLACEMENTS[key];
    if (misplacement !== undefined) throw new SiteConfigError(misplacement);
    throw new SiteConfigError(
      `cairn: site config has an unrecognized key "${key}"; known keys are ${[...KNOWN_TOP_LEVEL_KEYS].join(', ')}`,
    );
  }
  return parsed as SiteConfig;
}

/** Extract one named menu from a parsed config and validate it. Returns [] when the menu is absent. */
export function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[] {
  const menu = config.menus?.[name];
  if (menu === undefined) return [];
  return validateNavTree(menu, maxDepth);
}

/**
 * Replace one named menu in the YAML site-config text and reserialize, preserving every other
 * top-level key (siteName, other menus, settings). Parses into a Document so the rest of the file
 * round-trips. YAML comments are not preserved (an accepted trade); data keys are. A leaf node
 * serializes without `url`/`children` keys.
 */
export function setMenu(raw: string, name: string, tree: NavNode[]): string {
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
  doc.setIn(['menus', name], tree);
  return doc.toString();
}

/**
 * Write the editor-tier tidy conventions into the YAML site-config text and reserialize, preserving
 * every other top-level key and the file's comments and key order (parseDocument round-trips both,
 * the same machinery setMenu uses). Only the `tidy.conventions` block is touched: the developer-tier
 * `tidy.enabled` and `tidy.model` are read-only in the screen, so this leaves them as they are and a
 * save can never silently flip the deploy-time facts. A convention whose value is undefined (a
 * collapsed multi-position toggle, off) is dropped, so the committed block carries only the on
 * toggles, the same shape `resolveTidyConventions` fills the defaults back from on read.
 */
export function setTidy(raw: string, conventions: Partial<TidyConventions>): string {
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
  // Drop undefined-valued keys (a collapsed multi-position toggle) so the committed YAML carries only
  // the enabled conventions; the resolver fills the rest back from defaults on read.
  const block: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(conventions)) {
    if (value !== undefined) block[key] = value;
  }
  doc.setIn(['tidy', 'conventions'], block);
  return doc.toString();
}

/**
 * Validate and normalize an untrusted value into a VocabularyEntry[]: an array only, each element an
 * object with a non-empty string `label` and a non-empty string `value` matching SAFE_TAG_VALUE, no
 * duplicate `value`. Returns the entries in input order. Throws SiteConfigError on any violation. The
 * committed config is the input, so a malformed vocabulary fails the build the same as a bad menu.
 */
export function validateVocabulary(value: unknown): VocabularyEntry[] {
  if (!Array.isArray(value)) throw new SiteConfigError('Vocabulary must be a list of entries');
  const seen = new Set<string>();
  return value.map((raw) => {
    if (typeof raw !== 'object' || raw === null) throw new SiteConfigError('Each vocabulary entry must be an object');
    const entry = raw as Record<string, unknown>;
    if (typeof entry.label !== 'string' || !entry.label.trim()) {
      throw new SiteConfigError('Each vocabulary entry needs a non-empty label');
    }
    if (typeof entry.value !== 'string' || !SAFE_TAG_VALUE.test(entry.value)) {
      throw new SiteConfigError('Each vocabulary value must be a lowercase hyphenated slug (a-z, 0-9)');
    }
    if (seen.has(entry.value)) throw new SiteConfigError(`Duplicate vocabulary value: ${entry.value}`);
    seen.add(entry.value);
    return { value: entry.value, label: entry.label };
  });
}

/** Extract the tag vocabulary from a parsed config and validate it. Returns [] when the key is absent. */
export function extractVocabulary(config: SiteConfig): VocabularyEntry[] {
  return config.vocabulary === undefined ? [] : validateVocabulary(config.vocabulary);
}

/**
 * Replace the tag vocabulary in the YAML site-config text and reserialize, preserving every other
 * top-level key and the file's comments and key order (parseDocument round-trips both, the same
 * machinery setMenu and setTidy use). Each entry serializes to just `value` and `label`.
 */
export function setVocabulary(raw: string, vocab: VocabularyEntry[]): string {
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
  doc.setIn(['vocabulary'], vocab.map((v) => ({ value: v.value, label: v.label })));
  return doc.toString();
}
