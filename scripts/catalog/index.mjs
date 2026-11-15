// The catalog index generator: a pure function from the previous index, the new release records,
// and the kinds data to the next index. It reads no file and writes none, so the publish job owns
// every effect and this stays testable against fixtures.
import semver from 'semver';

/** The catalog schema's `format`. */
const FORMAT = 1;
const SCHEMA_URL = 'https://cairn.pub/schemas/cairn-catalog/1.json';

/**
 * A theme release record: a theme's manifest plus the facts only the publish job knows.
 * @typedef {object} ThemeRecord
 * @property {Record<string, any>} theme The release's `cairn-theme.json`.
 * @property {string} date Release date, `YYYY-MM-DD`.
 * @property {string} url Absolute address of the archive.
 * @property {string} integrity The archive's `sha512-` digest.
 * @property {number} size The archive's size in bytes.
 * @property {string} demo Absolute address of the hosted demo.
 * @property {{url: string, width: number, height: number}} card The grid image.
 * @property {{url: string, shows: string, width: number, height: number}[]} screenshots Hosted screenshots, the card's source first.
 */

/**
 * A set release record: a set's manifest plus the facts only the publish job knows.
 * @typedef {object} SetRecord
 * @property {Record<string, any>} set The release's `cairn-set.json`.
 * @property {string} date Release date, `YYYY-MM-DD`.
 * @property {string} url Absolute address of the archive.
 * @property {string} integrity The archive's `sha512-` digest.
 * @property {number} size The archive's size in bytes.
 */

/** @param {string} a @param {string} b newest first */
const newestFirst = (a, b) => semver.rcompare(a, b, { loose: false });

/**
 * Adds a release to a list of releases, newest first. Refuses a version already listed, because a
 * release path is written once.
 * @param {Record<string, any>[]} releases
 * @param {Record<string, any>} release
 * @param {string} what Names the owner of the list in the error.
 */
function addRelease(releases, release, what) {
  if (releases.some((r) => r.version === release.version)) {
    throw new Error(`catalog index: ${what} already has a release ${release.version}; a release is written once`);
  }
  releases.push(release);
  releases.sort((a, b) => newestFirst(a.version, b.version));
}

/**
 * Turns a theme record into its entry in a theme's `releases`.
 * @param {ThemeRecord} record
 */
function themeRelease(record) {
  const m = record.theme;
  const release = {
    version: m.version,
    date: record.date,
    notes: m.notes,
    engine: m.engine,
    contract: m.contract,
    url: record.url,
    integrity: record.integrity,
    size: record.size,
    colorModes: m.colorModes,
    options: m.options,
    screenshots: record.screenshots,
  };
  if (m.fonts !== undefined) release.fonts = m.fonts;
  return release;
}

/**
 * Builds the next index.
 *
 * A theme's top-level fields come from its newest release's manifest, and an older release added
 * later leaves them alone. `releases` is newest first by SemVer precedence. A kind is listed only
 * when a set for it has a release. Fields the previous index holds that this function does not
 * know survive, because a later format may add them.
 *
 * @param {object} input
 * @param {Record<string, any> | null} input.previous The index now published, or `null` for the first.
 * @param {(ThemeRecord | SetRecord)[]} input.releases The releases this run adds.
 * @param {{id: string, label: string, description: string}[]} input.kinds The kinds data, in display order.
 * @param {string} input.now The `generated` time, in UTC.
 * @returns {Record<string, any>} A new object; no input is changed.
 * @throws When a release repeats a version, names a kind the kinds data lacks, or lacks a theme's
 * `demo`, `card`, or `screenshots`.
 */
export function buildIndex({ previous, releases, kinds, now }) {
  const next = structuredClone(previous ?? {});
  next.$schema = SCHEMA_URL;
  next.format = FORMAT;
  next.generated = now;
  const themes = (next.themes ??= []);
  const sets = (next.sets ??= []);
  const known = new Set(kinds.map((k) => k.id));

  for (const record of structuredClone(releases)) {
    if ('set' in record) {
      const { kind, version, engine, notes } = record.set;
      if (!known.has(kind)) throw new Error(`catalog index: set kind "${kind}" is not in the kinds data`);
      let set = sets.find((s) => s.kind === kind);
      if (!set) sets.push((set = { kind, releases: [] }));
      addRelease(
        set.releases,
        { version, date: record.date, notes, engine, url: record.url, integrity: record.integrity, size: record.size },
        `set "${kind}"`,
      );
      continue;
    }
    const m = record.theme;
    for (const field of ['demo', 'card', 'screenshots']) {
      if (record[field] === undefined) throw new Error(`catalog index: theme "${m.id}" ${m.version} has no ${field}`);
    }
    let theme = themes.find((t) => t.id === m.id);
    if (!theme) themes.push((theme = { id: m.id, releases: [] }));
    addRelease(theme.releases, themeRelease(record), `theme "${m.id}"`);
    if (theme.releases[0].version === m.version) {
      Object.assign(theme, {
        name: m.name,
        description: m.description,
        author: m.author,
        license: m.license,
        kinds: m.kinds,
        demo: record.demo,
        card: record.card,
      });
      for (const optional of ['summary', 'repository']) {
        if (m[optional] === undefined) delete theme[optional];
        else theme[optional] = m[optional];
      }
    }
  }

  next.kinds = kinds.filter((k) => sets.some((s) => s.kind === k.id && s.releases.length > 0));
  return next;
}
