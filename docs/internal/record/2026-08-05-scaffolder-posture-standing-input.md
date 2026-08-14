# Standing input: the scaffolder's AI-posture question (2026-08-05)

`create-cairn-site` is not built yet and stays last in the queue (ROADMAP, "Toward 1.0"). This is
the AI-posture pass's share of that future pass: exactly what the scaffolder must surface for
`CairnAdapter.aiPosture`, so the scaffolder pass implements from this rather than re-deriving the
reasoning. Authority: `docs/superpowers/specs/2026-08-05-ai-posture-design.md`, "The setup path."
The tutorial's version of this same moment is the "Worth deciding here" passage in
[`docs/tutorial/build-your-first-cairn-site.md`](../../tutorial/build-your-first-cairn-site.md#milestone-6-wire-the-delivery-surface),
Milestone 6.

## When it asks

At the same point the scaffolder wires the site's `robots.txt` route, alongside whatever other
delivery-surface choices that step already makes. Not in a separate step, and not asked again
later in the flow.

## The question

Something close to: "Should this site's `robots.txt` state a stance toward AI training crawlers?"
with three answers, not two:

1. **Decline.** Adds a `Disallow: /` group per training crawler in cairn's table, plus
   `Content-Signal: ai-train=no`. Consequence to state plainly: this is a request that named
   crawlers say they honor, not a block. `ChatGPT-User` and `Perplexity-User` are exempt from
   robots.txt by their own operators' design, so a fully declining site still answers a live fetch
   when someone asks an assistant about it. Nothing here is retroactive: it does not withdraw
   content a crawler already collected.
2. **Invite.** Adds `Content-Signal: search=yes, ai-train=yes` and no `Disallow`. Consequence to
   state plainly: there is no robots directive that summons a crawler. A site can decline
   credibly; no site can make one arrive.
3. **Leave unset (the default).** States nothing. This is the answer the scaffolder pre-selects,
   and it must read as a legitimate choice in the prompt's own copy, not as a step the developer
   skipped. Absence is honest: a fabricated default is what produced the estate split this pass
   exists to fix.

## What the scaffolder must never do

It must never write a value on the developer's behalf. Whatever the prompt's default cursor
position is, the emitted `cairn.config.ts` carries no `aiPosture` line unless the developer
actively chose `decline` or `invite`. This mirrors the constraint this pass held for the tutorial
and the emitted template: raising the choice is in scope, making it is not.

## What the scaffolder may reuse

The full argument (the Cloudflare AI Crawl Control layer, the doctor probe, why `llms.txt` does not
ship) lives in the guide, `docs/guides/choose-an-ai-posture.md`, written in Task 7 of the
AI-posture pass. The scaffolder's own prompt copy should stay as short as the tutorial passage
above and point at that guide for the rest, rather than repeating the argument inline.
