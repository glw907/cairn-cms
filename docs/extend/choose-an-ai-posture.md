# Choose an AI posture

Decide whether your site declines AI training crawlers, invites them, or states no preference, and
carry that choice through to the file its robots route serves.

**Precondition:** the prerendered robots route at `src/routes/robots.txt/+server.ts` that the
scaffold writes, which [Wire the delivery surface](./wire-the-delivery-surface.md#feed-sitemap-and-robotstxt)
describes.

## Choose a posture

The choice is among three states of the adapter's optional `aiPosture` member: `'decline'`,
`'invite'`, or unset, which is the default. A declining site adds a `Content-Signal: ai-train=no`
line and appends a `User-agent`/`Disallow: /` group for each token in the engine's
training-crawler table. That line leaves the `search` key unset, since an absent key in
Cloudflare's [Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/) states
no preference. An inviting site adds `Content-Signal: search=yes, ai-train=yes` and nothing else,
because no `robots.txt` directive grants a crawler access. An unset posture adds no
`Content-Signal` line and no crawler groups, so the file is byte-identical to that of a site that
never declared a posture. The scaffold leaves `aiPosture` unset on
purpose, so a scaffolded site states nothing until you choose.

A `robots.txt` file cannot block a fetch, so `'decline'` reaches only crawlers whose operators
honor it. The [`buildRobots`](../reference/delivery-data.md#buildrobots) entry records which
operators promise that, which assistants exempt a user-initiated fetch, and why the table leaves
out search crawlers and any token without first-party documentation.

## Set the posture on the adapter

Set `aiPosture` in the adapter the scaffold exports as `cairn` from `src/theme/cairn.config.ts`.
The member is optional, and [`defineAdapter`](../reference/core.md#defineadapter) accepts it
alongside the four groups it requires, which the snippet elides:

<!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, and rendering stay as the scaffold wrote them
  aiPosture: 'decline',
});
```

To state no posture, leave the member out.

## Pass the posture to the robots route

A site scaffolded by the current setup command needs no edit here: the scaffold's
`src/routes/robots.txt/+server.ts` already passes `cairn.aiPosture` as the `posture` option to
[`robotsResponse`](../reference/delivery-data.md#robotsresponse). `create-cairn-site` asks for a
stance toward AI training crawlers.

For a site scaffolded before this pass-through existed, pass `cairn.aiPosture` as the `posture`
option in the robots route, since declaring `aiPosture` on the adapter changes no output bytes on
its own:

```ts
// src/routes/robots.txt/+server.ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '$chassis/content.js';
import { cairn } from '$theme/cairn.config.js';

export const prerender = true;

export const GET: RequestHandler = () =>
  robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
    posture: cairn.aiPosture,
  });
```

`robotsResponse` passes `posture` to `buildRobots` unchanged. The route is prerendered, so a
changed posture reaches the served file once the build carrying it deploys.

## Verify the served file

Fetch the served file from the deployed site and confirm that the posture's `Content-Signal` line
sits directly after `User-agent: *`. With no posture, the route emits `User-agent: *`, `Allow: /`,
`Disallow: /admin`, and the `Sitemap` line, with no `Content-Signal` line. Under `'invite'`, the
only difference from that output is `Content-Signal: search=yes, ai-train=yes` in the same
position. Under `'decline'`, the line is `Content-Signal: ai-train=no`, and the seven tokens in the
engine's training-crawler table follow as their own `User-agent` groups, each with `Disallow: /`,
before the `Sitemap` line. The `Disallow: /admin` line emits the same way under every posture. The
[`buildRobots`](../reference/delivery-data.md#buildrobots) entry shows the complete declining file.

Run [`cairn doctor`](../reference/cli-cairn-doctor.md) in the site directory and confirm that its
`ai.posture-effective` check passes. The check fetches the `/robots.txt` the public origin serves
and compares it with the posture declared in `src/content/.cairn/site-facts.json`, and an unset
posture passes whatever the served file carries. The check reports `UNCHECKED` when it cannot read
one of those two inputs: with the detail `needs engine 0.97.0 or later, and one build` when
`site-facts.json` is absent, and with the fetch's own reason when no origin resolves or the
origin's `/robots.txt` cannot be fetched.

## Resolve a posture warning

A failing `ai.posture-effective` check reports the `ai.posture-not-effective` warning, which means
the served file carries nothing consistent with the declared posture, or carries the other
posture's directives. Check first that the robots route passes `aiPosture` to `robotsResponse`
and that the build carrying it has deployed. If both hold, look for a managed layer that the
zone's operator controls ahead of the origin.
[Cloudflare's managed `robots.txt`](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/),
when enabled, prepends its own content, including its own `Content-Signal` line, to the origin's
file in one combined response.
[Make the stated AI posture effective](../admin/is-it-working.md#make-the-stated-ai-posture-effective)
covers the condition for whoever runs the zone.
