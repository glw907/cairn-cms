# Choose an AI posture

Decide whether your site's `robots.txt` declines AI training crawlers, invites them, or states no
preference, and make that choice reach the file your site serves.

**Precondition:** the scaffold's robots route at `src/routes/robots.txt/+server.ts`, which
[Wire the delivery surface](./wire-the-delivery-surface.md) builds.

## Pick a posture

Set [`aiPosture`](../reference/core.md#defineadapter) on your adapter to `'decline'`, to
`'invite'`, or leave it unset. An unset posture states no preference, and the served `robots.txt`
stays byte-identical to a site that never declared one. The scaffold leaves `aiPosture` unset on
purpose, so a scaffolded site states nothing until you choose.

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the aiPosture member -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  aiPosture: 'decline', // or 'invite', or omit the field
});
```

## Pass the posture to the robots route

Declaring `aiPosture` changes no output bytes on its own.
[`robotsResponse`](../reference/delivery-data.md#robotsresponse) reads its posture from its own
`posture` option, so the robots route has to pass `cairn.aiPosture` through. The scaffold's route
calls `robotsResponse` with no `posture`, so add the option.

```ts
// src/routes/robots.txt/+server.ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '$chassis/content.js';
import { cairn } from '$theme/cairn.config.js';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: cairn.aiPosture,
  });
};
```

The scaffold prerenders this route. A changed posture reaches the served file once the build
carrying it deploys.

## What each posture emits

A posture adds a `Content-Signal` line to the `User-agent: *` group, and `'decline'` also appends
one group per training crawler. With no posture, the scaffold's route emits `User-agent: *`,
`Allow: /`, `Disallow: /admin`, and the `Sitemap` line, with no `Content-Signal` line.
`'invite'` inserts `Content-Signal: search=yes, ai-train=yes` after `User-agent: *` and adds
nothing else. `robots.txt` has no directive that grants access, so the signal line is the whole of
an invitation.

`'decline'` inserts `Content-Signal: ai-train=no` in the same place and appends one
`User-agent`/`Disallow: /` group per token in the engine's training-crawler table. A declining site
writes `ai-train=no` alone and leaves `search` unset, since an absent key in Cloudflare's
[Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/) states no preference.
The scaffold's route under `'decline'` serves the following, with your own origin in the `Sitemap`
line.

```text
User-agent: *
Content-Signal: ai-train=no
Allow: /
Disallow: /admin

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

The `disallow` paths, `/admin` here, emit the same way under every posture and under none. Each
of the seven crawler tokens has a first-party page from its operator. Search crawlers such as
`Googlebot` stay out of the table, since disallowing one costs search presence for no training
benefit.

## What declining doesn't buy

Declining is a request to cooperating crawlers, and `robots.txt` has no mechanism to block a fetch.
Each operator in the table documents `robots.txt` as the control for its training crawler, and
some stop short of promising to honor it.

A user-triggered fetch falls outside even that request. OpenAI's
[crawler documentation](https://developers.openai.com/api/docs/bots) says of `ChatGPT-User`,
"Because these actions are initiated by a user, robots.txt rules may not apply." Perplexity's
[crawler page](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) says the same of
`Perplexity-User`. An assistant can still fetch a declining site live when someone asks it about
one of its pages.

No option declines a crawler outside the engine's table. `disallow` paths always emit under the
blanket `User-agent: *` group, so they can't single out one named crawler. The engine ships no
crawler token without first-party documentation, which is why `Bytespider` is absent.

## You know it worked when

Your deployed site serves the `Content-Signal` line for your posture and, under `'decline'`, the
seven crawler groups listed earlier.
[`cairn doctor`](../reference/cli-cairn-doctor.md)'s `ai.posture-effective` check passes. That
check fetches the `/robots.txt` your public origin serves and compares it with the `aiPosture` your
adapter declares. It reads the declared posture from `src/content/.cairn/site-facts.json`, and
when that file is absent it reports the check as unchecked with
`needs engine 0.97.0 or later, and one build`. An unset posture always passes.

An `ai.posture-not-effective` warning means the served file carries nothing consistent with the
declared posture, or carries the other posture's directives. Check that the robots route passes
`aiPosture` to `robotsResponse` and that the build carrying it deployed. If both hold, check for a
managed layer ahead of the origin. Cloudflare's
[managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/),
when a zone enables it, prepends its own content, including its own `Content-Signal` line, to your
origin's file in one combined response.
[Make the stated AI posture effective](../admin/is-it-working.md#make-the-stated-ai-posture-effective)
covers that condition for whoever runs the zone.
