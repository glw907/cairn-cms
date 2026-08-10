// The Cloudflare chapter's error catalogue. A run that hits one of these nine recoverable
// failures should never surface a raw fetch error or stack trace: it prints through
// cloudflareError, which names what happened, what it means, and the one concrete command the
// admin should run next. Every row here is kind: act, since nothing in this chapter waits on a
// third party the way the GitHub chapter's org-approval row does.

/**
 * @typedef {'act'} ErrorKind
 */

/**
 * @typedef {object} ChapterErrorInfo
 * @property {string} code the catalogue code that produced this error
 * @property {ErrorKind} kind always 'act' in this catalogue
 * @property {string} next the concrete next command or action, with the leading "Next:" label
 *  stripped
 */

/**
 * Pull the text of a message's "Next:" line, with the label stripped, for `catalogue.next`.
 * @param {string} message the full printed text built by a row's `build`
 * @returns {string} the trimmed text following "Next:"
 */
function extractNext(message) {
  const line = message.split('\n').find((candidate) => candidate.startsWith('Next:'));
  return line.slice('Next:'.length).trim();
}

/**
 * The catalogue rows, keyed by code. Each `build` returns the full printed text: one or more
 * sentences naming what happened and what it means, then a line starting with "Next:" naming
 * the one command to run.
 */
const ROWS = {
  'wrangler-unavailable': {
    kind: 'act',
    build(params) {
      return (
        "The tool could not run wrangler at all, because this site's dependencies are not " +
        "installed, so its own wrangler is not on disk.\n" +
        `Next: run npm install in ${params.dir}, then re-run npx create-cairn-site --dir ${params.dir}`
      );
    }
  },
  'login-abandoned': {
    kind: 'act',
    build(params) {
      return (
        'The Cloudflare sign-in was not completed, so wrangler has no account to deploy to. ' +
        'Nothing was changed, and this run has saved its progress.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} and complete the browser sign-in ` +
        'this time.'
      );
    }
  },
  'install-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          "Installing your site's dependencies did not finish. npm reported:\n" +
          `${params.detail}\n` +
          `Next: fix what npm reported above, then re-run npx create-cairn-site --dir ${params.dir}.`
        );
      }
      return (
        "Installing your site's dependencies did not finish.\n" +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'build-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Building your site did not finish. npm reported:\n' +
          `${params.detail}\n` +
          `Next: fix what npm reported above, then re-run npx create-cairn-site --dir ${params.dir}.`
        );
      }
      return (
        'Building your site did not finish.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'deploy-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Deploying to Cloudflare did not finish. wrangler reported:\n' +
          `${params.detail}\n` +
          'Nothing on your machine was changed; a deploy that fails part-way is safe to retry.\n' +
          'Next: fix what wrangler reported above (its message names the setting or limit), then ' +
          `re-run npx create-cairn-site --dir ${params.dir}.`
        );
      }
      return (
        'Deploying to Cloudflare did not finish.\n' +
        'Nothing on your machine was changed; a deploy that fails part-way is safe to retry.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'subdomain-unregistered': {
    kind: 'act',
    build(params) {
      return (
        'Your Cloudflare account does not have its free workers.dev subdomain yet, so the site ' +
        'has nowhere to deploy.\n' +
        'Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages and accept the ' +
        'suggested workers.dev subdomain (one click, free), then re-run npx create-cairn-site ' +
        `--dir ${params.dir}.`
      );
    }
  },
  'migrations-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          `Applying database migrations to ${params.database} did not finish. wrangler ` +
          `reported:\n${params.detail}\n` +
          'The site was deployed but its database schema is incomplete.\n' +
          `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
          'will be skipped, and migrations run again.'
        );
      }
      return (
        `Applying database migrations to ${params.database} did not finish.\n` +
        'The site was deployed but its database schema is incomplete.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
        'will be skipped, and migrations run again.'
      );
    }
  },
  'secret-put-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          "Moving the App's private key to a Worker secret did not finish. wrangler reported:\n" +
          `${params.detail}\n` +
          'The key is still saved on your machine, so nothing is lost.\n' +
          `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
          'will be skipped, and the key move runs again.'
        );
      }
      return (
        "Moving the App's private key to a Worker secret did not finish.\n" +
        'The key is still saved on your machine, so nothing is lost.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
        'will be skipped, and the key move runs again.'
      );
    }
  },
  'seed-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'The site deployed, but writing your sign-in row to its database did not finish. ' +
          'wrangler reported:\n' +
          `${params.detail}\n` +
          `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
          'will be skipped, and the sign-in step starts fresh.'
        );
      }
      return (
        'The site deployed, but writing your sign-in row to its database did not finish.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}; the deploy is already done and ` +
        'will be skipped, and the sign-in step starts fresh.'
      );
    }
  }
};

/**
 * Build a printable, catalogued error for one of the Cloudflare chapter's recoverable failures.
 * @param {string} code one of the catalogue's codes: wrangler-unavailable, login-abandoned,
 *  install-failed, build-failed, deploy-failed, subdomain-unregistered, migrations-failed,
 *  secret-put-failed, or seed-failed
 * @param {Record<string, string>} [params] the values to interpolate into the row's message;
 *  which keys are required depends on `code` (for example `dir` on every row, `detail` on the
 *  rows that carry child output, `database` on migrations-failed)
 * @returns {Error & { catalogue: ChapterErrorInfo }} an Error whose message is the full printed
 *  text (ending in a "Next:" line) and whose `catalogue` property carries `{ code, kind, next }`
 */
export function cloudflareError(code, params = {}) {
  const row = ROWS[code];
  if (!row) {
    throw new Error(`cloudflareError: unknown catalogue code ${JSON.stringify(code)}`);
  }
  const message = row.build(params);
  const err = new Error(message);
  err.catalogue = { code, kind: row.kind, next: extractNext(message) };
  return err;
}
