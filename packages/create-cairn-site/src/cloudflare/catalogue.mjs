// The Cloudflare chapter's error catalogue. A run that hits one of these recoverable failures
// should never surface a raw fetch error or stack trace: it prints through cloudflareError,
// which names what happened, what it means, and the one concrete command the admin should run
// next.

/**
 * @typedef {'wait' | 'act' | 'ask-someone' | 'declined'} ErrorKind
 */

/**
 * @typedef {object} ChapterErrorInfo
 * @property {string} code the catalogue code that produced this error
 * @property {ErrorKind} kind decides the exit code: 'wait' means nothing is wrong and something
 *  just takes time, so the caller returns this row and exits 0; 'act' means the admin does
 *  something themselves and re-runs, thrown and exits 1; 'ask-someone' means another person
 *  must act first, thrown and exits 1; 'declined' means nothing is wrong, the owner chose this,
 *  so the caller returns this row and exits 0 with no re-run urgency
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
        `The domain ${params.domain} is already set up as a Cloudflare zone on an account other ` +
        'than the one this token is scoped to, so this tool could not create it or use the ' +
        'existing one. Your site is untouched and still working.\n' +
        'Next: ask whoever controls that zone, an agency or a previous developer, to remove ' +
        `${params.domain} from it. Then re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'zone-hold': {
    kind: 'ask-someone',
    build(params) {
      return (
        `The domain ${params.domain} has a protective hold on it that blocks creating a new ` +
        "zone. A hold like this is removed at the domain's CURRENT Cloudflare account, not at " +
        'your registrar, so this tool cannot clear it itself. Your site is untouched and still ' +
        'working.\n' +
        `Next: ask whoever controls ${params.domain}'s current Cloudflare account to remove the ` +
        `zone hold, then re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'domain-invalid': {
    kind: 'act',
    build(params) {
      return (
        `${params.domain} is not a valid domain name, so Cloudflare rejected it. Your site is ` +
        'untouched and still working.\n' +
        'Next: check the spelling of the domain, then re-run npx create-cairn-site --dir ' +
        `${params.dir} and enter the corrected domain when asked.`
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
    kind: 'declined',
    build(params) {
      return (
        "You chose not to copy your domain's existing DNS records into the new Cloudflare " +
        'zone. That choice is recorded, and your site is untouched and still working.\n' +
        `Next: if you change your mind, re-run npx create-cairn-site --dir ${params.dir} before ` +
        'the domain switches over, and the tool will offer to copy them again.'
      );
    }
  },
  'records-unverified': {
    kind: 'act',
    build(params) {
      return (
        `The list of DNS records for ${params.domain} could not be read reliably. Reaching your ` +
        "domain's own nameservers did not work, so the lookup fell back to a public resolver, " +
        'and a public resolver can keep answering "no such record" for a few minutes after a ' +
        'record is added. The list may therefore be missing records that really exist.\n' +
        'This run is unattended, so nothing was copied: copying a list that is quietly missing ' +
        'your mail records would break mail once the domain switches over, and nobody would see ' +
        'it happen. Your site is untouched and still working.\n' +
        `Next: run npx create-cairn-site --dir ${params.dir} without --yes, so you can read the ` +
        'list yourself before anything is copied. Waiting a few minutes first makes the read ' +
        'more likely to succeed.'
      );
    }
  },
  'delegation-propagating': {
    kind: 'wait',
    build(params) {
      const pair = params.nameServers.join(' and ');
      return (
        `${params.domain} is pointed at ${pair}, which is correct, and the change is still ` +
        'making its way across the internet. Nothing is wrong and there is nothing to fix. This ' +
        'usually takes a few minutes and can take up to 48 hours. Your site is untouched and ' +
        'still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} in a few minutes to check again.`
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
  'certificate-pending': {
    kind: 'wait',
    build(params) {
      return (
        `Your domain ${params.domain} answers correctly over plain HTTP, so the connection ` +
        'itself worked; only the HTTPS certificate has not finished issuing yet. This is ' +
        'normal right after connecting a new domain, and Cloudflare issues the certificate ' +
        'automatically, usually within a few minutes and rarely more than a few hours. Your ' +
        'site keeps answering on its workers.dev address the whole time.\n' +
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
  },
  'paid-plan-declined': {
    kind: 'declined',
    build(params) {
      if (params.reoffered) {
        return (
          "You chose again not to turn on Cloudflare's Workers Paid plan, so this site still " +
          'cannot send its own sign-in email. Nothing is broken: the site keeps serving, and you ' +
          'keep editing and publishing as the owner.\n' +
          `Your own way back in stays npx create-cairn-site --dir ${params.dir} --sign-in, and ` +
          'each sign-in it writes lasts 30 days.\n' +
          'Next: nothing, unless you want email sign-in. Re-run npx create-cairn-site --dir ' +
          `${params.dir} whenever you do.`
        );
      }
      return (
        "You chose not to turn on Cloudflare's Workers Paid plan, so this site cannot send its " +
        'own sign-in email yet. That choice is recorded, and your site is untouched and still ' +
        'working: it keeps serving its pages, and you keep editing and publishing as the owner. ' +
        'What does not work is anyone else signing in, since only Workers Paid can send them a ' +
        'link.\n' +
        `Your own way back in is npx create-cairn-site --dir ${params.dir} --sign-in, which ` +
        "writes a fresh sign-in link straight into the site's database without touching email. " +
        'Your current sign-in lasts 30 days, so none of this is urgent.\n' +
        'Next: when you are ready to turn email sign-in on, re-run npx create-cairn-site --dir ' +
        `${params.dir}.`
      );
    }
  },
  'paid-plan-missing': {
    kind: 'act',
    build(params) {
      return (
        'Cloudflare would not onboard your domain for email, because this account is not on ' +
        'the Workers Paid plan, which Email Sending requires. Workers Paid costs $5 US per ' +
        'month, as of 2026-08-11 ' +
        '(https://developers.cloudflare.com/workers/platform/pricing/). Your site is ' +
        'untouched and still working.\n' +
        'Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages, turn on the ' +
        `Workers Paid plan, then re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'email-onboarding-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Onboarding your domain for email did not finish. Cloudflare reported:\n' +
          `${params.detail}\n` +
          'Your site is untouched and still working.\n' +
          'Next: fix what Cloudflare reported above, then re-run npx create-cairn-site --dir ' +
          `${params.dir}.`
        );
      }
      return (
        'Onboarding your domain for email did not finish.\n' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'email-not-ready': {
    kind: 'wait',
    build(params) {
      return (
        `Your domain ${params.domain} is set up for email sending, but Cloudflare has not ` +
        'finished enabling it yet. This is normal, and usually finishes within a few minutes. ' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} in a few minutes to check again.`
      );
    }
  },
  'email-sender-propagating': {
    kind: 'wait',
    build(params) {
      return (
        'Sending a test sign-in email did not work yet: the DNS records email onboarding just ' +
        'wrote are still settling. Cloudflare documents this as usually taking 5 to 15 minutes. ' +
        'Nothing is wrong, and your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} in a few minutes to try the test ` +
        'message again.'
      );
    }
  },
  'email-sender-unavailable': {
    kind: 'act',
    build(params) {
      return (
        `Sending a test sign-in email from ${params.domain} still does not work, well past the ` +
        'time DNS propagation normally takes, which means onboarding did not take. Your site is ' +
        'untouched and still working.\n' +
        `Next: check ${params.domain}'s Email Sending status in the Cloudflare dashboard, then ` +
        `re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'email-daily-limit': {
    kind: 'wait',
    build(params) {
      return (
        'Cloudflare would not send the test message because this account has reached its ' +
        'daily sending limit. New accounts start with a conservative limit that rises ' +
        'automatically as the account sends more and its reputation improves, so this is ' +
        'expected rather than a mistake. Your site is untouched and still working.\n' +
        `Next: wait and re-run npx create-cairn-site --dir ${params.dir} later, or ask ` +
        'Cloudflare to raise the limit sooner from ' +
        'https://developers.cloudflare.com/email-service/platform/limits/.'
      );
    }
  },
  'email-send-failed': {
    kind: 'act',
    build(params) {
      if (params.detail) {
        return (
          'Sending the test sign-in email did not finish. Cloudflare reported:\n' +
          `${params.detail}\n` +
          'Your site is untouched and still working.\n' +
          'Next: fix what Cloudflare reported above, then re-run npx create-cairn-site --dir ' +
          `${params.dir}.`
        );
      }
      return (
        'Sending the test sign-in email did not finish.\n' +
        'Your site is untouched and still working.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'builds-app-not-authorized': {
    kind: 'wait',
    build(params) {
      return (
        "Cloudflare cannot connect this repository to Workers Builds yet: your GitHub account " +
        "has not authorized Cloudflare's GitHub App at all. This is a one-time authorization " +
        'Cloudflare requires before it can watch any repository. Nothing is wrong, and this ' +
        'run has saved its progress.\n' +
        'Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages, connect your ' +
        'GitHub account when prompted, then re-run npx create-cairn-site --dir ' +
        `${params.dir} --connect.`
      );
    }
  },
  'builds-repo-not-selected': {
    kind: 'wait',
    build(params) {
      return (
        "Cloudflare's GitHub App is authorized on your account, but it only watches a chosen " +
        `set of repositories, and ${params.owner}/${params.repo} is not one of them yet. ` +
        'Nothing is wrong, and this run has saved its progress.\n' +
        'Next: open https://github.com/settings/installations, find Cloudflare Workers and ' +
        `Pages, add ${params.owner}/${params.repo} to its repository access, then re-run npx ` +
        `create-cairn-site --dir ${params.dir} --connect.`
      );
    }
  },
  'builds-connect-declined': {
    kind: 'declined',
    build(params) {
      return (
        'You chose not to connect this repository to Workers Builds. That choice is recorded, ' +
        'and your site is untouched and still working.\n' +
        `Next: if you change your mind, re-run npx create-cairn-site --dir ${params.dir} ` +
        '--connect.'
      );
    }
  },
  'build-not-started': {
    kind: 'wait',
    build(params) {
      return (
        'The reconcile commit was pushed, but no matching build has appeared yet. This is ' +
        "normal right after a push; Cloudflare's build queue usually picks it up within a " +
        'minute.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} --connect in a minute or two ` +
        'to check again.'
      );
    }
  },
  'build-running': {
    kind: 'wait',
    build(params) {
      return (
        'The build is still running, and this run stopped watching it before it finished. ' +
        'Nothing is wrong; a build can take a few minutes.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} --connect to keep watching it.`
      );
    }
  },
  'builds-deploy-failed': {
    kind: 'act',
    build(params) {
      // `logTruncated` is set only when getBuildLogs gave up mid-log against its own page cap
      // (api.mjs), never when the log genuinely ended: claiming "ends with" over a log this tool
      // stopped reading early would misrepresent lines it never saw as the log's true tail.
      const logIntro = params.logTruncated
        ? 'The build log is too long for this tool to read in full. Here are the last lines it ' +
          'managed to read before giving up:'
        : 'The build log ends with:';
      return (
        `The first Workers Builds deploy did not finish successfully. ${logIntro}\n` +
        `${params.detail}\n` +
        `Next: open the build at ${params.buildUrl} to see the full log, fix what it names, ` +
        `then re-run npx create-cairn-site --dir ${params.dir} --connect to trigger and watch ` +
        'a new build.'
      );
    }
  },
  'builds-not-runnable': {
    kind: 'act',
    build(params) {
      return (
        'The first Workers Builds deploy did not run: Cloudflare marked it ' +
        `${params.outcome} rather than completing it.\n` +
        `Next: open the build at ${params.buildUrl} to see why, fix what it names, then ` +
        `re-run npx create-cairn-site --dir ${params.dir} --connect to trigger a new build.`
      );
    }
  },
  'builds-reconcile-parked': {
    kind: 'wait',
    build(params) {
      return (
        'This run is unattended (--yes), and the reconcile found a real difference between ' +
        "your site's local config and what is committed to the repository. Committing it " +
        'needs a sign-in in a browser, which an unattended run cannot open. Nothing was ' +
        'changed, and this run has saved its progress.\n' +
        `Next: run npx create-cairn-site --dir ${params.dir} --connect without --yes, so the ` +
        'sign-in step can open a browser.'
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
 * @param {string} code one of the catalogue's codes, the keys of `ROWS` above and of the
 *  exported `CATALOGUE_CODES`; anything else throws
 * @param {Record<string, string | string[] | boolean>} [params] the values to interpolate into
 *  the row's message; which keys are required depends on `code` (for example `dir` on every row,
 *  `detail` on the rows that carry child or API output, `database` on migrations-failed, `reason`
 *  and `email` on seed-failed's not-allowlisted case, `permission` on token-scope-missing,
 *  `domain` on the domain and hostname rows and the email-sender rows, `nameServers`/`actual`,
 *  both string arrays, on the delegation rows, `reoffered`, a boolean, on paid-plan-declined to
 *  print the copy for a re-run after an earlier decline, `owner`/`repo` on
 *  builds-repo-not-selected, `detail`/`buildUrl`/`logTruncated` (a boolean, true only when
 *  getBuildLogs gave up against its own page cap) on builds-deploy-failed, and `outcome`
 *  (`skipped`, `cancelled`, or another non-success value) on builds-not-runnable)
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
