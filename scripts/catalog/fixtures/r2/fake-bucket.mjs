// A fake R2 bucket behind a fetch function, answering S3 requests with the status, headers, and
// bodies R2 sent at pre-flight (`replies.json`). The publish tests hand its `fetch` to the real R2
// client, so the client's request shapes and reply parsing are what the tests exercise.
//
// What it models, each from a recorded reply: a create-only put on an existing key answers 412
// PreconditionFailed; under a lock rule an overwrite or a delete answers 409
// ObjectLockedByBucketPolicy, checked before the precondition; a missing key answers 404
// NoSuchKey; a list answers ListBucketResult in R2's element order; DeleteObjects answers 200 and
// carries a locked key's refusal as an `<Error>` element in the body; a request for another bucket
// answers 403 AccessDenied. Two shapes were not recorded and are marked where they are made: a list
// split across pages (its NextContinuationToken), and any reply a test injects with `fail`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The recorded replies, keyed by name. */
export const REPLIES = JSON.parse(readFileSync(new URL('./replies.json', import.meta.url), 'utf8')).replies;

const NS = 'http://s3.amazonaws.com/doc/2006-03-01/';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>';

/** @param {string} text */
const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** @param {string} text */
const unescapeXml = (text) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/**
 * A Response built from a recorded reply, with `headers` laid over the recorded ones.
 * @param {string} name a key of {@link REPLIES}
 * @param {{ headers?: Record<string, string>, body?: string | Buffer, method?: string }} [over]
 */
function recorded(name, over = {}) {
  const reply = REPLIES[name];
  const body = over.body ?? reply.body;
  const headers = { ...reply.headers, ...over.headers };
  if (typeof body === 'string' && body !== '' && !over.headers?.['content-length']) {
    headers['content-length'] = String(Buffer.byteLength(body));
  }
  const empty = over.method === 'HEAD' || reply.status === 204 || body === '' || body.length === 0;
  return new Response(empty ? null : body, { status: reply.status, headers });
}

/**
 * @typedef {object} StoredObject
 * @property {Buffer} bytes
 * @property {string} [contentType]
 * @property {string} [cacheControl]
 * @property {Date} lastModified
 */

/**
 * A fake bucket.
 * @param {object} [options]
 * @param {string} [options.name] the bucket's name; a request for any other answers 403
 * @param {string[]} [options.locked] key prefixes under a lock rule with no end date
 * @param {Record<string, string | Buffer | Partial<StoredObject> & { bytes: Buffer | string }>} [options.objects] objects present at the start
 * @param {() => Date} [options.now] the time a write records
 * @param {number} [options.pageSize] the most keys one list page holds; R2's default is 1000
 */
export function fakeBucket({ name = REPLIES['list-empty-bucket'].body.match(/<Name>(.*?)<\/Name>/)[1], locked = [], objects = {}, now = () => new Date('2026-11-14T22:52:17.701Z'), pageSize = 1000 } = {}) {
  /** @type {Map<string, StoredObject>} */
  const store = new Map();
  for (const [key, value] of Object.entries(objects)) {
    const object = typeof value === 'string' || Buffer.isBuffer(value) ? { bytes: value } : value;
    store.set(key, { lastModified: now(), ...object, bytes: Buffer.from(object.bytes) });
  }
  /** Every request, in order: its method, key, query, and the status it was answered with. */
  const requests = [];
  /** Every write the bucket accepted, in order. */
  const writes = [];
  /** Replies a test queued, each answered once to the first request it matches. */
  const injected = [];

  const isLocked = (key) => locked.some((prefix) => key.startsWith(prefix));
  const etag = (bytes) => `"${createHash('md5').update(bytes).digest('hex')}"`;

  /**
   * The ListObjectsV2 reply, in the element order R2 sent.
   * @param {URLSearchParams} query
   */
  function list(query) {
    const prefix = query.get('prefix');
    const max = Math.min(Number(query.get('max-keys') ?? 1000), pageSize);
    const after = query.get('continuation-token') ?? query.get('start-after') ?? '';
    const keys = [...store.keys()].filter((k) => (prefix === null || k.startsWith(prefix)) && k > after).sort();
    const page = keys.slice(0, max);
    const truncated = keys.length > page.length;
    const contents = page
      .map((key) => {
        const o = store.get(key);
        return `<Contents><Key>${escapeXml(key)}</Key><Size>${o.bytes.length}</Size><LastModified>${o.lastModified.toISOString()}</LastModified><ETag>${escapeXml(etag(o.bytes))}</ETag><StorageClass>STANDARD</StorageClass></Contents>`;
      })
      .join('');
    // Unrecorded: a truncated page. Its token is the last key, which the next request resumes after.
    const next = truncated ? `<NextContinuationToken>${escapeXml(page.at(-1))}</NextContinuationToken>` : '';
    const body = `${XML_HEAD}<ListBucketResult xmlns="${NS}"><Name>${escapeXml(name)}</Name>${contents}<IsTruncated>${truncated}</IsTruncated>${next}${prefix === null ? '' : `<Prefix>${escapeXml(prefix)}</Prefix>`}<MaxKeys>1000</MaxKeys><KeyCount>${page.length}</KeyCount></ListBucketResult>`;
    return recorded('list-empty-bucket', { body });
  }

  /**
   * The DeleteObjects reply: each key deleted, or refused in the body when it is locked.
   * @param {string} xml the request body
   */
  function deleteObjects(xml) {
    const keys = [...xml.matchAll(/<Key>(.*?)<\/Key>/g)].map((m) => unescapeXml(m[1]));
    const parts = keys.map((key) => {
      if (store.has(key) && isLocked(key)) {
        return `<Error><Key>${escapeXml(key)}</Key><Code>ObjectLockedByBucketPolicy</Code><Message>The object is locked by the bucket policy.</Message></Error>`;
      }
      store.delete(key);
      writes.push({ method: 'DELETE', key });
      return `<Deleted><Key>${escapeXml(key)}</Key></Deleted>`;
    });
    return recorded('delete-objects', { body: `${XML_HEAD}<DeleteResult xmlns="${NS}">${parts.join('')}</DeleteResult>` });
  }

  /**
   * Answer one request.
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async function answer(request) {
    const url = new URL(request.url);
    const [, bucket = '', ...rest] = url.pathname.split('/');
    const key = rest.map(decodeURIComponent).join('/');
    const method = request.method;
    const signed = (request.headers.get('authorization') ?? '').startsWith('AWS4-HMAC-SHA256 Credential=');
    if (!url.hostname.endsWith('.r2.cloudflarestorage.com') || !signed || decodeURIComponent(bucket) !== name) {
      return recorded('access-denied');
    }
    const at = injected.findIndex((f) => f.method === method && f.key === key);
    if (at >= 0) {
      const [{ reply }] = injected.splice(at, 1);
      return new Response(reply.body ?? null, { status: reply.status, headers: reply.headers ?? {} });
    }
    if (method === 'GET' && key === '' && url.searchParams.get('list-type') === '2') return list(url.searchParams);
    if (method === 'POST' && key === '' && url.searchParams.has('delete')) return deleteObjects(await request.text());
    const existing = store.get(key);
    if (method === 'PUT') {
      // The lock is checked before the precondition, as the recorded 409 to a create-only put shows.
      if (existing && isLocked(key)) return recorded('put-locked-if-none-match');
      if (existing && request.headers.get('if-none-match') === '*') return recorded('put-precondition-failed');
      const bytes = Buffer.from(await request.arrayBuffer());
      const object = {
        bytes,
        contentType: request.headers.get('content-type') ?? undefined,
        cacheControl: request.headers.get('cache-control') ?? undefined,
        lastModified: now(),
      };
      store.set(key, object);
      writes.push({ method: 'PUT', key, contentType: object.contentType, cacheControl: object.cacheControl, ifNoneMatch: request.headers.get('if-none-match') });
      return recorded('put-created', { headers: { etag: etag(bytes) } });
    }
    if (method === 'GET' || method === 'HEAD') {
      if (!existing) return recorded('get-missing', { method });
      const headers = {
        'content-type': existing.contentType ?? 'application/octet-stream',
        'content-length': String(existing.bytes.length),
        etag: etag(existing.bytes),
        'last-modified': existing.lastModified.toUTCString(),
      };
      if (existing.cacheControl) headers['cache-control'] = existing.cacheControl;
      return new Response(method === 'HEAD' ? null : existing.bytes, { status: 200, headers });
    }
    if (method === 'DELETE') {
      if (existing && isLocked(key)) return recorded('delete-object-locked');
      store.delete(key);
      writes.push({ method: 'DELETE', key });
      return recorded('delete-object');
    }
    throw new Error(`fake bucket: no reply for ${method} ${url.pathname}${url.search}`);
  }

  return {
    name,
    store,
    requests,
    writes,
    /**
     * The fetch a client sends its signed requests to.
     * @param {Request | string | URL} input
     * @param {RequestInit} [init]
     */
    async fetch(input, init) {
      const request = input instanceof Request && !init ? input : new Request(input, init);
      const url = new URL(request.url);
      const response = await answer(request);
      requests.push({ method: request.method, key: url.pathname.split('/').slice(2).map(decodeURIComponent).join('/'), query: url.search, status: response.status });
      return response;
    },
    /**
     * Queue an unrecorded reply for the next request matching a method and key.
     * @param {string} method
     * @param {string} key
     * @param {{ status: number, headers?: Record<string, string>, body?: string }} reply
     */
    fail(method, key, reply) {
      injected.push({ method, key, reply });
    },
  };
}
