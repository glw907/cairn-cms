// A tolerant reader for the few wrangler-config facts the local checks need. It reads
// wrangler.jsonc or wrangler.toml through the injected readFile (jsonc wins when both exist)
// and returns null when neither file is present, which the checks report as a skip.
import type { DoctorContext } from './types.js';

export interface WranglerFacts {
  /** A send_email binding named EMAIL is declared. */
  hasEmailBinding: boolean;
  /** A d1_databases binding named AUTH_DB is declared. */
  hasAuthDb: boolean;
  /** The AUTH_DB database_id, when declared; the D1 check queries it. */
  authDbId?: string;
  /** observability.enabled is true. */
  observabilityEnabled: boolean;
  /** vars.PUBLIC_ORIGIN, when declared; the public-origin check validates it. */
  publicOrigin?: string;
  /** The top-level account_id, when declared; a fallback for CLOUDFLARE_ACCOUNT_ID. */
  accountId?: string;
  /**
   * The declared r2_buckets binding names; the conditional media check matches the adapter's
   *  bucketBinding against this. Not part of the hard config.bindings check (decision 9).
   */
  r2Buckets: string[];
}

/**
 *
 */
export async function readWranglerConfig(
  readFile: DoctorContext['readFile']
): Promise<WranglerFacts | null> {
  const jsonc = await readFile('wrangler.jsonc');
  if (jsonc !== null) return factsFromJsonc(jsonc);
  const toml = await readFile('wrangler.toml');
  if (toml !== null) return factsFromToml(toml);
  return null;
}

// Strip // and /* */ comments outside string literals, character by character, so a URL
// inside a string survives. Trailing commas go by regex afterward; a string containing
// ",}" would be mangled, an accepted gap in a tolerant reader.
function stripJsonc(text: string): string {
  let out = '';
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function factsFromJsonc(text: string): WranglerFacts {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(stripJsonc(text)) as Record<string, unknown>;
  } catch {
    // V8's SyntaxError embeds a source snippet, which would land verbatim in the report;
    // a file that exists but does not parse is a fail with a clean message instead.
    throw new Error('wrangler.jsonc did not parse');
  }
  const sendEmail = Array.isArray(config.send_email) ? config.send_email : [];
  const hasEmailBinding = sendEmail.some(
    (entry) => typeof entry === 'object' && entry !== null && (entry as { name?: unknown }).name === 'EMAIL'
  );
  const databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const authDb = databases.find(
    (entry): entry is { binding: string; database_id?: unknown } =>
      typeof entry === 'object' && entry !== null && (entry as { binding?: unknown }).binding === 'AUTH_DB'
  );
  const observability = config.observability as { enabled?: unknown } | undefined;
  const r2 = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
  const r2Buckets = r2
    .map((entry) =>
      typeof entry === 'object' && entry !== null && typeof (entry as { binding?: unknown }).binding === 'string'
        ? (entry as { binding: string }).binding
        : undefined
    )
    .filter((binding): binding is string => binding !== undefined);
  const facts: WranglerFacts = {
    hasEmailBinding,
    hasAuthDb: authDb !== undefined,
    observabilityEnabled: observability?.enabled === true,
    r2Buckets,
  };
  if (typeof authDb?.database_id === 'string') facts.authDbId = authDb.database_id;
  const vars = config.vars as { PUBLIC_ORIGIN?: unknown } | undefined;
  if (typeof vars?.PUBLIC_ORIGIN === 'string') facts.publicOrigin = vars.PUBLIC_ORIGIN;
  if (typeof config.account_id === 'string') facts.accountId = config.account_id;
  return facts;
}

// The toml read is deliberately shallow: line-anchored matching for the three facts, not a
// TOML parser. The remediation tells the operator exactly what to add, so full fidelity
// buys nothing here. A table header opens a section; the relevant key lines are matched
// within it and the d1 table flushes on the next header.
function factsFromToml(text: string): WranglerFacts {
  const facts: WranglerFacts = {
    hasEmailBinding: false,
    hasAuthDb: false,
    observabilityEnabled: false,
    r2Buckets: [],
  };
  let section = '';
  let d1Binding: string | undefined;
  let d1Id: string | undefined;
  let r2Binding: string | undefined;

  const flushD1 = () => {
    if (d1Binding === 'AUTH_DB') {
      facts.hasAuthDb = true;
      if (d1Id !== undefined) facts.authDbId = d1Id;
    }
    d1Binding = undefined;
    d1Id = undefined;
  };

  const flushR2 = () => {
    if (r2Binding !== undefined) facts.r2Buckets.push(r2Binding);
    r2Binding = undefined;
  };

  for (const line of text.split('\n')) {
    const header = line.match(/^\s*(\[\[?[\w.]+\]?\])\s*(?:#.*)?$/);
    if (header) {
      flushD1();
      flushR2();
      section = header[1];
      continue;
    }
    const kv = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const str = value.match(/^["'](.*)["']/)?.[1];
    if (section === '[[send_email]]' && key === 'name' && str === 'EMAIL') {
      facts.hasEmailBinding = true;
    } else if (section === '[[d1_databases]]') {
      if (key === 'binding') d1Binding = str;
      if (key === 'database_id') d1Id = str;
    } else if (section === '[[r2_buckets]]') {
      if (key === 'binding' && str !== undefined) r2Binding = str;
    } else if (section === '[observability]' && key === 'enabled' && value.startsWith('true')) {
      facts.observabilityEnabled = true;
    } else if (section === '[vars]' && key === 'PUBLIC_ORIGIN' && str !== undefined) {
      facts.publicOrigin = str;
    } else if (section === '' && key === 'account_id' && str !== undefined) {
      facts.accountId = str;
    }
  }
  flushD1();
  flushR2();
  return facts;
}
