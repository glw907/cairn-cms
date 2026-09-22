// cairn-media-seed's own tolerant wrangler-config reader, narrowed to the one fact this tool
// needs: the declared r2_buckets entries. This module imports nothing outside media-seed, so
// this tool keeps no dependency on any other engine subsystem's own config reader. The read
// stays a line-anchored shallow scan, not a TOML parser, and jsonc wins silently when both
// wrangler files exist; a Go port of this same logic exists, and a change here would diverge
// the two.
/**
 * One declared `r2_buckets` entry: the Worker binding name and, when declared, the bucket's
 *  real name. `resolveBucket` (assemble.ts) reads this to find the bucket the `wrangler r2`
 *  upload should target.
 */
export interface R2BucketEntry {
  binding: string;
  bucketName?: string;
}

/**
 * Read the site's declared `r2_buckets` entries, binding plus `bucket_name`, from
 *  wrangler.jsonc (preferred when both exist) or wrangler.toml in the site's working directory.
 *  Returns null when neither file exists, which the bin reports as "no r2_buckets declared";
 *  throws a clean message if a present `wrangler.jsonc` fails to parse.
 */
export async function readR2Buckets(
  readFile: (relPath: string) => Promise<string | null>
): Promise<R2BucketEntry[] | null> {
  const jsonc = await readFile('wrangler.jsonc');
  if (jsonc !== null) return r2EntriesFromJsonc(jsonc);
  const toml = await readFile('wrangler.toml');
  if (toml !== null) return r2EntriesFromToml(toml);
  return null;
}

// Parse a wrangler.jsonc body, stripping comments first. V8's SyntaxError embeds a source
// snippet, which would land verbatim in the report; a file that exists but does not parse
// fails with this clean message instead.
function parseJsonc(text: string): Record<string, unknown> {
  try {
    return JSON.parse(stripJsonc(text)) as Record<string, unknown>;
  } catch {
    throw new Error('wrangler.jsonc did not parse');
  }
}

function r2EntriesFromJsonc(text: string): R2BucketEntry[] {
  const config = parseJsonc(text);
  const r2 = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
  return r2
    .filter(
      (entry): entry is { binding: string; bucket_name?: unknown } =>
        typeof entry === 'object' && entry !== null && typeof entry.binding === 'string'
    )
    .map((entry) => ({
      binding: entry.binding,
      bucketName: typeof entry.bucket_name === 'string' ? entry.bucket_name : undefined,
    }));
}

function r2EntriesFromToml(text: string): R2BucketEntry[] {
  const entries: R2BucketEntry[] = [];
  let section = '';
  let binding: string | undefined;
  let bucketName: string | undefined;

  const flush = () => {
    if (binding !== undefined) entries.push({ binding, bucketName });
    binding = undefined;
    bucketName = undefined;
  };

  for (const line of text.split('\n')) {
    const header = line.match(/^\s*(\[\[?[\w.]+\]?\])\s*(?:#.*)?$/);
    if (header) {
      flush();
      section = header[1];
      continue;
    }
    const kv = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const str = value.match(/^["'](.*)["']/)?.[1];
    if (section === '[[r2_buckets]]') {
      if (key === 'binding' && str !== undefined) binding = str;
      if (key === 'bucket_name' && str !== undefined) bucketName = str;
    }
  }
  flush();
  return entries;
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
