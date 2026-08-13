// The GitHub chapter's error catalogue. A run that hits one of these recoverable failures
// should never surface a raw fetch error or stack trace: it prints through chapterError, which
// names what happened, what it means, and the one concrete command the admin should run next.
// Two rows are deliberately absent. Declining the App's consent screen (the manifest and
// install flows) is a normal return value, not an error, so there is no consent-denied row.
// The tool also cannot observe GitHub silently re-rendering the manifest form with the App name
// already filled in and an inline "name already taken" notice, so there is no
// app-name-collision row either; that recovery is covered by browser-step-abandoned's own wait
// copy, which already tells the admin to check for exactly that page. builds-oauth-denied is
// the one place a declined consent DOES get a row: chapter 3's reconcile OAuth trip has no
// caller-visible "declined, keep going" state the way chapters 1 and 2 do, so a denial there
// surfaces as this catalogue's own act row instead.

/**
 * @typedef {'wait' | 'act' | 'ask-someone'} ErrorKind
 */

/**
 * @typedef {object} ChapterErrorInfo
 * @property {string} code the catalogue code that produced this error
 * @property {ErrorKind} kind whether the admin should wait, act themselves, or ask someone
 *  else (an org owner) to act
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
  'browser-step-abandoned': {
    kind: 'act',
    build(params) {
      if (params.step === 'install') {
        return (
          "The browser step was not completed, so the App's installation was never confirmed. " +
          `The App (${params.appName}) and its saved credentials are safe, and this run has ` +
          'saved its progress.\n' +
          `Next: re-run npx create-cairn-site --dir ${params.dir} and the tool will resume from ` +
          'the install step.'
        );
      }
      return (
        'The browser step was not completed, so nothing was collected from GitHub. If you saw a ' +
        'GitHub page saying the App name is already taken, that is the cause.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} (add --app-name <a-new-name> if ` +
        `the name was taken). If an App named ${params.appName} now exists at ` +
        `${params.webBase}/settings/apps, delete it there first.`
      );
    }
  },
  'manifest-window-expired': {
    kind: 'act',
    build(params) {
      return (
        "GitHub's one-hour window for collecting the new App's credentials has passed, so the " +
        `App (${params.appName}) may exist while its key was never collected and cannot be ` +
        'recovered.\n' +
        `Next: delete the App at ${params.webBase}/settings/apps if it exists, then re-run npx ` +
        `create-cairn-site --dir ${params.dir} (pick a new name with --app-name if the old one ` +
        'is taken).'
      );
    }
  },
  'code-expired': {
    kind: 'act',
    build(params) {
      return (
        "GitHub's authorization code for this browser step expired before the tool could " +
        'exchange it for a token, so nothing was collected.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} and complete the browser step ` +
        'promptly this time.'
      );
    }
  },
  'repo-name-collision': {
    kind: 'act',
    build(params) {
      return (
        `A repository named ${params.repo} already exists under ${params.owner}, so GitHub ` +
        'refused to create it.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} --repo-name <a-different-name> ` +
        'to choose a repository name that is not already taken.'
      );
    }
  },
  'sso-blocked': {
    kind: 'ask-someone',
    build(params) {
      return (
        `GitHub blocked this request because ${params.org} enforces SAML single sign-on and ` +
        `${params.appName} has not been authorized for it.\n` +
        `Next: ask an organization owner to authorize ${params.appName} for SSO (under the ` +
        "organization's Settings, Third-party access), or sign in again at " +
        `${params.webBase}/orgs/${params.org}/sso, then re-run npx create-cairn-site --dir ` +
        `${params.dir}.`
      );
    }
  },
  'org-approval-pending': {
    kind: 'ask-someone',
    build(params) {
      return (
        `Your organization (${params.org}) requires an owner to approve installing ` +
        `${params.appName}. GitHub has already notified the owners; nothing is lost, and this ` +
        'run has saved its progress.\n' +
        'Next: once an owner approves (they were emailed; the pending request is under the ' +
        `organization's Settings), re-run npx create-cairn-site --dir ${params.dir} and the ` +
        'tool will pick up where it left off.'
      );
    }
  },
  'installation-not-covering-repo': {
    kind: 'act',
    build(params) {
      return (
        `The App's installation does not include ${params.repo}, so it has no permission to ` +
        'commit there.\n' +
        `Next: open ${params.webBase}/settings/installations, choose "Only select ` +
        `repositories", add ${params.repo}, then re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'push-interrupted': {
    kind: 'act',
    build(params) {
      return (
        'The push to GitHub was interrupted before it finished. Nothing is lost or ' +
        'duplicated; the re-run picks the push up safely.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir}.`
      );
    }
  },
  'builds-oauth-denied': {
    kind: 'act',
    build(params) {
      return (
        'The sign-in step for the config reconcile commit was not completed (declined or ' +
        'abandoned), so nothing was committed.\n' +
        `Next: re-run npx create-cairn-site --dir ${params.dir} --connect and complete the ` +
        'sign-in step this time.'
      );
    }
  },
  'builds-push-refused': {
    kind: 'act',
    build(params) {
      return (
        `GitHub refused to update ${params.branch} on ${params.owner}/${params.repo} (a ` +
        'protected or diverged default branch), so the deploy-config commit was not pushed.\n' +
        `Next: check the branch's protection rules at ${params.webBase}/${params.owner}/` +
        `${params.repo}/settings/branches, then re-run npx create-cairn-site --dir ${params.dir} ` +
        '--connect.'
      );
    }
  }
};

/** Every code the catalogue covers, for a collision guard that counts rather than reads. */
export const CATALOGUE_CODES = Object.keys(ROWS);

/**
 * Build a printable, catalogued error for one of the GitHub chapter's recoverable failures.
 * @param {string} code one of the catalogue's codes: browser-step-abandoned,
 *  manifest-window-expired, code-expired, repo-name-collision, sso-blocked,
 *  org-approval-pending, installation-not-covering-repo, push-interrupted, builds-oauth-denied,
 *  or builds-push-refused
 * @param {Record<string, string>} [params] the values to interpolate into the row's message;
 *  which keys are required depends on `code` (for example `step` for browser-step-abandoned,
 *  `org` for org-approval-pending and sso-blocked)
 * @returns {Error & { catalogue: ChapterErrorInfo }} an Error whose message is the full printed
 *  text (ending in a "Next:" line) and whose `catalogue` property carries `{ code, kind, next }`
 */
export function chapterError(code, params = {}) {
  const row = ROWS[code];
  if (!row) {
    throw new Error(`chapterError: unknown catalogue code ${JSON.stringify(code)}`);
  }
  const message = row.build(params);
  const err = new Error(message);
  err.catalogue = { code, kind: row.kind, next: extractNext(message) };
  return err;
}
