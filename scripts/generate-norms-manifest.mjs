// cairn-cms: the norms-manifest generator. It renders the admin screens against a running server,
// extracts the computed styles of each semantic role, and derives the manifest cairn-audit ships
// and `cairn-audit norms` queries.
//
// Two rules shape the script. It NEVER starts a server: the caller runs examples/showcase's preview
// (or points BASE_URL at any cairn admin) and this drives it, so a hang against nothing is a clear
// error instead of a mystery. And Playwright is imported dynamically, the same contract rendered
// audit mode carries, so cairn takes no browser dependency for anyone who never generates.
//
// Everything that is not the browser lives in src/lib/audit/norms.ts: the role vocabulary, the band
// derivation, the provenance rules, and the three disciplines. This file renders, measures, and
// hands the raw observations over.
//
// Wired as `npm run norms:generate` (write) and `npm run norms:check` (freshness, CI/publish only).
// It is deliberately outside the `check:*` family: those scripts run `npm run package` constantly,
// and a browser render inside that hot path would add latency and flake to every gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';

/** @typedef {import('../src/lib/audit/norms.js').NormObservation} NormObservation */
/** @typedef {import('../src/lib/audit/norms.js').NormsManifest} NormsManifest */
/** @typedef {import('../src/lib/audit/norms.js').NormRole} NormRole */

const ROOT = repoRoot(import.meta.url);

/** The committed manifest, which `npm run package` copies to `dist/audit/norms-manifest.json`. */
const MANIFEST_FILE = 'src/lib/audit/norms-manifest.json';

/** The preview server address absent `BASE_URL`: examples/showcase's own `npm run preview` port. */
const DEFAULT_BASE_URL = 'http://localhost:4173';

// The admin paths rendered. Every role in the vocabulary has to appear on at least one of them, or
// the derivation refuses the run. `/admin` is deliberately absent: it renders the same office as
// `/admin/posts`, and a duplicate render would inflate every band's observation count without
// adding a single independent site.
const PAGES = [
  '/admin/posts',
  '/admin/pages',
  '/admin/vocabulary',
  '/admin/media',
  '/admin/editors',
  '/admin/login',
];

// Both themes, always, the same rule rendered audit mode follows. A structural norm should hold
// across the two; when it does not, the band widens and the widening is visible in the manifest.
const THEMES = ['cairn-admin', 'cairn-admin-dark'];

// The viewport every measurement is taken at. Pinned, because a control height, a padding, and a
// wrapped line all move with the width, and a manifest whose numbers depend on the window the
// generator happened to open is not a manifest anyone can freshness-check.
const VIEWPORT = { width: 1440, height: 900 };

// What each family measures. `computed` reads getComputedStyle; `rect` reads the border-box
// geometry, which is what a control height means; `ratio` divides two computed lengths; `authored`
// collects the AUTHORED declarations that reach the element, never the resolved value, which is how
// a palette-dependent norm stays a relationship.
const FAMILY_PROPERTIES = {
  control: [
    { name: 'height', kind: 'length', from: 'rect', axis: 'height' },
    { name: 'padding-block', kind: 'length', from: 'computed', css: 'padding-top' },
    { name: 'padding-inline', kind: 'length', from: 'computed', css: 'padding-left' },
    { name: 'padding-block-to-font-size', kind: 'ratio', from: 'ratio', css: 'padding-top', per: 'font-size' },
    { name: 'padding-inline-to-font-size', kind: 'ratio', from: 'ratio', css: 'padding-left', per: 'font-size' },
    { name: 'border-width', kind: 'length', from: 'computed', css: 'border-top-width' },
    { name: 'border-style', kind: 'keyword', from: 'text', css: 'border-top-style' },
    { name: 'border-radius', kind: 'length', from: 'computed', css: 'border-top-left-radius' },
    { name: 'font-size', kind: 'length', from: 'computed', css: 'font-size' },
    { name: 'background-color', kind: 'relationship', from: 'authored', css: ['background-color'] },
    { name: 'color', kind: 'relationship', from: 'authored', css: ['color'] },
    { name: 'border-color', kind: 'relationship', from: 'authored', css: ['border-top-color', 'border-color'] },
  ],
  // No padding here, deliberately. The card recipe states that a component composes its own
  // padding and that neither container role sets it, so a padding band for `card` would be a
  // distribution of per-screen choices dressed up as a norm.
  container: [
    { name: 'border-width', kind: 'length', from: 'computed', css: 'border-top-width' },
    { name: 'border-style', kind: 'keyword', from: 'text', css: 'border-top-style' },
    { name: 'border-radius', kind: 'length', from: 'computed', css: 'border-top-left-radius' },
    { name: 'background-color', kind: 'relationship', from: 'authored', css: ['background-color'] },
    { name: 'border-color', kind: 'relationship', from: 'authored', css: ['border-top-color', 'border-color'] },
  ],
  text: [
    { name: 'font-size', kind: 'length', from: 'computed', css: 'font-size' },
    // Leading is a keyword vocabulary, not a length band, because `normal` is a real member of it:
    // a role whose computed line-height is `normal` is a role the ruled leading never reached, and
    // recording that is the point. A length band would have to drop the observation to keep its
    // type, which is the silent narrowing this manifest exists to avoid.
    { name: 'line-height', kind: 'keyword', from: 'text', css: 'line-height' },
    { name: 'font-weight', kind: 'keyword', from: 'text', css: 'font-weight' },
    { name: 'letter-spacing', kind: 'keyword', from: 'text', css: 'letter-spacing' },
    { name: 'color', kind: 'relationship', from: 'authored', css: ['color'] },
  ],
  icon: [
    { name: 'width', kind: 'length', from: 'rect', axis: 'width' },
    { name: 'height', kind: 'length', from: 'rect', axis: 'height' },
    { name: 'color', kind: 'relationship', from: 'authored', css: ['color'] },
  ],
};

/**
 * Whether `url` answers with anything short of a server error. A 404 still means something is
 * listening, which is all this needs to know before opening a browser at it.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isReachable(url) {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * The server this run drives. Throws with the exact command to start one, since the generator
 * starts nothing itself.
 * @returns {Promise<string>}
 */
async function resolveBaseUrl() {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
  if (!(await isReachable(baseUrl))) {
    throw new Error(
      `no server answering at ${baseUrl}; start examples/showcase's preview (VITE_CAIRN_E2E=1 npm run build && CAIRN_DEV_BACKEND=1 npm run preview -- --port 4173) or set BASE_URL, then re-run`
    );
  }
  return baseUrl;
}

/**
 * Load Playwright from the caller's node_modules. cairn takes no browser dependency, so an absent
 * install is an instruction rather than a stack trace.
 * @returns {Promise<import('playwright')>}
 */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  }
}

// The in-page extractor. Playwright serializes it, so it can close over nothing and every table it
// needs arrives in `payload`. It returns raw observations; nothing here decides a band.
/**
 * @param {{ path: string, roles: { id: string, family: string, selector: string }[], families: Record<string, Record<string, unknown>[]> }} payload
 * @returns {{ role: string, property: string, kind: string, value: number | string, site: string }[]}
 */
function extractInPage(payload) {
  /** A length in px, or null when the computed value is not a length at all. */
  const asPx = (value) => {
    const match = /^(-?[\d.]+)px$/.exec(value.trim());
    return match ? Number(match[1]) : null;
  };

  // A selector list, split on the commas that are not inside parentheses, so `:is(a, b)` survives.
  const selectorParts = (selectorText) => {
    const parts = [];
    let depth = 0;
    let current = '';
    for (const char of selectorText) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter(Boolean);
  };

  // A selector part is considered only when it names something specific: a class, an id, or an
  // attribute. Element-only and universal parts are skipped, which is what keeps the framework
  // preflight (`*, ::before { border-color: ... }`) out of every role's border vocabulary.
  const isSpecific = (part) => /[.#[]/.test(part);

  // Every AUTHORED declaration of a property that reaches this element, which is the form a
  // palette-dependent norm has to be stored in. It collects the whole matching set rather than
  // resolving the cascade to one winner: specificity arithmetic in a page script is a source of
  // quiet wrong answers, and the set IS the vocabulary a role's border or fill speaks. Two known
  // edges of the heuristic: a non-matching `@supports` block is walked rather than skipped (its
  // declarations are still token-derived, so the cost is an extra expression in a band), and a
  // nested rule whose selector cannot stand alone is skipped by the `matches` guard.
  const declarationsFor = (element, cssNames) => {
    const found = [];
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.media && typeof rule.conditionText === 'string') {
          if (!window.matchMedia(rule.conditionText).matches) continue;
          visit(rule.cssRules);
          continue;
        }
        if (rule.cssRules && !rule.selectorText) {
          visit(rule.cssRules);
          continue;
        }
        if (!rule.selectorText || !rule.style) continue;
        const matched = selectorParts(rule.selectorText).some((part) => {
          if (!isSpecific(part) || part.includes('::')) return false;
          try {
            return element.matches(part);
          } catch {
            return false;
          }
        });
        if (!matched) continue;
        for (const name of cssNames) {
          const value = rule.style.getPropertyValue(name);
          if (value) found.push(value.trim());
        }
        if (rule.cssRules) visit(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      visit(rules);
    }
    for (const name of cssNames) {
      const inline = element.style.getPropertyValue(name);
      if (inline) found.push(inline.trim());
    }
    return found;
  };

  const out = [];
  for (const role of payload.roles) {
    const elements = [...document.querySelectorAll(role.selector)];
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const site = `${payload.path}#${index}`;
      const computed = window.getComputedStyle(element);
      for (const property of payload.families[role.family]) {
        const record = (value) => out.push({ role: role.id, property: property.name, kind: property.kind, value, site });
        if (property.from === 'rect') {
          record(rect[property.axis]);
        } else if (property.from === 'computed') {
          const px = asPx(computed.getPropertyValue(property.css));
          if (px === null) {
            throw new Error(
              `${role.id}/${property.name}: computed ${property.css} is ${computed.getPropertyValue(property.css)}, not a length (${site})`
            );
          }
          record(px);
        } else if (property.from === 'ratio') {
          const numerator = asPx(computed.getPropertyValue(property.css));
          const denominator = asPx(computed.getPropertyValue(property.per));
          if (numerator === null || denominator === null || denominator === 0) {
            throw new Error(`${role.id}/${property.name}: cannot ratio ${property.css} against ${property.per} (${site})`);
          }
          record(numerator / denominator);
        } else if (property.from === 'text') {
          record(computed.getPropertyValue(property.css).trim());
        } else {
          for (const declaration of declarationsFor(element, property.css)) record(declaration);
        }
      }
    });
  }
  return out;
}

/**
 * Render every page under every theme and collect the raw observations.
 * @param {string} baseUrl
 * @param {readonly NormRole[]} roles
 * @returns {Promise<NormObservation[]>}
 */
async function collectObservations(baseUrl, roles) {
  const { chromium } = await loadPlaywright();
  const payloadRoles = roles.map((role) => ({ id: role.id, family: role.family, selector: role.selector }));
  const browser = await chromium.launch();
  /** @type {NormObservation[]} */
  const observations = [];
  try {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        colorScheme: theme.endsWith('-dark') ? 'dark' : 'light',
      });
      await context.addCookies([{ name: 'cairn-admin-theme', value: theme, url: baseUrl }]);
      for (const path of PAGES) {
        const page = await context.newPage();
        const response = await page.goto(baseUrl + path, { waitUntil: 'load', timeout: 45_000 });
        if (!response || response.status() >= 400) {
          throw new Error(`${path}: rendered ${response ? response.status() : 'no response'} under ${theme}`);
        }
        // Fonts settle before anything is measured: a metric read against a fallback face is a
        // number no later run reproduces.
        await page.evaluate(() => document.fonts.ready);
        const found = await page.evaluate(extractInPage, {
          path,
          roles: payloadRoles,
          families: FAMILY_PROPERTIES,
        });
        if (found.length === 0) throw new Error(`${path}: matched no norm roles under ${theme}`);
        observations.push(...(/** @type {NormObservation[]} */ (found)));
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return observations;
}

/**
 * The manifest's on-disk form: stable key order from the derivation, two-space indent, one trailing
 * newline. A generator whose text varies run to run makes a freshness check either flaky or
 * meaningless, so the serialization is as pinned as the measurements.
 * @param {NormsManifest} manifest
 * @returns {string}
 */
export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Render, derive, and check the disciplines. Throws on any violation rather than writing a manifest
 * that launders one.
 * @returns {Promise<string>}
 */
async function generate() {
  const { buildManifest, checkManifestDisciplines, NORM_ROLES } = await import('../dist/audit/norms.js');
  const baseUrl = await resolveBaseUrl();
  const observations = await collectObservations(baseUrl, NORM_ROLES);
  const manifest = buildManifest({ pages: PAGES, themes: THEMES, observations });
  const violations = checkManifestDisciplines(manifest);
  if (violations.length > 0) {
    throw new Error(`the derived manifest violates its own disciplines:\n  ${violations.join('\n  ')}`);
  }
  return serializeManifest(manifest);
}

async function main() {
  const check = process.argv.includes('--check');
  try {
    const generated = await generate();
    const path = resolve(ROOT, MANIFEST_FILE);
    if (!check) {
      writeFileSync(path, generated);
      console.log(`wrote ${MANIFEST_FILE}`);
      return;
    }
    const committed = readFileSync(path, 'utf8');
    if (committed !== generated) {
      console.error(
        `${MANIFEST_FILE} is stale: a fresh render does not match the committed manifest. Run \`npm run norms:generate\` against the same server and commit the result.`
      );
      // Name the drift so a failing run is diagnosable from its log alone: the committed and
      // fresh lines that differ, paired by line number. Without this, a checker that fails on a
      // renderer this machine cannot reproduce gives the reader nothing to act on.
      const committedLines = committed.split('\n');
      const generatedLines = generated.split('\n');
      const max = Math.max(committedLines.length, generatedLines.length);
      let shown = 0;
      for (let i = 0; i < max && shown < 40; i += 1) {
        if (committedLines[i] !== generatedLines[i]) {
          console.error(`  line ${i + 1}: committed ${JSON.stringify(committedLines[i] ?? '<absent>')}`);
          console.error(`  line ${i + 1}: fresh     ${JSON.stringify(generatedLines[i] ?? '<absent>')}`);
          shown += 1;
        }
      }
      process.exitCode = 1;
      return;
    }
    console.log(`${MANIFEST_FILE} is fresh`);
  } catch (err) {
    console.error(`generate-norms-manifest: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
