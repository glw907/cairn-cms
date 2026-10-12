# Run cairn-audit on your site

A cairn site's admin holds the engine's screens beside the site's additions, such as the list pages of its concepts, its custom screens, and the admin stylesheet it compiles.
`cairn-audit` measures that whole admin against cairn's design system, since the site's additions answer to the same system as the engine's screens, and it does so in two passes.
A bare run is the static pass: it reads the markup and scoped `<style>` blocks of the Svelte components under the admin roots, and the compiled admin stylesheets their classes resolve against.
With `--rendered`, the audit drives a browser over live admin pages on a site that is already running, such as the scaffold's `wrangler dev` preview, and renders each page under both the light and the dark theme.
Three of its rules check the public theme instead of the admin, and their findings print as advisories.
Findings come in two tiers, error and advisory, and by default only an unsuppressed error-tier finding fails a run.
A CI job or a script reads that verdict from the exit code, because the report is plain text for a person, with no machine-readable output and a line format that can still change.

A scaffolded site already runs the static pass on every push and pull request: its GitHub Actions workflow runs `check:cairn` over the default admin roots and both compiled admin sheets.
The rendered half ships only as the `check:cairn:rendered` script, and it cannot run as shipped.
The site carries no Playwright dependency, the workflow installs no browser, and a run with no signed-in session refuses with exit 2.
Making the audit your site's gate means scoping both passes to your sources, stylesheets, and admin pages, signing the rendered pass in, recording each exemption with its reason, and running the audit in the workflow's `check` job.
The steps follow a scaffolded site and run its `check:cairn` and `check:cairn:rendered` scripts.
A hand-built site without those scripts runs the commands they wrap, `cairn-audit` for the static pass and `cairn-audit --rendered` for the rendered one.
With no `cairn-audit.config.json`, the audit runs on its defaults.

Developers also arrive here with a narrower question, and the following sections answer the common ones:

- A site whose concepts aren't named `posts` and `pages` fails the rendered pass with exit 2 until `rendered.pages` names its list pages. Custom screens join through `rendered.extraPages`. [Scope the rendered pass](#scope-the-rendered-pass) sets both keys.
- A public-theme finding that persists is an advisory, and it fails a run only under `--fail-on advisory`. [Run both passes in CI](#run-both-passes-in-ci) sets that flag. A finding the theme keeps on purpose takes a suppression with a recorded reason. [Suppress a static finding](#suppress-a-static-finding) shows the directive.
- A run that stops on `cairn-audit: <message>` and exits 2 broke rather than found something, and [Diagnose a run that exits 2](#diagnose-a-run-that-exits-2) maps each message to its fix.

The steps assume familiarity with package scripts, JSON config files, GitHub Actions workflows, and reading a cookie in a browser's developer tools.
They need no cairn knowledge beyond the site's admin.
The following pages cover what this one leaves out:

- Every rule, flag, and config key: [The cairn-audit CLI](../reference/cairn-audit.md).
- The three public-scope rules in depth: [Resolve an audit finding](theme-your-public-site.md#resolve-an-audit-finding).
- Auditing one custom screen while you build it: [Verify the screen](add-a-custom-admin-screen.md#verify-the-screen).
- The audit trail of admin actions, a separate record that shares the word: [Wire the audit sink](add-a-custom-admin-screen.md#wire-the-audit-sink).

## Before you begin

Both passes need cairn installed, the static pass also needs its stylesheet peers, and the rendered pass needs an editor sign-in.
Check that the site has the following:

- The engine, installed by the setup command as [Scaffolded site files](scaffolded-site-files.md) describes, or by hand as [Install and wire the engine](add-cairn-to-a-sveltekit-app.md#install-and-wire-the-engine) shows.
- `daisyui` and `tailwindcss` as dev dependencies, without which the run fails and names the install command.
- For the rendered pass, an editor account that can sign in to the admin.

With those in place, run the audit once to see what it checks today.

## Run the static pass

A bare `cairn-audit` run is the static pass, and it exits 1 only when an unsuppressed error-tier finding survives.
An advisory finding prints without changing the exit code.
For the tiers and every exit code, see [Tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes).

To run the static pass, follow these steps:

1. In the project root, run `npm run check:cairn`.

   The script builds the site's admin sheet and then runs the whole static registry.
   The three public-scope rules run too, and their findings print as advisories.
   On a site without the script, run the audit from the project root:

   ```sh
   npx cairn-audit
   ```

2. In the same shell, print the exit code with `echo $?`.

The report lists one line per unsuppressed finding, giving its file and line, tier, rule id, and message.
A `Suppressed:` block follows when any finding was suppressed.
The report ends on a summary line of files scanned and rules run, then a count line that always prints the suppressed total, zero included:

```text
<n> files scanned, <n> rules run
<n> errors, <n> advisories, <n> suppressed
```

The report is plain text with no machine-readable output, and its line format is not yet a designed contract.
An engine update can change it, so a script gates on the exit code and never parses the lines.
A clean run exits zero, and exit 1 means a finding at the gating tier.
Any other exit code means the run broke.
[Diagnose a run that exits 2](#diagnose-a-run-that-exits-2) maps each message to its fix.

Next, point the static pass at the files your site keeps.

## Scope the static pass

The static pass reads three admin roots by default, and `cairn-audit.config.json` in the project root replaces any of its scopes with your list.
The run reads that file from the directory it runs in.
A `--config <path>` flag names another file, and a missing one fails the run.

The following keys set what the static pass reads:

- `static.scope` lists the roots most static rules read, by default `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit`.
  A configured list replaces the defaults and is never merged with them.
  A configured root the tree lacks fails the run.
  A site keeping admin components in `src/lib/components` lists the default roots it has plus that one.
- `static.adminScope` has the same three defaults, and the three admin-only motion rules read only its roots.
  A site whose admin screens live outside the defaults names their roots under both keys.
- `static.cssFiles` names standalone CSS files, none by default, that the CSS-family rules read beside each component's scoped `<style>` block.
  The three admin-only motion rules read a named file only when it lies under an admin root.
- `static.sourceScope` names the directories the `log-event-grammar` and `log-secret-field` rules walk, by default `src`.
- `sheet` takes one path or a list of the compiled stylesheets the class checks resolve against.
  The scaffold's config already lists the engine's packaged sheet and the site's `.cairn/admin.css`.
  A listed sheet that does not exist fails the run, naming it.

The following config keeps the scaffold's two sheets and adds `src/lib/components` to the default static roots:

```json
{
  "sheet": [
    "node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css",
    ".cairn/admin.css"
  ],
  "static": {
    "scope": ["src/routes/admin", "src/lib/admin", "src/lib/admin-toolkit", "src/lib/components"]
  }
}
```

To apply your scopes, follow these steps:

1. In `cairn-audit.config.json` in the project root, set the keys your site needs.
2. In the project root, run `npm run check:cairn` again.

The summary's file count changes with the scope.
A mistyped root or sheet exits 2 with a message that names the path.
For every key, the public-scope keys among them, see [Configuration](../reference/cairn-audit.md#configuration).

When a finding is deliberate, record why beside the line that raises it.

## Suppress a static finding

A `cairn-audit-disable-next-line` comment with a rule id and a reason suppresses one static finding, and the report still counts it.

- In the file the finding names, on the line before the flagged markup or rule, add `cairn-audit-disable-next-line <rule-id> -- <reason>` in a comment.

Markup takes an HTML comment, and a script or stylesheet takes a `//` or `/* */` comment.
The following markup suppresses one finding and records why:

<!-- snippet-check-skip: a two-line markup fragment from a component -->
```svelte
<!-- cairn-audit-disable-next-line stock-default-hazards -- matches the public site's tag style -->
<span class="badge badge-ghost">Archived</span>
```

- In the project root, rerun `npm run check:cairn`.

The finding moves to the `Suppressed:` block, and the count line includes it.
A directive with no rule, no reason, or nothing to silence raises an error-tier `suppression` finding that no directive can suppress.
For how far one directive reaches, see [Suppressing a finding](../reference/cairn-audit.md#suppressing-a-finding).

The rendered pass takes more setup, starting with a browser and a running site.

## Install a browser and start the site

The rendered pass drives Playwright against a site that is already running, so install the browser and start the site before the first run.
The scaffold carries no Playwright dependency, and the audit loads it only for a rendered run.
A static-only site never takes it.

To prepare the rendered pass, follow these steps:

1. In the project root, install Playwright and Chromium with `npm i -D playwright && npx playwright install chromium`.
2. In a second shell in the project root, run `npm run build`.
3. In the same shell, run `npm run preview`.
4. In a browser, open `/admin` at `http://localhost:4173` and confirm that the admin loads.

The run finds the site at `BASE_URL`, and the scaffold's `preview` script serves on its default, `http://localhost:4173`.
A site served elsewhere sets `BASE_URL` to its origin.
When nothing answers at that address, the run fails and names the URL.
Every configured page renders under both the light and the dark theme.

Next, give the run a signed-in session.

## Sign the rendered pass in

The rendered pass reads a session cookie from `CAIRN_AUDIT_COOKIES`, and without one it refuses with exit 2 rather than auditing the sign-in card.
Without a session, every admin route redirects to the sign-in card, and a run would measure that card on every page.
The refusal needs `/admin/login` among the configured pages, and the default list includes it.
[Scope the rendered pass](#scope-the-rendered-pass) keeps it there.

`CAIRN_AUDIT_COOKIES` takes `name=value` entries separated by `;`.
An entry with no `=` or an empty name throws, naming its position and never echoing the value.
An entry named `cairn-admin-theme` is refused, because the run sets that cookie for each theme.

To sign the run in, follow these steps:

1. In a browser, sign in to the admin at `BASE_URL`.
2. In the browser's developer tools, copy the value of the `cairn_session` cookie, or `__Host-cairn_session` on https.
3. In the shell that runs the audit, set `CAIRN_AUDIT_COOKIES` to that cookie:

   ```sh
   export CAIRN_AUDIT_COOKIES='cairn_session=<id>'
   ```

   On https, set it to `__Host-cairn_session=<id>` instead.

4. In the same shell, run the rendered pass:

   ```sh
   npm run check:cairn:rendered
   ```

The report lists findings for the configured pages and ends on the count line.
On a site whose concepts are not named `posts` and `pages`, this run exits 2 until [Scope the rendered pass](#scope-the-rendered-pass) sets its pages.
For the refusal's exact conditions, see [The redirect-trap refusal](../reference/cairn-audit.md#the-redirect-trap-refusal).

Next, point the rendered pass at the admin pages your site serves.

## Scope the rendered pass

The rendered pass visits six core admin pages unless `rendered.pages` replaces the list, and `rendered.extraPages` adds your site's screens to it.
The six are `/admin/posts`, `/admin/pages`, `/admin/vocabulary`, `/admin/media`, `/admin/editors`, and `/admin/login`.
A page that answers outside 2xx fails the run with exit 2.
A site whose concepts are not named `posts` and `pages` therefore sets `rendered.pages`.

Keep `/admin/login` in a replaced list.
Without it, an unsigned run gets no refusal and measures the sign-in card on every page.
`rendered.extraPages` keeps the default list, `/admin/login` included.

To set the rendered pages, follow these steps:

1. If your concepts are not named `posts` and `pages`, in `cairn-audit.config.json`, set `rendered.pages` to your concept list pages, the other core pages, and `/admin/login`.
2. If your site has custom admin screens, in the same file, list their paths under `rendered.extraPages`.

The following config sets both keys for a site with an events concept and one custom screen:

```json
{
  "rendered": {
    "pages": ["/admin/events", "/admin/vocabulary", "/admin/media", "/admin/editors", "/admin/login"],
    "extraPages": ["/admin/signups"]
  }
}
```

A site uses one key or both, as its pages need.

- In the shell that still holds the session, run the `check:cairn:rendered` script again.

Every configured page answers, and the run reports findings instead of exiting 2.

When a rendered finding is deliberate, exempt it by page and selector.

## Allowlist a rendered finding

A `rendered.allowlist` entry exempts a rendered finding by page and selector, with a required reason and an optional rule id.

- In `cairn-audit.config.json`, add an entry to `rendered.allowlist` with the finding's `page` and `selector`, a `reason`, and its `rule`.

The following entry shows the shape, with every value a placeholder:

```json
{
  "rendered": {
    "allowlist": [
      {
        "page": "/admin/<page>",
        "selector": "<selector>",
        "reason": "<why the finding is deliberate>",
        "rule": "<rule-id>"
      }
    ]
  }
}
```

For the selector's form, see [The allowlist](../reference/cairn-audit.md#the-allowlist).
An entry is stale when nothing on its page matches its selector in any theme or state the run captured.
It is dead when the selector still matches an element but no rule raised a finding for it.
A stale or dead entry reports at the tier of the `rule` it names.
Without `rule`, it reports at error tier and fails the run, even when it covered an advisory.
When the run could not reach an interaction state on that page, such as an open menu, a dead verdict reports at advisory tier instead.
An entry whose selector the browser cannot parse always reports at advisory tier.

- In the shell that holds the session, rerun the `check:cairn:rendered` script.

The finding moves to the `Suppressed:` block.

With both passes scoped and their exemptions recorded, add the audit to your workflow.

## Run both passes in CI

The scaffold's workflow runs `check:cairn` on every push, so you set its tier and, if CI can reach a signed-in site, add the rendered step.
`--fail-on advisory` gates on any unsuppressed finding, `--fail-on error` is the default, and any other value exits 2.
The public-scope rules report as advisories, so advisory tier also gates on the public theme's findings.

- If advisories should fail the build, in `.github/workflows/check.yml`, change the audit step to `npm run check:cairn -- --fail-on advisory`.

Add the rendered step only if your CI job can reach a running site and hold a session that site accepts.
The workflow installs no browser and starts no server.
The step therefore needs a browser install, a site answering at `BASE_URL`, and that session in `CAIRN_AUDIT_COOKIES`.
Without that setup, keep the static gate in CI and run the rendered pass locally, as [Verify a clean run](#verify-a-clean-run) does.

If your CI job can reach a running site and hold a session it accepts, follow these steps:

1. In `.github/workflows/check.yml`, after the install step, add a step that runs `npx playwright install chromium`.
2. In the same file, add a step that runs the rendered pass, with `BASE_URL` and `CAIRN_AUDIT_COOKIES` read from repository secrets.

The following fragment shows the two added steps:

<!-- snippet-check-skip: a fragment of the workflow's steps list -->
```yaml
      - run: npx playwright install chromium
      - run: npm run check:cairn:rendered
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          CAIRN_AUDIT_COOKIES: ${{ secrets.CAIRN_AUDIT_COOKIES }}
```

Next, verify both passes locally and in CI.

## Verify a clean run

A clean run exits zero and ends on a count line with zero errors, its suppressions still counted.
Run the following checks in order:

1. In the project root, run `npm run check:cairn`.

   The count line reads zero errors.

2. In the same shell, print the exit code with `echo $?`.

   The code is zero.

3. In a browser, with `npm run preview` still running in the second shell, open the admin at `BASE_URL` and confirm that it loads.
4. In the first shell, with `CAIRN_AUDIT_COOKIES` set, run the rendered pass:

   ```sh
   npm run check:cairn:rendered
   ```

   The count line reads zero errors, and zero advisories too if you gate on advisories.

5. In the same shell, print the exit code with `echo $?`.

   The code is zero.

6. From the project root, push a commit with your changes.

   The workflow's `check` job passes, and it runs the rendered step too if you added it.

If a run breaks instead, [Diagnose a run that exits 2](#diagnose-a-run-that-exits-2) maps its message to a fix.

## Diagnose a run that exits 2

A run that cannot start or finish prints `cairn-audit: <message>` and exits 2, and the message names its cause.
The following table maps what each message names to the section that fixes it.

| What the message names | Section that fixes it |
| --- | --- |
| A configured scope root that does not exist | [Scope the static pass](#scope-the-static-pass) |
| A listed `sheet` that does not exist | [Scope the static pass](#scope-the-static-pass) |
| `no such config file`, from `--config` | [Scope the static pass](#scope-the-static-pass) |
| A missing `daisyui` or `tailwindcss` peer, with its install command | [Before you begin](#before-you-begin) |
| `Playwright is not installed` | [Install a browser and start the site](#install-a-browser-and-start-the-site) |
| The `BASE_URL` it could not reach | [Install a browser and start the site](#install-a-browser-and-start-the-site) |
| `CAIRN_AUDIT_COOKIES`, from the refusal or a malformed cookie entry | [Sign the rendered pass in](#sign-the-rendered-pass-in) |
| A page that answered outside 2xx | [Scope the rendered pass](#scope-the-rendered-pass) |
| A bad `--fail-on` value | [Run both passes in CI](#run-both-passes-in-ci) |

For the full code table, see [Tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes).

## See also

The following pages cover the audit's rules and the tasks around it:

- [The cairn-audit CLI](../reference/cairn-audit.md) lists every rule, flag, and config key, and the norms query.
- [Add a custom admin screen](add-a-custom-admin-screen.md) builds one custom screen and audits it.
- [Resolve an audit finding](theme-your-public-site.md#resolve-an-audit-finding) covers the three public-scope rules.
- [Scaffolded site files](scaffolded-site-files.md) describes the scaffold's `cairn-audit.config.json` and `.github/workflows/check.yml`.
