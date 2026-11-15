// A small S3 client for one R2 bucket: the five calls the catalog's publish run makes, each signed
// with aws4fetch and sent through a fetch the caller passes in, so a test hands it a fake bucket.
// Each reply is read as R2 answers it: a missing key is 404 with the code NoSuchKey; a create-only
// put on an existing key is 412 PreconditionFailed, or 409 ObjectLockedByBucketPolicy where a lock
// rule holds the key; and DeleteObjects answers 200 even when it refuses a key, naming the refusal
// in its body.
import { createHash } from 'node:crypto';
import { AwsClient } from 'aws4fetch';

/** The most keys one DeleteObjects request may name. */
const DELETE_BATCH = 1000;

/** An S3 reply the client does not accept, with its status and S3 error code. */
export class R2Error extends Error {
  /**
   * @param {string} message
   * @param {{ status: number, code?: string, key?: string }} details
   */
  constructor(message, { status, code, key }) {
    super(message);
    this.name = 'R2Error';
    this.status = status;
    this.code = code;
    this.key = key;
  }
}

/** @param {string} text */
const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** @param {string} text */
const unescapeXml = (text) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/**
 * The text of the first element of a name in an XML fragment, unescaped.
 * @param {string} xml
 * @param {string} name
 * @returns {string | undefined}
 */
const element = (xml, name) => {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return match ? unescapeXml(match[1]) : undefined;
};

/**
 * A client bound to one bucket.
 * @param {object} options
 * @param {string} options.accountId the Cloudflare account that holds the bucket
 * @param {string} options.bucket
 * @param {string} options.accessKeyId an R2 API token's access key id
 * @param {string} options.secretAccessKey that token's secret
 * @param {typeof globalThis.fetch} [options.fetch] where the signed requests go
 */
export function createR2({ accountId, bucket, accessKeyId, secretAccessKey, fetch = globalThis.fetch }) {
  for (const [name, value] of Object.entries({ accountId, bucket, accessKeyId, secretAccessKey })) {
    if (!value) throw new Error(`r2: ${name} is required`);
  }
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  const base = `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}`;
  const keyUrl = (key) => `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;

  /**
   * Sign and send one request.
   * @param {string} url
   * @param {RequestInit} init
   */
  async function send(url, init) {
    return fetch(await aws.sign(url, init));
  }

  /**
   * An error for a reply the caller did not expect, carrying R2's code and message.
   * @param {string} what the call and its key, for the message
   * @param {Response} response
   * @param {string} [key]
   */
  async function refusal(what, response, key) {
    const body = await response.text();
    const code = element(body, 'Code');
    const message = element(body, 'Message');
    return new R2Error(`r2: ${what} answered ${response.status}${code ? ` ${code}` : ''}${message ? `: ${message}` : ''}`, {
      status: response.status,
      code,
      key,
    });
  }

  return {
    bucket,

    /**
     * Read an object.
     * @param {string} key
     * @returns {Promise<{ bytes: Buffer, contentType: string | null, cacheControl: string | null, etag: string | null } | null>}
     *   the object, or `null` when R2 answers that the key does not exist
     * @throws {R2Error} on any other reply, a 404 for another reason included
     */
    async get(key) {
      const response = await send(keyUrl(key), { method: 'GET' });
      if (response.status === 200) {
        return {
          bytes: Buffer.from(await response.arrayBuffer()),
          contentType: response.headers.get('content-type'),
          cacheControl: response.headers.get('cache-control'),
          etag: response.headers.get('etag'),
        };
      }
      const error = await refusal(`GetObject ${key}`, response, key);
      if (error.status === 404 && error.code === 'NoSuchKey') return null;
      throw error;
    },

    /**
     * Write an object only when its key is free, with `If-None-Match: *`.
     * @param {string} key
     * @param {Buffer} bytes
     * @param {{ cacheControl: string, contentType: string }} headers
     * @returns {Promise<'created' | 'exists'>} `exists` when R2 refused because the key holds an
     *   object, by the precondition (412) or by a lock rule (409)
     * @throws {R2Error} on any other refusal
     */
    async putIfAbsent(key, bytes, { cacheControl, contentType }) {
      const response = await send(keyUrl(key), {
        method: 'PUT',
        body: bytes,
        headers: { 'If-None-Match': '*', 'Cache-Control': cacheControl, 'Content-Type': contentType },
      });
      if (response.ok) {
        await response.arrayBuffer();
        return 'created';
      }
      const error = await refusal(`PutObject ${key}`, response, key);
      if ((error.status === 412 && error.code === 'PreconditionFailed') || (error.status === 409 && error.code === 'ObjectLockedByBucketPolicy')) {
        return 'exists';
      }
      throw error;
    },

    /**
     * Write an object, replacing any at its key.
     * @param {string} key
     * @param {Buffer} bytes
     * @param {{ cacheControl: string, contentType: string }} headers
     * @throws {R2Error} on any refusal
     */
    async put(key, bytes, { cacheControl, contentType }) {
      const response = await send(keyUrl(key), {
        method: 'PUT',
        body: bytes,
        headers: { 'Cache-Control': cacheControl, 'Content-Type': contentType },
      });
      if (!response.ok) throw await refusal(`PutObject ${key}`, response, key);
      await response.arrayBuffer();
    },

    /**
     * Every key in the bucket under a prefix, across as many pages as the list takes.
     * @param {string} [prefix]
     * @returns {Promise<string[]>}
     */
    async list(prefix = '') {
      const keys = [];
      let token;
      do {
        const query = new URLSearchParams({ 'list-type': '2' });
        if (prefix) query.set('prefix', prefix);
        if (token) query.set('continuation-token', token);
        const response = await send(`${base}?${query}`, { method: 'GET' });
        if (!response.ok) throw await refusal(`ListObjectsV2 ${prefix || '(whole bucket)'}`, response);
        const body = await response.text();
        for (const contents of body.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) keys.push(element(contents[1], 'Key'));
        token = element(body, 'IsTruncated') === 'true' ? element(body, 'NextContinuationToken') : undefined;
        if (element(body, 'IsTruncated') === 'true' && !token) throw new Error('r2: a truncated list carried no continuation token');
      } while (token);
      return keys;
    },

    /**
     * Delete keys in batches. R2 answers 200 to a batch that refused a key, so the body decides.
     * @param {string[]} keys
     * @throws {R2Error} naming the first key a batch refused, after the batch's other deletes landed
     */
    async deleteAll(keys) {
      for (let i = 0; i < keys.length; i += DELETE_BATCH) {
        const batch = keys.slice(i, i + DELETE_BATCH);
        const objects = batch.map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`).join('');
        const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>false</Quiet>${objects}</Delete>`;
        const response = await send(`${base}?delete`, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/xml', 'Content-MD5': createHash('md5').update(body).digest('base64') },
        });
        if (!response.ok) throw await refusal('DeleteObjects', response);
        const reply = await response.text();
        const refused = /<Error>([\s\S]*?)<\/Error>/.exec(reply);
        if (refused) {
          const key = element(refused[1], 'Key');
          const code = element(refused[1], 'Code');
          throw new R2Error(`r2: DeleteObjects refused ${key}: ${code} ${element(refused[1], 'Message') ?? ''}`.trim(), { status: response.status, code, key });
        }
      }
    },
  };
}
