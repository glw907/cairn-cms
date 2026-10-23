# Turn on tidy

Tidy is an AI copy-edit that an editor runs on a draft. When the editor presses **Tidy**, an
Anthropic model proposes corrections as a diff, and the editor keeps or drops each change before
anything in the draft is written. Tidy always fixes objective errors such as spelling and grammar,
applies house conventions only as the site's configuration declares them, and discards any result
that changed more than the wording. Each call sends the editor's text to Anthropic under the site's
API key and spends tokens, and for that reason the engine leaves tidy off until a site turns it on. A
site that leaves it off installs no extra package and binds no key. A scaffolded site's config
already turns tidy on, with no package installed and no key bound, so every press of **Tidy** on the
deployed site refuses until you finish [Turn tidy on](#turn-tidy-on).

The engine owns everything between the button and the review, including the prompt, the size cap,
the call's deadline, and the structural check. The site supplies the `@anthropic-ai/sdk` package, a
`tidy` block in its site-config file, and the Anthropic API key. That block turns tidy on and may
also set the model and the conventions. The key is a Worker secret, and the tidy action reads it from
the Worker's env when a call arrives. The site-config file is committed, and the runtime takes its
`tidy` block at build. A change to that block reaches tidy only once its commit deploys, whether the
developer edited the file or an editor saved the conventions on `/admin/settings`. The tidy action
belongs to the admin routes that `createCairnAdmin` builds, and the site writes no route for it.
Instead, the server module's `createCairnAdmin` call takes a second, separate `tidy` block, which
holds the call's deadline and, for a site that needs one, a client.

A developer turning tidy on for their editors works through the sections in order, from
[Before you begin](#before-you-begin) to
[Verify tidy on the deployed site](#verify-tidy-on-the-deployed-site). By the end of those sections,
the site has the SDK installed, the switch on, the key bound, and a model and conventions chosen
where the defaults don't fit. `/admin/settings` and one tidy run confirm that tidy works on the
deployed site. A developer whose editors report a refusal, a **Tidy** button that vanished, or a
call that timed out can start at [Diagnose a refusal](#diagnose-a-refusal) and the Settings states in
[Verify tidy on the deployed site](#verify-tidy-on-the-deployed-site). A developer who routes
Anthropic traffic through a gateway, or whose calls need longer than the default
deadline, can start at
[Configure the tidy call's deadline and client](#configure-the-tidy-calls-deadline-and-client). A
developer weighing whether to offer tidy at all can start at
[Limits on a tidy result](#limits-on-a-tidy-result).

The page assumes familiarity with Wrangler secrets, the site's committed `site.config.yaml`, and the
server module that calls `createCairnAdmin`, and it assumes no knowledge of the Anthropic API beyond
holding a key. How an editor runs tidy and works through its review belongs to the editor
documentation. The site-config file's other keys, and the tag vocabulary that shares the file, are
covered in [Define an adapter and schema](define-an-adapter-and-schema.md). AI crawlers and training
on the public site are a separate decision, covered in [Choose an AI posture](choose-an-ai-posture.md).

## Before you begin

Before you start, make sure that you have the following:

- An Anthropic API key, from the [API keys page of the Claude Console](https://platform.claude.com/settings/keys).
- Wrangler, signed in to the Cloudflare account that runs your site's Worker, as
  [Cloudflare's Workers secrets documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
  describes.
- Your site's site-config file and adapter module. A scaffolded site keeps them at
  `src/theme/site.config.yaml` and `src/theme/cairn.config.ts`. The add-cairn tutorial's site keeps
  them at `src/lib/site.config.yaml` and `src/lib/cairn.config.ts`, from its
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter)
  step.

With the key in hand, turn tidy on.

## Turn tidy on

Turning tidy on takes the optional `@anthropic-ai/sdk` package, `tidy.enabled: true` in the site
config, and an `ANTHROPIC_API_KEY` Worker secret.

To turn tidy on, follow these steps:

1. In your site's directory, install the SDK:

   ```sh
   npm install @anthropic-ai/sdk
   ```

   The SDK is an optional peer that the engine imports only when a tidy call runs, so a site
   without it still builds.

2. In the site-config file, add a `tidy` block with `enabled` set to `true`:

   ```yaml
   tidy:
     enabled: true
   ```

   A scaffolded site's file already carries this block. With no `tidy` block, or with `enabled`
   unset, tidy stays off.

3. In a terminal in your site's directory, bind the key as a Worker secret, and paste the key at the
   prompt:

   ```sh
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

4. Commit the site-config file and deploy the site.

   The runtime takes the `tidy` block from the site config the build imports, and the switch reaches
   the site with that deploy.

`ANTHROPIC_API_KEY` is the one optional member of
[`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings), so the site's bindings
type check passes with no key bound. [Verify tidy on the deployed site](#verify-tidy-on-the-deployed-site)
is the check that catches a missing key.

To keep the default model and conventions, skip to
[Let editors change the conventions](#let-editors-change-the-conventions); otherwise, choose a model
next.

## Choose a model

Tidy sends every call to `claude-sonnet-5` unless `tidy.model` names another model, such as the
cheaper, faster `claude-haiku-4-5`.

To change the model, follow these steps:

1. In the site-config file, set `model` under `tidy`:

   ```yaml
   tidy:
     enabled: true
     model: claude-haiku-4-5
   ```

2. Commit the site-config file and deploy the site.

With `model` unset or empty, tidy uses `claude-sonnet-5`.

The site-config parser doesn't check the model id. A model that Anthropic rejects surfaces only on a
tidy call, as a refusal that names the model and points at `tidy.model`. The action also logs
`tidy.failed` with `reason: 'invalid_request'`. After any model change, run one tidy, as the last
step of [Verify tidy on the deployed site](#verify-tidy-on-the-deployed-site) does.

Tidy asks for the low effort tier, since a proofread needs no extended reasoning. It sends
the effort setting only to models matched by these prefixes: `claude-sonnet-5`, `claude-opus-5`,
`claude-sonnet-4-6`, and `claude-opus-4-<n>` from 6 up. Any other model, `claude-haiku-4-5`
included, gets no effort setting.

The **Settings** screen shows the model read-only, by a plain label such as **Claude Sonnet 5**. An
editor sees the model there but can't change it.

Next, set the house style tidy applies.

## Set the conventions

`tidy.conventions` adds house-style rules on top of the objective fixes every tidy call makes, and
every rule except `fixes` starts off.

The objective fixes cover spelling, grammar, doubled words, stray whitespace, capitals, and wrong
punctuation, and they always run.

To set the conventions, follow these steps:

1. In the site-config file, add a `conventions` block under `tidy` with the rules you want:

   ```yaml
   tidy:
     enabled: true
     conventions:
       oxfordComma: complex-only
       numberStyle: under-ten
       smartQuotes: true
   ```

2. Commit the site-config file and deploy the site.

The following table lists each convention, its values, and what tidy does with it:

| Field | Values | What tidy does |
| --- | --- | --- |
| `fixes` | `true` or `false`, default `true` | Setting `false` changes only what Settings displays, and the objective fixes still run. |
| `oxfordComma` | `always`, `complex-only`, or `never` | Sets the serial comma, and `complex-only` follows the AP complex-series rule. |
| `numberStyle` | `under-ten`, `under-hundred`, or `always-numerals` | Every threshold keeps numerals for ages, dates, measurements, and percentages. |
| `measurements` | `abbreviate` or `spell-out` | Changes only the notation and keeps the measurement system and the number. |
| `percent` | `sign` or `word` | Uses the `%` sign or the word *percent*. |
| `emDash` | `spaced` or `closed` | Sets the spacing and turns a double hyphen into one em dash. |
| `enDashRanges` | `true` or `false`, default `false` | Turns a hyphen between two numbers into an en dash. |
| `ellipsis` | `single-char` or `three-dots` | Sets the ellipsis form. |
| `timeFormat` | `'5 PM'`, `'5pm'`, or `'5 p.m.'` | Renders times as the chosen literal. |
| `smartQuotes` | `true` or `false`, default `false` | Applies the full apostrophe rule set. |
| `brandCaps` | `true` or `false`, default `false` | Corrects only names on a curated list. |

A field with no default in the table stays off unless set.

An editor's personal dictionary is a separate committed file, `src/content/.cairn/dictionary.txt`,
and not a convention. Editors add words to it from the **Add to dictionary** action on a spellcheck
suggestion, never from the tidy review. Regional spelling is `spellcheck.dialect`, a spellcheck key
rather than a tidy rule.
[Keep adapter settings out of `site.config.yaml`](define-an-adapter-and-schema.md#keep-adapter-settings-out-of-siteconfigyaml)
covers it.

Next, hand these rules to your editors.

## Let editors change the conventions

An editor's save on `/admin/settings` commits `tidy.conventions` to the site-config file, and tidy
applies it only after that commit deploys.

The save writes only the `tidy.conventions` block and leaves `tidy.enabled` and `tidy.model` as you
set them. The file is the one the adapter's `editor.siteConfigPath` names, with
`src/theme/site.config.yaml` as the default. The [menu editor](build-the-public-routes.md#add-an-editable-menu) and **Tags** read and commit the
same file. The [`siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member) entry
records the default. [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field) covers
the vocabulary that shares the file.

A scaffolded site needs no change, because its file sits at the default path. The add-cairn
tutorial's site keeps its file elsewhere, and it needs one change:

- In `src/lib/cairn.config.ts`, set `editor.siteConfigPath` to `src/lib/site.config.yaml`.

When no file is at that path, the save answers 404 `Site config not found`, and it tries no second
path. With tidy off, the save answers 404 `Tidy is not enabled for this site` before it reads the
file.

A save rewrites only its block and keeps every other key, comment, and key order. A comment
inside `tidy.conventions` is lost, so notes about the conventions belong outside that block.

The save commits to the default branch as `Update tidy settings`. Tidy calls and the **Settings** screen
read the runtime's copy of the site config, never the committed file. A saved change reaches tidy
only once that commit deploys. On a site that deploys on every push to the default branch, that is
the next deploy.

Next, set the deadline for a tidy call and, if you need one, a custom client.

## Configure the tidy call's deadline and client

The `tidy` block of `createCairnAdmin` sets each tidy call's deadline and, for a site with a gateway, the client it calls.

This block lives in the server module, not the site config. `createCairnAdmin` takes it as
`CairnAdminConfig.tidy` and forwards it to the content routes. On a scaffolded site, the server
module is `src/chassis/cairn.server.ts`, and it already passes `tidy: { client }` with `client` set
only under the dev gate. On the add-cairn tutorial's site, it is the module that
[Compose the runtime and the admin](add-cairn-to-a-sveltekit-app.md#compose-the-runtime-and-the-admin)
creates.

The tidy action ends a call after 30 seconds unless `tidy.timeoutMs` sets another deadline in
milliseconds. An overrun becomes a retryable refusal and a `tidy.failed` record with
`reason: 'timeout'`, instead of a platform timeout.

To change the deadline, follow this step:

- In the server module, add `timeoutMs` to the `tidy` block passed to `createCairnAdmin`.

The following line sets a longer deadline in the scaffold's server module:

<!-- snippet-check-skip: continues the scaffold's server module, which declares runtime and client -->
```ts
export const admin = createCairnAdmin({ runtime, tidy: { client, timeoutMs: 60_000 } });
```

On the add-cairn tutorial's site, which passes no `tidy` block yet, the same deadline is
`tidy: { timeoutMs: 60_000 }`.

A site that reaches Anthropic through a gateway passes a `tidy.client` factory that takes
`{ apiKey }` and returns a `TidyClient`. The dev stub in
[Run tidy in local development](#run-tidy-in-local-development) uses the same seam. Without a gateway
or a dev stub to wire, go on to [Limits on a tidy result](#limits-on-a-tidy-result).

A `TidyClient`'s `tidy(request, options)` method resolves
`{ corrected, refused, tokens: { input, output } }`, so your code never touches an Anthropic SDK type.
The [`TidyClient`](../reference/sveltekit.md#types) and
[`ContentRoutesConfig`](../reference/sveltekit.md#contentroutesconfig) rows give the full contract.
Left unset, `client` is the real Anthropic SDK client, built lazily from the key.

To route tidy through a custom client, follow these steps:

1. In the server module, write a factory that takes `{ apiKey }` and returns a `TidyClient`.
2. In the same module, pass the factory to `createCairnAdmin` as `tidy: { client }`.

   On a scaffolded site, set `client` to the gateway factory where it is declared, and leave the
   dev-gated assignment in place.

The following server module, from the add-cairn tutorial's site, routes tidy through a gateway:

<!-- snippet-check-skip: elides the gateway call inside tidy() and the tutorial's auth options -->
```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import type { TidyClient } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

function gatewayClient({ apiKey }: { apiKey: string }): TidyClient {
  return {
    async tidy(request, options) {
      // Send request.model, request.system, and request.text to your gateway with apiKey,
      // honor options?.signal, and return { corrected, refused, tokens: { input, output } }.
    },
  };
}

export const admin = createCairnAdmin({
  runtime,
  // auth stays as the tutorial wrote it
  tidy: { client: gatewayClient },
});
```

Before editors run tidy, know what it can and can't change.

## Limits on a tidy result

A tidy call is bounded by a size cap before the model runs, by a structural check on what comes back,
and by the editor's review of each change.

Tidy refuses a draft over roughly 24,000 characters, about 8,000 input tokens, before the model is
called. The refusal costs no tokens and asks the editor to tidy a selection instead.

Before a result reaches the editor, cairn compares it with the original. The directive structure,
the heading count and levels, the fenced code blocks, the frontmatter byte for byte, the `media:`
references, and every code span must match, and the wording may diverge only within a bound. A
result that fails is discarded with the draft unchanged, and it never reaches the review. The check
catches a rewrite that breaks structure. Voice comes from the prompt built from the conventions.

The proposed edit arrives as a diff with one hunk per change. Objective fixes come pre-kept and
judgment calls start undecided, and nothing is written until the editor applies the kept hunks as
one undo step. The editor documentation covers the review in full.

To try tidy without spending tokens, run it locally.

## Run tidy in local development

Under the dev backend, a scaffolded site's tidy calls a canned stub instead of Anthropic. A local run
exercises the review but never your key or your model.

The scaffold's `src/chassis/cairn.server.ts` imports `createFakeAnthropic` from
`@glw907/cairn-cms-dev` and builds the tidy client from it only when `__CAIRN_DEV_BUILD__` and the
dev-backend opt-in are both true. A default production build drops that block. The dev backend's
handle sets a dummy `ANTHROPIC_API_KEY`, and the tidy action therefore doesn't refuse for a missing
key.

The following excerpt, from the scaffold's `src/chassis/cairn.server.ts`, is the gate:

<!-- snippet-check-skip: an excerpt of the scaffold's server module, which imports createCairnAdmin and declares runtime -->
```ts
// src/chassis/cairn.server.ts (excerpt)
import type { ContentRoutesConfig } from '@glw907/cairn-cms/sveltekit';
import { devBackendOptIn } from './dev-gate.js';

let client: NonNullable<ContentRoutesConfig['tidy']>['client'] | undefined;
if (__CAIRN_DEV_BUILD__ && devBackendOptIn()) {
  const { createFakeAnthropic } = await import('@glw907/cairn-cms-dev');
  client = createFakeAnthropic();
}

export const admin = createCairnAdmin({ runtime, tidy: { client } });
```

`createFakeAnthropic()` returns the client factory itself. The import is dynamic and sits inside
the gate. `devBackendOptIn()` is the scaffold's helper, true when `CAIRN_DEV_BACKEND` is `'1'`
on the Worker env or in `process.env`.

To use the stub on the add-cairn tutorial's site, follow these steps:

1. In the server module, add the excerpt's `ContentRoutesConfig` import, its `client` declaration,
   and its gated block.
2. In the gate's test, replace `devBackendOptIn()` with `process.env.CAIRN_DEV_BACKEND === '1'`.

   The tutorial's site has no `devBackendOptIn`, and its hooks module reads this same test.

3. At the top of the module, add the `/// <reference types="node" />` line the hooks module opens
   with.
4. Pass `client` to `createCairnAdmin` as `tidy: { client }`.

[Wire the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend)
sets up the dev backend and its opt-in.

With every piece in place, check tidy on the deployed site.

## Verify tidy on the deployed site

On the deployed site, `/admin/settings` checks the key, and one tidy run on a draft checks the SDK
and the model.

No command-line check reads `ANTHROPIC_API_KEY`, so the **Settings** screen is the only check of the
key.

To verify tidy, follow these steps:

1. In the deployed admin, open `/admin/settings`.

   The screen probes the key with a call that spends no tokens and shows one of three states.

2. On the same screen, match the state in the following table:

   | State | What it means | What to do |
   | --- | --- | --- |
   | The conventions, with the model's label | Tidy is on, and the key is present and not confirmed invalid. | Go on to the next step. |
   | `Tidy is not set up yet` | Tidy is off, or no key is bound. | Recheck the switch, the key, and the deploy in [Turn tidy on](#turn-tidy-on). |
   | `Tidy's key isn't working` | Anthropic rejects the bound key. | Bind a working key with the secret step in [Turn tidy on](#turn-tidy-on). |

   A probe that can't reach a verdict fails soft and shows the conventions, so the first state alone
   doesn't prove the key. Settings may show the old state for up to ten minutes.

3. In an entry's draft, run **Tidy** once.

   When the review opens with proposed changes, tidy works, and a refusal sends you to
   [Diagnose a refusal](#diagnose-a-refusal). This run is the check for the SDK and for a changed
   model.

## Diagnose a refusal

Each tidy refusal names its cause in the message the editor sees.

The following table lists the messages, their causes and any log records, and their fixes, in the
order a call meets each check:

| Message | Cause | Fix |
| --- | --- | --- |
| `Tidy is not enabled for this site.` | The deployed site config doesn't set `tidy.enabled: true`. | Set the switch and deploy, as in [Turn tidy on](#turn-tidy-on). |
| `Tidy is not configured: the Anthropic API key is missing.` | No `ANTHROPIC_API_KEY` secret is bound. | Bind the key, as in [Turn tidy on](#turn-tidy-on). |
| `This is too long to tidy at once. Select a passage and tidy that instead.` | The draft is over the size cap. | The editor tidies a selection. |
| A message carrying `Run npm install @anthropic-ai/sdk.` | The SDK isn't installed, logged as `tidy.failed` with `reason: 'sdk_missing'`. | Install the SDK and deploy, as in [Turn tidy on](#turn-tidy-on). |
| A message telling the editor to let their site developer know | Anthropic answered 401 or 403 to the key, logged as `tidy.failed` with `reason: 'auth'`. The refusal isn't retryable, and the edit screen hides **Tidy** for the ten-minute cache window. | Bind a working key, then check `/admin/settings`. Settings may show the old state for up to ten minutes. |
| A message naming the model and `tidy.model` | Anthropic rejected the model id, logged as `tidy.failed` with `reason: 'invalid_request'`. | Set a supported model, as in [Choose a model](#choose-a-model). |
| `Tidy could not finish. Try again.` | The deadline fired, the call was cancelled, or the model errored, logged as `tidy.failed` with `reason` set to `'timeout'`, `'abort'`, or `'model'`. These causes are retryable. | Retry. For repeated timeouts, raise `tidy.timeoutMs` as in [Configure the tidy call's deadline and client](#configure-the-tidy-calls-deadline-and-client). |
| `Tidy returned a result that changed more than the wording, so it was discarded. Your text is unchanged.` | The structural check discarded the result. | None, since the text is unchanged. [Limits on a tidy result](#limits-on-a-tidy-result) describes the check. |

An empty result is also retryable. [Log events](../reference/log-events.md) lists every `tidy.*`
record and its fields, and [Read the structured logs](debug-your-site.md#read-the-structured-logs)
shows where to find them.

## See also

The following pages cover the pieces this page links to:

- [The SvelteKit reference's content routes entry](../reference/sveltekit.md#createcontentroutes),
  for the tidy action's request and refusal shapes and the Settings load.
- [The core reference's types](../reference/core.md#types), for the `TidyConfig` and
  `TidyConventions` rows.
- [`CairnTidySettings`](../reference/admin.md#cairntidysettings), for the **Settings** screen component.
- [Log events](../reference/log-events.md), for the `tidy.*` records.
- [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field), for the tag vocabulary
  that shares the site-config file.
- [Choose an AI posture](choose-an-ai-posture.md), for the other AI choice a site makes, about
  crawlers.
