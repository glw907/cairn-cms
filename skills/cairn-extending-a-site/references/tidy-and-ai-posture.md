# Turn on tidy and set the AI posture

Two separate decisions. Tidy is the editor's AI copy-edit, which sends text to Anthropic under the
site's key. The AI posture is what `robots.txt` says to training crawlers.

Contents:

- [Turn tidy on](#turn-tidy-on)
- [Set the AI posture](#set-the-ai-posture)

## Turn tidy on

Tidy's settings live in two places. Put each setting in its own place:

| Setting | Where |
|---|---|
| On/off, model, house conventions | `tidy` block of the committed site config (`src/theme/site.config.yaml` on a scaffold) |
| Call deadline, custom client | `tidy` block of the `createCairnAdmin` call in the server module (`src/chassis/cairn.server.ts` on a scaffold) |
| API key | Worker secret `ANTHROPIC_API_KEY` |

The site config has no timeout key. Never put `timeoutMs` in the YAML.

1. Install the optional peer the tidy call imports: `npm install @anthropic-ai/sdk`. Without it,
   every call refuses with `Run npm install @anthropic-ai/sdk.` and logs `tidy.failed`
   `reason: sdk_missing`. The site still builds without it.
2. In the site config, set the switch and, if wanted, the model. Leave the existing `conventions`
   block as it is.

   ```yaml
   tidy:
     enabled: true
     model: claude-haiku-4-5
   ```

   The default model is `claude-sonnet-5`. The parser does not check the id; a model Anthropic
   rejects surfaces on the first call as `tidy.failed` `reason: invalid_request`.
3. For a longer deadline (default 30 seconds), add `timeoutMs` to the server module's existing
   `tidy` block. On a scaffold, keep the dev-gated `client` entry beside it.

   <!-- snippet-check-skip: continues the scaffold's server module, which declares runtime and the dev-gated client -->
   ```ts
   export const admin = createCairnAdmin({ runtime, tidy: { client, timeoutMs: 60_000 } });
   ```

   A site with no `tidy` block passes `tidy: { timeoutMs: 60_000 }`. A gateway passes
   `tidy: { client }`, a factory `({ apiKey }) => TidyClient` whose `tidy(request, options)`
   resolves `{ corrected, refused, tokens: { input, output } }`.
4. Tell the developer to bind the key themselves; never write a key into the repo, `vars`, or a
   committed `.dev.vars`:

   ```sh
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

5. Commit and deploy. The runtime takes the site config at build, so a change to `tidy` (including
   an editor's save of the conventions on `/admin/settings`, which commits to the default branch)
   reaches tidy only after the next deploy.

Under the dev backend, the scaffold's server module builds `client` from `createFakeAnthropic()`
(`@glw907/cairn-cms-dev`) inside the `__CAIRN_DEV_BUILD__` gate, and the dev handle sets a dummy key,
so local runs never reach Anthropic.

**Verify on the deployed site.** `/admin/settings` probes the key: the conventions with the model
label means on with a key (a soft-failed probe looks the same), `Tidy is not set up yet` means off or
no key, `Tidy's key isn't working` means Anthropic rejects it. Then run Tidy once on a draft; that is
the only check of the SDK and the model.

| Refusal message | Cause | Fix |
|---|---|---|
| `Tidy is not enabled for this site.` | Deployed config lacks `enabled: true` | Set it, deploy |
| `...the Anthropic API key is missing.` | No secret bound | `wrangler secret put` |
| `This is too long to tidy at once...` | Over about 24,000 characters | Editor tidies a selection |
| Mentions `npm install @anthropic-ai/sdk` | SDK not installed | Install, deploy |
| Tells the editor to contact the developer | Key rejected (`auth`); Tidy hides for 10 minutes | Bind a working key |
| Names the model and `tidy.model` | Model id rejected | Set a supported model |
| `Tidy could not finish. Try again.` | `timeout`, `abort`, or `model` | Retry; raise `timeoutMs` for repeated timeouts |
| `...changed more than the wording, so it was discarded...` | Structural check discarded the result | None; text unchanged |

A save of the conventions answers 404 `Site config not found` when `editor.siteConfigPath` (default
`src/theme/site.config.yaml`) names no file, and 404 `Tidy is not enabled for this site` with tidy
off. The save rewrites only `tidy.conventions`, so a comment inside that block is lost.

## Set the AI posture

1. On the adapter, set `aiPosture: 'decline'` (or `'invite'`). Unset emits nothing, byte-identical
   to a site that never states one.
2. Pass it to the robots route. Setting it on the adapter alone changes nothing served: the route
   must hand it to `robotsResponse`. Older scaffolds omit this line.

   ```ts
   // src/routes/robots.txt/+server.ts
   import { robotsResponse } from '@glw907/cairn-cms/delivery';
   import { siteMeta } from '#chassis/content.js';
   import { cairn } from '#theme/cairn.config.js';

   export const prerender = true;

   export function GET(): Response {
     return robotsResponse({
       sitemapUrl: siteMeta.origin + '/sitemap.xml',
       disallow: ['/admin'],
       posture: cairn.aiPosture,
     });
   }
   ```

3. Run `npx cairn-manifest` and commit `site-facts.json`: the posture is one of the adapter facts the
   build checks.
4. Deploy. `'decline'` adds a `Content-Signal: ai-train=no` line and one `Disallow: /` group per
   known training crawler.

Say plainly that a robots.txt is a request only crawlers that honor it follow; it enforces nothing.
