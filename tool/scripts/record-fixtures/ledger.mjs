// The run's ledger: a 0600 file outside the repository. An entry is written before the create it
// names, so a crash between the two still leaves the sweep something to find. Every write goes to
// a temporary file renamed over the ledger, so a crash mid-write never leaves half a ledger.
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAME_SUFFIX, resourceName } from './guards.mjs';
import { makePrivateDir } from './recorder.mjs';

/**
 * @typedef {object} LedgerEntry
 * @property {keyof typeof NAME_SUFFIX} kind what the entry names
 * @property {string} name the resource name, `cairn-rec-<run id>-<suffix>`
 * @property {string} [accountId] the Cloudflare account, for the kinds that live in one
 * @property {string} [id] the provider's id once the create answered: a token id, or a GitHub App id
 * @property {string} [slug] a GitHub App's slug once its manifest converted
 */

const SHAPES = /** @type {const} */ ({ accountId: /^[0-9a-f]{32}$/, id: /^(?:[0-9a-f]{32}|\d+)$/, slug: /^[a-z0-9][a-z0-9-]*$/ });

/**
 * @param {string} dir the ledger directory
 * @param {string} runId the run
 * @returns {string} the ledger file
 */
export function ledgerPath(dir, runId) {
  return join(dir, `${runId}.json`);
}

/**
 * Throw unless an entry names one of this run's resources in the shape the run writes.
 * @param {unknown} entry the entry
 * @param {string} runId the run
 * @returns {LedgerEntry}
 */
function checkEntry(entry, runId) {
  const value = /** @type {Record<string, unknown>} */ (entry ?? {});
  const kind = /** @type {keyof typeof NAME_SUFFIX} */ (value.kind);
  if (!Object.hasOwn(NAME_SUFFIX, kind) || value.name !== resourceName(runId, kind)) {
    throw new Error(`The run ${runId} ledger carries an entry that names no resource of this run.`);
  }
  for (const [field, shape] of Object.entries(SHAPES)) {
    if (value[field] !== undefined && (typeof value[field] !== 'string' || !shape.test(value[field]))) {
      throw new Error(`The run ${runId} ledger's ${kind} entry carries a malformed ${field}.`);
    }
  }
  // The sweep deletes an App by its slug, so a slug other than the run's own name is never trusted.
  if (value.slug !== undefined && (kind !== 'github-app' || value.slug !== value.name)) {
    throw new Error(`The run ${runId} ledger's ${kind} entry carries a slug that is not its own name.`);
  }
  return /** @type {LedgerEntry} */ (value);
}

/**
 * Open a run's ledger, creating it empty when absent.
 * @param {string} dir the ledger directory
 * @param {string} runId the run
 * @returns {{ add: (entry: LedgerEntry) => void, update: (kind: LedgerEntry['kind'], fields: Partial<LedgerEntry>) => void, entries: () => LedgerEntry[] }}
 */
export function openLedger(dir, runId) {
  makePrivateDir(dir);
  const file = ledgerPath(dir, runId);
  /** @type {LedgerEntry[]} */
  const list = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).map((/** @type {unknown} */ entry) => checkEntry(entry, runId)) : [];
  const save = () => {
    const temporary = `${file}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(list, null, 2), { mode: 0o600 });
    chmodSync(temporary, 0o600);
    renameSync(temporary, file);
  };
  save();
  return {
    add(entry) {
      list.push(checkEntry(entry, runId));
      save();
    },
    update(kind, fields) {
      const entry = list.find((candidate) => candidate.kind === kind);
      if (!entry) throw new Error(`The run ${runId} ledger has no ${kind} entry to update.`);
      checkEntry({ ...entry, ...fields }, runId);
      Object.assign(entry, fields);
      save();
    },
    entries: () => [...list],
  };
}
