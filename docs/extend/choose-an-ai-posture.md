# Choose an AI posture

Decide whether your site's `robots.txt` asks AI training crawlers to stay away, invites them
explicitly, or states no preference at all, the same default every cairn site ships with today.

## The fork

Set `aiPosture` on your adapter:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the aiPosture member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  aiPosture: 'decline', // or 'invite', or omit the field entirely
});
```

Declaring the field alone changes no bytes. `robotsResponse` reads its posture from its own
`posture` option, not from the adapter, so your `robots.txt` route has to pass it through:

```ts
// src/routes/robots.txt/+server.ts
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { cairn } from '$lib/cairn.config.js';
import { ORIGIN } from '$lib/content.js';

export const GET = () =>
  robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'], posture: cairn.aiPosture });
```

[Wire the delivery surface](./wire-the-delivery-surface.md) builds this route without the
`posture` option. Add it there once you've decided a stance.

Leaving `aiPosture` unset is the default and states nothing: the emitted `robots.txt` is
byte-identical to a site with no opinion, which is every cairn site's behavior before this field
existed. `'decline'` adds a `Content-Signal: ai-train=no` line and a `User-agent`/`Disallow: /`
pair for each token in the engine's own training-crawler table. `'invite'` adds `Content-Signal:
search=yes, ai-train=yes` and emits no `Disallow` lines at all, since no `robots.txt` directive
grants access; the only thing a site can do to invite a crawler is state that it's welcome and
otherwise stay out of the way.

## What declining actually buys you, honestly

A `Disallow` line is a request among cooperating crawlers, never enforcement. `robots.txt` has no
mechanism to block a fetch. The crawlers in cairn's own table are the ones a first-party page
documents as complying with it; a token with no such first-party documentation doesn't ship in
the table at all, however widely it's repeated elsewhere. And even full compliance has a
documented hole: at least one major operator's own documentation states that a *user-triggered*
fetch, someone asking an assistant about your page directly, may fall outside its own crawler's
robots.txt compliance by design. A fully declining site can still be fetched live that way. This
honesty constraint is why `aiPosture` exists as a named, typed field rather than a raw
`Disallow` list you assemble yourself: the engine states what each direction does and doesn't
buy, rather than letting the mechanism read as stronger than it is.

## The disallow seam has no per-crawler override

`robots.txt`'s general-purpose `disallow` option (the plain path list every `robotsResponse` call
already accepts, for `/admin` and the like) and the `aiPosture`-driven crawler table are two
separate mechanisms, and they don't compose the way you might expect. `disallow` paths are always
emitted under the blanket `User-agent: *` group, ahead of any posture-specific group; they have no
way to target one named crawler by itself. The only way to disallow a *specific* named crawler
token is the fixed table `posture: 'decline'` already iterates. There's no seam for declining one
crawler your site cares about that isn't already in that table.

This is deliberate, not an oversight: cairn ships no crawler token it has no first-party
documentation for. A token repeated widely across blog posts and community lists, with no
operator page actually confirming it, doesn't earn a place in the shipped table, and the engine
gives you no side door to add one yourself with the same claimed authority. If a crawler you want
to decline isn't in the table, that's a fact about what's documented, not a gap this page tells
you how to route around.

## You know it worked when

`robots.txt` on your deployed site carries the `Content-Signal` line matching your chosen posture,
and, under `'decline'`, a `User-agent`/`Disallow: /` pair for every crawler token cairn ships.
Compare it against the byte-identical no-posture output by unsetting `aiPosture` temporarily if
you want to confirm the field changes nothing when absent.
