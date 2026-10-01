# Stage 2a pilot: page-level job read (2026-09-30)

Agent-facing record. Geoff's read found two pilot pages (`security-model`, `add-cairn-to-a-sveltekit-app`) with no real
introduction. One read-only Opus 5.5 reviewer then graded all six pilot pages on page-level questions only (the register
editor and fact read had already passed every sentence). Result: every page has page-level weaknesses; about 20 of 42
grades are weak or fail; an opener rule alone fixes 2.

| Page | Open | Job | Order | Depth | End | Orient | Other |
|---|---|---|---|---|---|---|---|
| security-model | fail | weak | weak | weak | pass | weak | fail |
| add-cairn-to-a-sveltekit-app | fail | weak | weak | weak | fail | pass | weak |
| replace-magic-links-with-cloudflare-access | pass | pass | weak | pass | weak | pass | pass |
| architecture | pass | pass | weak | pass | weak | pass | weak |
| add-a-custom-admin-screen | pass | pass | weak | weak | pass | weak | weak |
| theme-your-public-site | pass | pass | weak | weak | pass | pass | weak |

## Findings by page (file:line at the pilot commit plus `0d8b55be`)

- **security-model**: opens on a meta sentence (`:3`), no reader, no decision supported, no other page named; the
  first cover ("Scope and who the realistic attacker is") never delivered; the auth channel used at `:197`, introduced
  at `:285`; sections are component blocks with no hand-offs; the auth channel catalogue (`:285-342`) is the heaviest
  section for a minority reader; headings name mechanisms, not risks, so a skimmer cannot tell what cairn defends from
  what it leaves to the site; the closing responsibilities list (`:406`) works.
- **add-cairn-to-a-sveltekit-app**: opens on a meta sentence (`:3`); never names `create-cairn-site` as the faster
  path; milestone 2 ends unverified (`:143`) and the working `/admin` appears only at `:783` inside an unnumbered
  dev-backend section (`:656`) between milestones 3 and 4; the optional about-page drill (`:599-647`) is heavy; the page
  stops at the email check (`:1088`) with no "you now have a production site" and no next pages; `:33` mentions a
  scaffolded site never introduced; the checklists' "Say why" items (`:403`, `:805`) test a goal never framed.
- **replace-magic-links-with-cloudflare-access**: "Wire the resolver" is one step then about 20 lines of exposition with
  no lead-in (`:211-231`); ends at verify step 5 (`:271`) with no failure path or route to debugging.
- **architecture**: the Seams section ends in three unrelated paragraphs (`:54-58`); Commit concurrency (`:143`) is
  detached from the write path (`:60`); stops on a link (`:162`) with no closing synthesis; "capability" first appears at
  `:54` untied to its seam.
- **add-a-custom-admin-screen**: five noun-headed blocks (`:195-355`) sit between the steps and Verify with no task
  lead-in and no optional marker; motion (`:339`) is a rule catalogue where the outline asked for a citation; row detail
  (`:327`) is thin; "Choose an action wrapper" (`:150`) comes after the reader was told which wrapper to use.
- **theme-your-public-site**: "Iterate locally" (`:288`) and the conventions traps (`:319`) come after the steps that
  need them; "Theme a hand-built site" (`:244`) sits mid-page though the opener routes hand-built readers there; "Style
  rendered markdown" (`:234`) is one paragraph; `formatDate` is covered twice (`:327`, `:346`).

## Recurring causes

1. Openers fail only where the register gives no page-level opener: the task-guide anatomy's one-line contract carries
   the four task pages; the register has no concept anatomy; the tutorial anatomy has only per-milestone objectives;
   the outline has a `job` but no field for the reader or the page to read instead.
2. Orientation sentences get cut: "who this is for", "read X instead", hand-offs, and "what's next" carry no fact, and
   the drafter's rule (remove a sentence that can go without losing a fact or a step) licenses cutting them; "the first
   sentence of each section states its answer" tunes sections, never the page.
3. Section order is the outline's `covers` order, written as a coverage inventory, never re-sequenced.
4. Nothing checks covers fulfilment: the fact read checks claims made, not claims missing.

The facts container also has no place for a stated design position (the harvest dropped judgment calls as unfalsifiable),
so the security page's threat framing had no citable source.

## Owner ruling (Geoff, 2026-09-30)

Fix the chain and rework the pilot before task 8: add a page-level job-read seat and the upstream fixes, rework the six
pilot pages at the page level (his two introductions included), and republish the same three pages for a second read.
Task 8 runs after the 2026-10-02 reset if the week runs short. The threat position for `security-model` is his: cairn
assumes the likeliest attacker holds an editor's account; an anonymous visitor reaches only the public site and the
sign-in form (wording to verify against the code at the fold).

## The two introductions for task 7b (drafted by the conductor, Geoff approved the direction)

Both replace the page's current first paragraph; the fact read verifies every claim before they land, and the attacker
sentence cites the owner-ruled position fact from task 7a.

`security-model.md` (the default-identity paragraph follows unchanged):

> cairn signs in a site's editors and commits their edits, so its security design decides who can change the site. It
> assumes the likeliest attacker holds an editor's account, through a stolen or phished sign-in link. An anonymous
> visitor reaches only the public site and the sign-in form.
>
> Each section below takes one component cairn exposes, says what cairn defends, and names the risk it leaves to the
> site. The page ends with the responsibilities that stay with the site. Read it before you replace cairn's sign-in or
> access rules, and again before you ship.

If preview links, the media route, or `/healthz` make "only the public site and the sign-in form" too strong, use
"reaches nothing behind `/admin` except the sign-in form".

`add-cairn-to-a-sveltekit-app.md` (the milestone list follows):

> cairn gives a SvelteKit site an admin at `/admin`, where editors sign in by email and publish their markdown edits
> through a GitHub App you register. This tutorial adds it by hand, so you see every file the engine needs and why. To
> start a new site without the walkthrough, the setup command, `create-cairn-site`, scaffolds a complete site with its
> theme in one step, and [Scaffolded site files](scaffolded-site-files.md) explains what it writes.
>
> The tutorial carries one example throughout: Field Notes, a site with one post. By the end, Field Notes runs in
> production, and an editor can sign in, edit the post, and publish it to the deployed site.

## Carried into 7a (not yet done)

- A brief sentence holds one fact id and the brief has no cut field (filed in the friction log); take it in 7a only if
  it is cheap, else leave it for the 2b plan.
- Geoff's pilot review page (https://claude.ai/artifact/5xEGWkUwrhmY9pjhLTSoKs) holds no edits of his yet; read it back
  before 7b in case he saves edits, and republish to the same URL for the second read.
