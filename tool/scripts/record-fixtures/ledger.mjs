// The run's ledger: a 0600 file outside the repository. An entry is written before the create it
// names, so a crash between the two still leaves the sweep something to find.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {object} LedgerEntry
 * @property {'d1' | 'r2' | 'cf-token' | 'repo' | 'github-app'} kind what the entry names
 * @property {string} name the resource name, which always carries the run id
 * @property {string} [accountId] the Cloudflare account, for the kinds that live in one
 */

/**
 * @param {string} dir the ledger directory
 * @param {string} runId the run
 * @returns {string} the ledger file
 */
export function ledgerPath(dir, runId) {
  return join(dir, `${runId}.json`);
}

/**
 * Open a run's ledger, creating it empty when absent.
 * @param {string} dir the ledger directory
 * @param {string} runId the run
 * @returns {{ add: (entry: LedgerEntry) => void, entries: () => LedgerEntry[] }}
 */
export function openLedger(dir, runId) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = ledgerPath(dir, runId);
  /** @type {LedgerEntry[]} */
  const list = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const save = () => {
    writeFileSync(file, JSON.stringify(list, null, 2), { mode: 0o600 });
    chmodSync(file, 0o600);
  };
  save();
  return {
    add(entry) {
      list.push(entry);
      save();
    },
    entries: () => [...list],
  };
}
