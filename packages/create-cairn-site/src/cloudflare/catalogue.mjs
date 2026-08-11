// The Cloudflare chapter's error catalogue. A run that hits one of these recoverable failures
// should never surface a raw fetch error or stack trace: it prints through cloudflareError,
// which names what happened, what it means, and the one concrete command the admin should run
// next.

/**
 * @typedef {'wait' | 'act' | 'ask-someone'} ErrorKind
 */

/**
 * @typedef {object} ChapterErrorInfo
 * @property {string} code the catalogue code that produced this error
 * @property {ErrorKind} kind decides the exit code: 'wait' means nothing is wrong and something
 *  just takes time, so the caller returns this row and exits 0; 'act' means the admin does
 *  something themselves and re-runs, thrown and exits 1; 'ask-someone' means another person
 *  must act first, thrown and exits 1
 * @property {string} next the concrete next command or action, with the leading "Next:" label
 *  stripped
 */

/**
 * How many trailing stderr lines a `detail` param carries. The full stderr of a failed `npm
 * install` can run to hundreds of lines; the admin needs the lines that name the actual failure,
 * not the whole scroll.
 */
const DETAIL_MAX_LINES = 8;

/**
 * Reduce a child's stderr to its last few non-empty lines, the form every row's `detail` param
 * takes. Lives here, beside the rows that print it, so the chapter's four failing-child callers
 * (deploy, migrations, secret put, seed) all shape their detail identically.
 * @param {string} stderr the child's captured stderr
 * @returns {string} the trailing non-empty lines, joined back with newlines; '' when stderr held
 *  nothing but whitespace
 */
export function trailingStderr(stderr) {
  const lines = stderr
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  return lines.slice(-DETAIL_MAX_LINES).join('\n');
}

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
        `Next: run npm install in ${params.dir}, then re-run npx create-cairn-site --dir ${params.dir}.`
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
      if (params.reason === 'not-allowlisted') {
        return (
          `The site deployed, but ${params.email} was not granted a sign-in: this site's ` +
          'allowlist already carries at least one editor, and that address is not on it, so no ' +
          'owner row and no sign-in link were written.\n' +
          `Next: add ${params.email} to the allowlist (through the admin, signed in as an ` +
          'existing editor, or with wrangler d1 execute), then re-run npx create-cairn-site ' +
          `--dir ${params.dir} --sign-in.`
        );
      }
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
  },
  'account-ambiguous': {
    kind: 'act',
    build(params) {
      return (
        'The Cloudflare sign-in found more than one account on it, and this run is not ' +
        'interactive, so it cannot ask which one to use. Nothing was changed, and this run has ' +
        'saved its progress.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} without --yes, so the tool can ` +
        'ask which account to use.'
      );
    }
  },
  'account-lookup-failed': {
    kind: 'act',
    build(params) {
      return (
        'The tool is signed in to Cloudflare, but it could not read the list of accounts on that ' +
        'login. wrangler answered without the account list this step needs, which usually means ' +
        'a wrangler version behaving differently than expected. Your site is untouched and still ' +
        'working.\n' +
        `Next: run npx wrangler whoami --json in ${params.dir} to see what it prints, then ` +
        `re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'token-invalid': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'The Cloudflare API token you pasted was not accepted. Cloudflare reported:\n' +
          `${params.detail}\n` +
          'Your site is untouched and still working.\n' +
          `Next: re-run npx create-cairn-site --dir ${params.dir} and paste a new token when asked.`
        );
      }
      return (
        'The Cloudflare API token you pasted was not accepted. It may be mistyped, expired, or ' +
        'revoked.\n' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} and paste a new token when asked.`
      );
    }
  },
  'token-scope-missing': {
    kind: 'act',
    build(params) {
      if (params.permission) {
        return (
          'The Cloudflare API token you pasted works, but it is missing one permission: ' +
          `${params.permission}. Your site is untouched and still working.\n` +
          'Next: create a new token with that permission included, then re-run npx ' +
          `create-cairn-site --dir ${params.dir} and paste it in.`
        );
      }
      return (
        'The Cloudflare API token you pasted works, but it is missing a permission this step ' +
        'needs. Your site is untouched and still working.\n' +
        'Next: create a new token with the full permission set the tool asked for, then re-run ' +
        `npx create-cairn-site --dir ${params.dir} and paste it in.`
      );
    }
  },
  'zone-already-exists': {
    kind: 'act',
    build(params) {
      return (
        `The domain ${params.domain} is already set up as a Cloudflare zone, so this tool could ` +
        'not create it again. Your site is untouched and still working.\n' +
        `Next: check https://dash.cloudflare.com for a zone named ${params.domain}. If it is on ` +
        'your own account, remove it there first. If it belongs to someone else, an agency or a ' +
        `previous developer, ask them to remove it. Then re-run npx create-cairn-site --dir ` +
        `${params.dir}.`
      );
    }
  },
  'zone-create-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Creating the Cloudflare zone for your domain did not finish. Cloudflare reported:\n' +
          `${params.detail}\n` +
          'Your site is untouched and still working.\n' +
          'Next: fix what Cloudflare reported above, then re-run npx create-cairn-site --dir ' +
          `${params.dir}.`
        );
      }
      return (
        'Creating the Cloudflare zone for your domain did not finish.\n' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'records-read-failed': {
    kind: 'act',
    build(params) {
      return (
        "Looking up your domain's current DNS records did not finish. The lookup itself " +
        'failed, so the tool cannot tell what records your domain has and will not guess. ' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'dns-record-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Copying your DNS records into the new Cloudflare zone did not finish. Cloudflare ' +
          `reported:\n${params.detail}\n` +
          'Some records may have been copied and others not, so the new zone is incomplete. ' +
          'Your site is untouched and still working.\n' +
          'Next: fix what Cloudflare reported above, then re-run npx create-cairn-site --dir ' +
          `${params.dir}; the tool shows you the records again before it writes anything.`
        );
      }
      return (
        'Copying your DNS records into the new Cloudflare zone did not finish.\n' +
        'Some records may have been copied and others not, so the new zone is incomplete. ' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}; the tool shows you the records ` +
        'again before it writes anything.'
      );
    }
  },
  'carry-over-declined': {
    kind: 'act',
    build(params) {
      return (
        "You chose not to copy your domain's existing DNS records into the new Cloudflare " +
        'zone. That choice is recorded, and your site is untouched and still working.\n' +
        `Next: if you change your mind, re-run npx create-cairn-site --dir ${params.dir} before ` +
        'the domain switches over, and the tool will offer to copy them again.'
      );
    }
  },
  'delegation-pending': {
    kind: 'wait',
    build(params) {
      const pair = params.nameServers.join(' and ');
      return (
        `Your domain ${params.domain} still points at its old nameservers, so the switch to ` +
        'Cloudflare has not happened yet. This is normal: it happens after you change the ' +
        "nameservers at your domain's registrar, and can take anywhere from a few minutes to " +
        '48 hours. Your site is untouched and still working.\n' +
        `Next: once you have set ${params.domain}'s nameservers to ${pair} at your registrar, ` +
        `re-run npx create-cairn-site --dir ${params.dir} to check again.`
      );
    }
  },
  'delegation-wrong-nameservers': {
    kind: 'act',
    build(params) {
      const assigned = params.nameServers.join(' and ');
      const found = params.actual.join(' and ');
      return (
        `Your domain ${params.domain} is delegated to Cloudflare, but not to this account. ` +
        `This account's nameservers are ${assigned}, and ${params.domain} currently points at ` +
        `${found} instead. A Cloudflare account is assigned one nameserver pair, shared by ` +
        'every domain on it, so this means the domain is set up under a different Cloudflare ' +
        "account (perhaps an agency's or a previous developer's), not that the nameservers " +
        'were mistyped. Your site is untouched and still working.\n' +
        `Next: ask whoever controls that account to remove ${params.domain} from it, then ` +
        `re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'hostname-propagating': {
    kind: 'wait',
    build(params) {
      return (
        'Your domain now resolves, but the new certificate or DNS record has not finished ' +
        'propagating yet. This is a normal step, and usually finishes within a few minutes to ' +
        'a few hours. Your site keeps answering on its workers.dev address the whole time.\n' +
        `Next: wait a bit, then re-run npx create-cairn-site --dir ${params.dir} to check again.`
      );
    }
  },
  'hostname-not-serving': {
    kind: 'act',
    build(params) {
      return (
        `Your domain ${params.domain} resolves and answers, but what answers is not your ` +
        'site. It may be a parked page or an older site still using that address. Your site ' +
        'itself is untouched and still working on its workers.dev address.\n' +
        `Next: check what is set up at ${params.domain} (a leftover DNS record, or the wrong ` +
        `Cloudflare zone), fix it, then re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'custom-domain-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Attaching your site to your domain did not finish. Cloudflare reported:\n' +
          `${params.detail}\n` +
          'Your site is untouched and still working on its workers.dev address.\n' +
          'Next: fix what Cloudflare reported above, then re-run npx create-cairn-site --dir ' +
          `${params.dir}.`
        );
      }
      return (
        'Attaching your site to your domain did not finish.\n' +
        'Your site is untouched and still working on its workers.dev address.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'cutover-deploy-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Redeploying your site after pointing it at your domain did not finish. wrangler ' +
          'reported:\n' +
          `${params.detail}\n` +
          "The tool already restored your site's address on disk back to its workers.dev one, " +
          'so your site is still working there and nothing is half-changed.\n' +
          `Next: fix what wrangler reported above, then re-run npx create-cairn-site --dir ` +
          `${params.dir}.`
        );
      }
      return (
        'Redeploying your site after pointing it at your domain did not finish.\n' +
        "The tool already restored your site's address on disk back to its workers.dev one, " +
        'so your site is still working there and nothing is half-changed.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  }
};

/**
 * Every code the catalogue has a row for, so a test suite can assert coverage against the
 * module itself rather than a copy of the list that can drift.
 * @type {string[]}
 */
export const CATALOGUE_CODES = Object.keys(ROWS);

/**
 * Build a printable, catalogued error for one of the Cloudflare chapter's recoverable failures.
 * @param {string} code one of the catalogue's codes: wrangler-unavailable, login-abandoned,
 *  install-failed, build-failed, deploy-failed, subdomain-unregistered, migrations-failed,
 *  secret-put-failed, seed-failed, account-ambiguous, account-lookup-failed, token-invalid, token-scope-missing,
 *  zone-already-exists, zone-create-failed, records-read-failed, dns-record-failed,
 *  carry-over-declined,
 *  delegation-pending, delegation-wrong-nameservers, hostname-propagating, hostname-not-serving,
 *  custom-domain-failed, or cutover-deploy-failed
 * @param {Record<string, string | string[]>} [params] the values to interpolate into the row's
 *  message; which keys are required depends on `code` (for example `dir` on every row, `detail`
 *  on the rows that carry child or API output, `database` on migrations-failed, `reason` and
 *  `email` on seed-failed's not-allowlisted case, `permission` on token-scope-missing, `domain`
 *  on the domain and hostname rows, and `nameServers`/`actual`, both string arrays, on the
 *  delegation rows)
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
