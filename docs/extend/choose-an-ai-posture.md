# Choose an AI posture

Decide whether your site declines AI training crawlers, invites them, or states no preference, and
carry that choice through to the file its robots route serves.

This page assumes the following precondition:

- The prerendered robots route at `src/routes/robots.txt/+server.ts` that the scaffold writes,
  which [Wire the delivery surface](./wire-the-delivery-surface.md#feed-sitemap-and-robotstxt)
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

`create-cairn-site`, the setup command, asks for a stance toward AI training crawlers. It writes
your answer into the adapter's `aiPosture`. A site it scaffolds needs no edit here: the scaffold's
`src/routes/robots.txt/+server.ts` already passes `cairn.aiPosture` as the `posture` option to
[`robotsResponse`](../reference/delivery-data.md#robotsresponse).

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

To verify the served file, follow these steps:

1. From the deployed site, fetch the served file.
2. In the served file, confirm that the lines after `User-agent: *` match your posture.

   The expected file depends on the posture:

   - With no posture, the route emits `User-agent: *`, `Allow: /`, `Disallow: /admin`, and the
     `Sitemap` line, with no `Content-Signal` line.
   - Under `'invite'`, the only difference from that output is
     `Content-Signal: search=yes, ai-train=yes` directly after `User-agent: *`.
   - Under `'decline'`, the line directly after `User-agent: *` is `Content-Signal: ai-train=no`.
     Before the `Sitemap` line, each token in the training-crawler table takes its own
     `User-agent` group with `Disallow: /`.

   The `Disallow: /admin` line emits the same way under every posture. The
   [`buildRobots`](../reference/delivery-data.md#buildrobots) entry shows the complete declining
   file.

3. In the site directory, run [`cairn doctor`](../reference/cli-cairn-doctor.md).
4. In the output, confirm that the `ai.posture-effective` check passes.

   The check fetches the `/robots.txt` the public origin serves and compares it with the posture
   declared in `src/content/.cairn/site-facts.json`. An unset posture passes whatever the served
   file carries.

   The check reports `UNCHECKED` when it cannot read one of those two inputs, with a detail that
   depends on the cause:

   - When `site-facts.json` is absent, the detail is
     `needs engine 0.97.0 or later, and one build`.
   - When no origin resolves, or the origin's `/robots.txt` cannot be fetched, the detail is the
     fetch's own reason.

## Resolve a posture warning

A failing `ai.posture-effective` check reports the `ai.posture-not-effective` warning. The warning
means the served file carries nothing consistent with the declared posture, or carries the other
posture's directives.

To find the cause, follow these steps:

1. In the robots route, check that `robotsResponse` receives `cairn.aiPosture` as its `posture`
   option.
2. Check that the build carrying that pass-through has deployed.
3. If both hold, look for a managed layer that the zone's operator controls ahead of the origin.

   [Cloudflare's managed `robots.txt`](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/),
   when enabled, prepends its own content, including its own `Content-Signal` line, to the
   origin's file in one combined response.

[Make the stated AI posture effective](../admin/is-it-working.md#make-the-stated-ai-posture-effective)
covers the condition for whoever runs the zone.
