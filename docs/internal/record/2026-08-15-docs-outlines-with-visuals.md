# The docs outlines, rebuilt with a visual layer (2026-08-15)

The successor to [`2026-08-14-docs-track-outlines.md`](./2026-08-14-docs-track-outlines.md).
That document's "no screenshots anywhere" ruling shipped a corpus with zero images and zero
diagrams, half by decision (screenshots, with the live-reproduction replacement never built) and
half by collateral (the eight mermaid diagrams died with the deleted arms and no artifact ever
discussed them). The ROADMAP entry of 2026-08-15 states the finding; this record is the decision
it owes. The page structure below is rebuilt FROM the shipped prose, not from the old outline,
because the shipped prose carries 114 folded gate findings, four persona-walk fixes, and a body
of code-verified facts that a clean-room outline would lose.

**The governing principle (Geoff, 2026-08-15): prose written to stand alone without a picture is
substantially different prose.** An effective visual replaces sections of prose rather than
joining them. So this is a rewrite plan for the affected pages, not a layer added on top, and the
editors track's word count is expected to fall. Each page contract below names its visuals, what
each one replaces (quoting the passage), what kind it is, whether it is buildable today, and
roughly how much prose it retires.

**The fact-survival rule.** Where a visual replaces prose that carries a gate-folded correction
or a code-verified fact, the contract states how the fact survives: as a caption, as a remaining
sentence, or as something the visual itself must show. A rewrite that drops one of these facts
regresses a defect the gate already paid to find. The per-page "must survive" lists below are the
inventory; the rewrite task for each page checks its list before the page ships.

**The no-stub rule still binds, and it sequences the work.** No page ships a marker, a
placeholder, or a section naming a visual that does not exist. A page whose visuals are BLOCKED
on the live-reproduction seam keeps its current shipped prose untouched until the seam exists,
and is then rewritten once, against real reproductions. No page is rewritten twice.

## This record is an input to a brainstorming sitting, not a settled plan (Geoff, 2026-08-15)

Two things below are proposed rather than decided, and a Fable brainstorming sitting opens the
next pass to settle them against research.

**The 320/390 legibility bar for diagrams is an OPEN question, not a constraint.** This record
inherited it from the family-wide responsive standard, which was written for sites and UI, and
applied it to technical diagrams in developer documentation without asking whether it transfers.
Geoff's challenge stands: a reader is unlikely to study an architecture diagram on a 320px phone,
and the discipline has standard answers for this case that are not "make it legible at every
width" (click-to-expand, a pan-and-zoom container, a horizontal-scroll figure, a simplified
mobile variant, or an accepted minimum width). **Do not treat the 320 bar as binding until the
sitting rules on it**, and do not silently drop it either; it is a real bar for the site
artifacts it was written for.

**The visual approach as a whole wants research grounding.** The existing competitor review
(`2026-08-14-cms-docs-competitor-review.md`) studied structure, register, and routing across ten
corpora. It mentions screenshots five times in passing and **never studies visual practice as a
subject**, so the vocabulary proposed here rests on reasoning about cairn's readers rather than on
demonstrated success elsewhere. The sitting's research brief runs in three tiers, cheapest and most
authoritative first (Geoff, 2026-08-15).

1. **The published standards cairn already follows.** The Google developer documentation style
   guide governs three tracks and the Microsoft writing style guide governs `docs/editors`, both
   enforced here by Vale. Both carry explicit guidance on figures, screenshots, alt text, captions,
   and when an image earns its place. **cairn adopted their prose rules and ignored their visual
   ones**, so the first research step is reading what the standards it is already bound by say.

   **They are a floor, not a ceiling (Geoff, 2026-08-15).** Follow them by default, because that
   is usually right and always cheap, and deviate or improve where real-world evidence says the
   result is better documentation. Excellent documentation is the objective; compliance is the
   means, and where the two part company the standard yields. A deviation must be evidenced (name
   what the guide says, what is being done instead, and why, citing a measured result or
   demonstrated practice in a corpus known to be excellent) and recorded where the next writer
   meets it. The full rule now lives in [`docs-register.md`](../docs-register.md).
2. **Known-great exemplars**, studied for visual practice specifically: what kinds of visuals
   appear, at what density per page, how they survive product change, how they behave on small
   screens, and what tooling produces them.

   **Astro is the primary one, and worth more than a sampling (Geoff, 2026-08-15).** It is
   cairn's closest peer, a content-site framework serving the same developers on the same deploy
   targets, so its answers transfer more directly than a payments API's do. Its docs are open
   source, which means the *how* is inspectable and not just the output: the repo shows the
   tooling behind each visual, the review conventions, and its own published writing guide.
   Pass D already borrowed its tutorial devices, so it is a proven source for this project rather
   than a guess. Read it for how a diagram earns its place, how images are kept current across
   releases, and what it deliberately does without.

   Stripe, Twilio, Tailwind, MDN, Kubernetes, and the Rails and Django guides round out the set;
   the sitting picks the final list.
3. **The ten corpora already reviewed**, re-read through the visual lens the first pass did not
   apply.

Where a standard rules or an exemplar demonstrably succeeds, prefer the established convention over
an invented one, and depart from it deliberately and on evidence when the departure makes the docs
better. The per-track vocabulary and the per-page contracts below are the starting position that
research either confirms or revises.

## The visual vocabulary per track

Decided first, because it is an input to the writing. Each track's vocabulary follows from its
audience profile.

**Editors: live UI reproductions, nothing abstract.** The editor reads on the device the admin is
open on, mid-task, often mid-frustration. The thing being documented is a screen they are looking
at, so the right visual is that screen: the real engine component, rendered through cairn-pub's
`/help` pipeline with fixture data, pinned to the engine version the docs ship with. It cannot go
stale because it is the actual component. Flowcharts, architecture drawings, and anything
mermaid-shaped are out for this reader, with one deliberate exception (the save-publish loop on
`publish-and-history.md`, argued at that page). Where the shipped prose states a narrow-screen
variant, the reproduction renders at both widths, since "on a phone it looks different" is
exactly the class of fact a picture carries better than a sentence.

**Admins: the tool's transcript is the screenshot, plus a small set of authored diagrams.** The
admin's setup spine is `create-cairn-site` in a terminal, and the faithful visual for a terminal
tool is its own recorded output. The original outline ruled this ("admin-track narrative quotes
the tool's recorded transcripts") and built a CI transcript gate, and the shipped track then
carried zero fenced transcript blocks; that is a second dropped visual layer this rebuild
restores. On top of the transcripts, a few authored diagrams carry the structural facts the
prose currently strains at: what you own, how the setup journey forks, and the one
two-things-share-a-domain conflation. The vendor-link rule holds unchanged: no picture of a
Cloudflare or GitHub dashboard, ever. A vendor screenshot is the register standard's restated
vendor specific in image form, stale on a schedule cairn does not control.

**Extenders: authored diagrams, mermaid-first.** This reader consumes architecture, sequence,
and decision diagrams natively; every corpus in the competitor review that serves developers
uses them. The eight deleted diagrams return in their new homes, updated against the current
code, plus a small number of new ones where the shipped prose narrates an ordering or a topology
in a paragraph a picture states in a glance. The legibility bar is the family's responsive
standard: readable at 320 and 390, with a wide diagram scrolling inside its own container rather
than shrinking to illegibility. The retired "mermaid illegible at 320/390" carry-forward comes
back as a live constraint the moment the first diagram lands, and belongs in the showcase visual
suite as a gate, not a prose note.

**Contributors: out of scope.** The zone is unpublished and its reader reads source as ground
truth. Nothing here changes.

## Ruling on the reference arm: out of scope

The reference keeps its gated exception status and gains no visual layer, for three reasons.
First, its anatomy is signature, parameters, defaults, and failure modes under a short narrative
lede, machine-checked by four gates; a diagram in that anatomy is explanation, and explanation
lives in the extend track's concepts pages, which this plan gives the diagrams. Second, the
reference reader's success criterion is a precise lookup answered without reading engine source;
types and tables answer lookups, pictures do not. Third, every visual is a maintenance surface,
and the reference's whole defense against the category's loudest complaint (drift) is that its
surfaces are the ones the gates can check; a diagram is one they cannot. `log-events.md` stays
textual for the same reason. Where a reference page's subject benefits from a picture (the
delivery route topology, the guard order), the picture lives on the extend page that explains it,
and the reference links there.

The front door (`docs/README.md`, root `README.md`, `docs/why-cairn.md`) also stays visual-free:
its job is routing and the honest story, both textual, and nothing on it describes a screen.

## What to build first, ranked

The live-reproduction seam gates the editors track, which is where the largest gains sit, so the
ready work ships while the seam is built rather than after it.

1. **The extend track's authored diagrams** (READY). Highest restored value, no seam, and four of
   them re-home diagrams whose deletion the close-out wrongly recorded as a fix. Order within:
   `architecture.md` (two), `security-model.md` (two), `data-tiers.md` (two),
   `link-content-with-references.md`, then the new ones (`render-safety.md`,
   `build-a-site-by-hand.md`, `content-model.md`, `wire-the-delivery-surface.md`,
   `rotate-the-github-app-key.md`). Reinstate the 320/390 legibility gate with the first landing.
2. **The admin track's authored diagrams and transcript blocks** (READY, with a dependency). The
   diagrams are authorable now. The transcript blocks need recorded runs and the transcript CI
   gate the Pass D outline specified; the T-series spike records are the source. No invented
   output, per the standing rule.
3. **The live-reproduction seam itself.** Rendered real components through cairn-pub's `/help`
   pipeline with fixture data (a sample concept, sample entries, a small fixture library), at two
   widths where a page states a narrow-screen variant, theme-aware. Owned by the cairn-pub work;
   this plan consumes it and does not design it.
4. **The editors track rewrite** (BLOCKED on 3). The whole track rewrites in one pass against
   real reproductions, page by page per the contracts below, with each page's must-survive list
   checked at review. This is where the word count falls.
5. **The admin and extend live reproductions** (BLOCKED on 3, lower priority):
   `admin/invite-editors.md`, `extend/add-a-custom-admin-screen.md`,
   `extend/organize-your-admin-nav.md`. Each is one reproduction on an otherwise-finished page.

---

## The editors track (`docs/editors/`)

Expected net effect: the track's word count falls, on the order of a quarter. Every reproduction
below is BLOCKED on the seam unless marked otherwise, and per the no-stub rule the shipped pages
stay as they are until the seam exists.

1. **`README.md`** (index). Contract unchanged: the ordered `/help` sidebar. **No visual**: the
   reader arrives mid-problem and needs routing, not orientation imagery. Word count unchanged.

2. **`welcome.md`**. Contract: "what this editor is and how to get in."
   - *Shows:* a reproduction of the sign-in page (the email field and the **Send sign-in link**
     button) at "Signing in" step 1, and a reproduction of the confirm page (the **Confirm
     sign-in** button) at step 3. Both BLOCKED.
   - *Replaces:* the locating fragments of steps 1 and 3 ("Enter the email address your site
     owner added for you, then select **Send sign-in link**"; "The link opens a page that asks
     you to confirm").
   - *Must survive as prose:* the walk rank-1 fix, the page's most expensive sentence: "Go to
     your site's address followed by `/admin`. For example, if your site is `yoursite.com`, go to
     `yoursite.com/admin`", plus the bookmark instruction. An image cannot carry an address. Also
     the deliberate-sameness fact ("You'll see the same 'check your email' message either way")
     and the why behind the confirm step.
   - *Word count:* falls slightly, roughly 10%.

3. **`write-in-the-editor.md`**. Contract unchanged: the full writing guide. The track's largest
   rewrite; the `## The screen` section is the ROADMAP entry's own worked example of a screenshot
   rendered in words. Six reproductions, all BLOCKED:
   - **The entry screen**, at the top of `## The screen`: title field, toolbar with the Write and
     Preview tabs, the Details icon in the header, the writing surface. *Replaces* the whole
     first paragraph: "its title sits in a large field at the top, and the writing surface fills
     the rest of the screen. A toolbar sits above the text with two tabs: **Write**, where you
     type, and **Preview**, which shows the entry roughly as it will look on your site." *Caption
     carries:* "Every entry opens on Write."
   - **The sidebar and list view**, in `## Opening or starting a draft`: the concept sidebar,
     a Posts list with status badges, the **New post** button. *Replaces:* "Sign in and you'll
     land on a sidebar naming each kind of thing you write, such as **Posts** or **Pages**.
     Select one to see a list of everything that already exists, each row showing its current
     status." *Must survive:* the create dialog's address behavior (the walk rank-2 fix), which
     is behavior over time and stays prose: "Leave it blank and it fills in from your title as
     you type it... `Spring cleanup day` becomes `spring-cleanup-day`."
   - **The Preview tab with its width control.** *Replaces:* "Preview carries a width control,
     so you can check how an entry looks as a phone or a tablet shows it without needing one."
     *Caption carries* the code-verified fact: "Your choice is remembered on this device."
   - **The open Details panel.** *Replaces:* "The rest of the entry's settings live behind a
     **Details** panel, opened from the icon in the header. It holds things like whether it's
     hidden, what address it has, its tags, its date, and its lead picture." The enumeration
     becomes visible content. *Survives as prose:* the set-once-versus-everyday framing.
   - **The figure dialog** (caption field, the Measure/Center/Wide/Full placement choice), in
     `## Images`. *Replaces* the dialog-shape prose around "Put your cursor on the image, then
     select the toolbar button whose tooltip reads **Wrap the image at the cursor in a
     figure**." *Must survive as caption or prose:* the gate rank-8 fold (the button label flips
     to **Edit the figure at the cursor** once the image is in a figure, caption or no caption),
     the dim-until-cursor-on-an-image behavior, and the placement *meanings*, which depend on the
     site's own theme and stay described, not pictured.
   - **A Tidy review in progress** (one proposed change showing remove and add, one marked
     **Review this**), in `## Spelling and style`. *Replaces:* "Each proposed change shows what
     it would remove and what it would add in place, and some are marked **Review this** because
     they're a judgment call rather than an objective fix." *Survives as prose:* every behavioral
     rule (Accept fixes never applies a Review this; one Undo takes it all back; typing is locked
     during review).
   - Additionally, a small reproduction of a **collapsed layout block** with its margin control,
     replacing "Every block starts out collapsed to a single line, so a block-heavy entry reads
     as writing first when you open it. Select the control in the margin..."
   - *Deliberate no-visuals:* the toolbar shortcut tables (a table is the right form for
     shortcuts; one toolbar reproduction at the section top locates the groups, and the tables
     stay), the Links section (its load-bearing content is the `cairn:` token's behavior, which
     is textual), the two in-editor reference sheets (they live in the editor itself), and the
     footer comfort controls (the four meanings are behavioral; the entry-screen reproduction
     already shows where the footer is).
   - *Must survive globally:* the alt-text doctrine and the decorative-flag subtlety (the gate
     rank-2 editors fold: marking a body image decorative never clears the needs-alt flag; only
     a lead picture's decorative mark does).
   - *Word count:* falls roughly a third (about 237 lines today; expect around 160).

4. **`publish-and-history.md`**. Contract unchanged.
   - **The header band, at two widths** (desktop band with Save, Publish, and the opened
     overflow menu; the phone bottom bar). BLOCKED. *Replaces* the opening locating paragraph,
     which was the walk rank-3 fix: "**Save** and **Publish** sit together near the top of an
     entry's screen. On a narrow screen, like a phone, they sit instead in a bar fixed to the
     bottom. The overflow menu beside them, covered below, holds **History**, **Discard
     changes**, and **Delete**." The two-width rendering is what lets the fix survive as a
     picture instead of a sentence; if the seam ships single-width, the narrow-screen sentence
     stays.
   - **The save-publish loop**, a small authored diagram (READY, the track's one deliberate
     exception to the no-abstract rule): Write, Save to a private draft, Publish to the live
     site, edit again. The old corpus carried this twice (the `publish-and-discard` flowchart
     and the `write-in-the-editor` state diagram) because draft-versus-live is the track's core
     anxiety ("who can see this before I publish?"), and it is the one mental model on this
     track that is a loop rather than a screen. Drawn in the track's own vocabulary (no "branch",
     no "main"), placed between the Save and Publish sections. It shortens neither section much;
     it earns its place by answering the fear before the mechanics, which is the track register's
     own rule. Ships with the page rewrite, not before.
   - **The History list** (versions newest first with who and when, the unpublished draft row on
     top, a **Revert** button). BLOCKED. *Replaces:* "Open the overflow menu and select
     **History** to see this entry's past publishes, newest first, each with who published it and
     when. If you have unpublished changes right now, they show at the top of the list too,
     marked as a draft..." *Caption carries* two code-verified facts: the list caps at the 25
     most recent publishes, and it only reaches back to the last address change.
   - **The Publish site pending list** (the button with its count, the grouped pending entries).
     BLOCKED. *Replaces* the descriptive half of "Publishing everything at once." *Survives as
     prose:* the narrowed rank-3 claims fold, the button is absent while an entry is open.
   - *Word count:* falls roughly 20%.

5. **`when-something-goes-wrong.md`**. Contract unchanged. **One reproduction** of a
   representative refusal banner, at the top, BLOCKED: it shows the reader what class of thing
   the page's quoted messages name and where it appears on screen. It replaces no prose (the
   quoted messages are the page's substance and each quote is already the exact on-screen text,
   the page's own promise). *Must survive untouched:* every verbatim quote, the Vale suppression
   blocks around them, and the conflict-refusal correction ("Despite what this says, don't
   reload the page. Your text is already right there in the editor."), which is the
   persona-fix-adjacent, code-verified fact this track exists to keep. Word count unchanged.

6. **`add-an-image.md`**. Contract unchanged.
   - **The insert panel** (Upload an image, the reuse search below it). BLOCKED. *Replaces:* "A
     small panel opens with **Upload an image** at the top. Below it, a search lets you reuse a
     picture you've already uploaded to your site instead of adding a new one."
   - **The upload form** (the Name field with its **Suggested** mark, the
     alt-text-or-decorative choice). BLOCKED. *Replaces* the descriptive halves of the two
     bullets; the guidance halves (what alt text is for, who it serves) stay prose.
   - **The lead-picture dialog with its social-crop preview.** BLOCKED. *Replaces:* "its own
     dialog previews the shape it gets cropped to there."
   - *Word count:* falls roughly 25%.

7. **`manage-the-media-library.md`**. Contract unchanged.
   - **The library screen** (count header, search, the grid/list toggle, the three filters).
     BLOCKED. *Replaces:* "The library shows a count of how many images you have, how many are
     actually used on the site, and how much storage they take up. A search box filters by name
     or by alt text. A grid view shows thumbnails; a list view shows more detail in rows. Switch
     between them with the two buttons above the list." *Survives as prose:* the
     No-references-found caution ("This isn't a guarantee an image is truly unused... Check
     before deleting one").
   - **An image's details panel** (preview, name, address, where-used links, the Default alt
     text field). BLOCKED. *Replaces* the "Selecting an image" description. *Caption carries:*
     "Changing it here doesn't change the alt text already set on pages that already use the
     image."
   - **Bulk selection in grid view** (the thumbnail checkboxes, the selection bar with its
     count, **Select all**, and **Delete**). BLOCKED. *Replaces* the checkbox-location prose
     ("in the top-left corner of its thumbnail in grid view, or as the first column of its row
     in list view") and the bar description. *Survives as prose:* the keyboard chords, including
     the gate rank-6 finding's residue (grid view only; the list view has no keyboard path).
   - **The delete-in-use confirmation** (the what-would-break list, the typed-address confirm).
     BLOCKED. *Replaces* the shape description in "Deleting an image." *Survives as prose:* the
     rank-7 narrowed fold (replace's typed confirm is unconditional; delete's is conditional)
     and the no-undo warning.
   - *Word count:* falls roughly 30%.

8. **`manage-your-tag-vocabulary.md`**. Contract unchanged. **One reproduction** of the Tags
   screen (the Add field with the stored form appearing beneath it, the list with in-place
   rename, a trash icon beside an unused tag and a use-count beside a used one, the
   not-on-this-list section with **Add to list**, the **Save changes** button at the bottom).
   BLOCKED. *Replaces* the per-control locating fragments across four sections ("As you type, a
   short stored form of it appears below the field"; "Select the trash icon beside a tag with no
   posts using it"; "it appears in its own section below the main list with an **Add to list**
   button"). *Survives as prose:* the stored-form invariant (it never changes on rename, which is
   why renames are safe), the walk rank-4 fix (tags are applied to an entry in its Details panel,
   not here), the who-can-change-it sentence, and the nothing-applies-until-Save rule. *Word
   count:* falls roughly 20%.

## The admin track (`docs/admin/`)

Expected net effect: word count roughly flat. The gains here are recognition and structure, not
deletion; the track's money and boundary facts are sentences by nature. Everything below except
`invite-editors.md` is READY.

1. **`README.md`** (index). **No visual.** Routing only. Unchanged.

2. **`before-you-start.md`**. Contract unchanged: ownership, money, what stays yours.
   - **The five-asset ownership map**, an authored diagram (READY) at the top of "What you end
     up owning": the content repository, the GitHub App, the Cloudflare account (one Worker, two
     databases, one bucket), the domain, and the sign-in database, each labeled as yours, with
     the tool drawn as the thing that connects them rather than owns them. *Shortens* the five
     bullets to roughly a line each; the connective clauses ("created just for this site", "that
     the tool signs in to rather than creates for you") move into the diagram's labels. *Must
     survive as prose:* the leave-with-a-clone paragraph ("Cloning that repository is enough to
     leave with everything"), the "where your content lives on GitHub" gloss, and every fact in
     "What it costs", which stays entirely textual; a money diagram would freeze numbers the
     prose keeps dated and linked.
   - *Word count:* falls slightly.

3. **`create-your-site.md`**. Contract unchanged: from nothing to signed in, and back in.
   - **Recorded transcript blocks** (READY once the recorded-run fixtures exist), restoring the
     original outline's own ruling that the shipped page dropped: a fenced excerpt of the tool's
     real output at each stage boundary (the cost preamble, the GitHub App prompt, the deploy
     summary with the printed live address). Each block is CI-compared against a recorded run,
     never invented. *Replaces* the paraphrases of tool output, for example "Your terminal prints
     your site's live address, something like `https://your-site.workers.dev`" becomes the
     recorded lines themselves.
   - **The setup journey diagram**, authored (READY): scaffold, GitHub, Cloudflare, sign-in, with
     the browser moments flagged on the path. *Replaces:* "**Browser moments, in order:**
     creating your GitHub App, installing it on your new repository, signing in to Cloudflare if
     you aren't already, and the sign-in page the tool opens for you at the end." *Caption
     carries* the conditional count ("Three or four, depending on that middle one").
   - *Must survive as prose:* the walk rank-2 fix (the GitHub and Cloudflare account
     prerequisites, with the signs-in-doesn't-create sentence), the rank-3 App-permissions
     disclosure ("It can also manage the repository's settings, including deleting it..."), the
     ten-minute bootstrap link, and the whole "Getting back in" section.
   - *Word count:* roughly flat; transcripts add lines while paraphrase leaves.

4. **`own-your-domain.md`**. Contract unchanged.
   - **The one-domain-two-jobs diagram**, authored (READY), in "If this domain already has DNS
     records": one zone carrying two distinct groups, the organization's existing mail records
     (carried over unchanged) and cairn's own sending records (added at email onboarding), with
     the sign-in mail drawn leaving from `no-reply@yourdomain`. *Shortens* the numbered
     conflation block ("**Two different things share this one domain, and it's easy to conflate
     them**...") to a caption plus one sentence each. *Must survive as prose:* the first-class
     "stop and talk to whoever runs your DNS" branch, verbatim in force.
   - **The nameserver switch**, a small authored before/after diagram (READY): registrar pointing
     at the old pair, then at Cloudflare's pair, with the site answering at `workers.dev`
     throughout. *Shortens:* "Your domain still points at whatever nameservers it used before,
     until you go to your registrar (wherever you bought the domain, not Cloudflare) and change
     them to the pair Cloudflare gave you." *Caption carries* the propagation window (minutes to
     48 hours) and nothing-is-broken-while-you-wait.
   - *Deliberate no-visual:* the two-token structure and Workers Builds. Both are account and
     token facts behind vendor pages; the vendor-link rule governs, and the token-scope warning
     (the confirm-every-row defect) must stay a warning in words.
   - *Word count:* falls slightly.

5. **`is-it-working.md`**. Contract unchanged: entered from a FAIL, not read in order.
   - **One recorded doctor transcript** (READY with the fixtures), under "Running the check": a
     real `npx cairn-doctor` report showing pass, fail, and skip lines together. *Replaces:*
     "reports one line per check: a pass, a fail, or a skip when a check has nothing to look at
     yet (an unconnected domain, say)." It also does silent work the prose cannot: a reader who
     has seen a skip line in a real report recognizes that a skip is visually just another line,
     which is the trap the surrounding section exists to defuse.
   - **Deliberate no-visual everywhere else.** The condition entries are an anchor-gated lookup
     surface (`check:readiness` holds 20 anchors against the built registry); their anatomy is
     textual by design, and a diagram would add a surface no gate checks. *Must survive:* the
     run-it-yourself versus can't-run-it-at-all split (the headline persona-walk fix), the
     hand-built-site scoping on the CSRF check, and the site-config skip disclosure.
   - *Word count:* roughly flat.

6. **`setup-recovery.md`**. Contract unchanged. **Deliberate no-visual:** the resume tables are
   already the page's visual form, one row per interruptible step, and a state diagram of the
   same machine would duplicate them without replacing them. Unchanged.

7. **`invite-editors.md`**. Contract unchanged. **One live reproduction** (BLOCKED) of the
   `/admin/editors` roster screen: the add form at the bottom, roster rows with **Remove** and
   the role control, the reader's own row with both controls disabled. This is an engine-owned
   screen, so the editors track's reproduction vocabulary applies to this one admin page.
   *Replaces* the locating prose in "Add an editor" and "Remove an editor, or change their
   role" ("At the bottom of the page, fill in their name..."; "Next to each row, **Remove**
   takes that person off the roster entirely; the button beside their role changes their
   role..."). *Must survive as prose:* the rank-13 fold (roles beyond the owner/editor pair
   appear when a site declares them), the last-owner protection, the no-invitation-email fact,
   and the Workers-Paid precondition opener. *Word count:* falls roughly 20%.

8. **`troubleshooting.md`**. Contract unchanged. **Deliberate no-visual:** the page's instrument
   is the log record, which is textual, and its rows are the symptom-row anatomy. The
   Workers Logs surface is a vendor dashboard and stays behind its link. Unchanged.

## The extend track (`docs/extend/`)

Expected net effect: word count roughly flat, falling slightly on the concepts pages, where
diagrams absorb enumerations while the reasoning stays. All diagrams here are authored
(mermaid unless noted) and READY. Pages not listed carry **no visual, deliberately**; the
blanket reason is that they are code-first task guides whose worked snippets are already the
visual layer this reader wants, and the profile warns against hand-holding this reader on their
own stack. That covers: `README.md` (index; also keeps the vocabulary section, textual),
`add-cairn-to-a-sveltekit-app.md`, `define-an-adapter-and-schema.md`,
`declare-your-own-concept.md`, `configure-rendering.md` (links render-safety's pipeline diagram
instead of duplicating it), `add-an-island.md` (hydration is this reader's own stack),
`reuse-content-across-entries.md` (the one-pass rule is textual; the `resolveFragment` drop
warning stays prose), `migrate-existing-content.md`, `enable-tidy.md` (the editor-facing Tidy
reproduction lives on the editors track; this page is configuration),
`announce-on-publish.md`, `share-a-draft-preview.md`, `choose-an-ai-posture.md` (the fork device
is textual by the standing rule: choice, price, default), `restrict-admin-access.md`
(authorization semantics; the hiding-is-not-denying rule must stay a stated rule),
`add-a-second-audience.md` (the fork is already two labeled decisions with prices),
`debug-your-site.md` (the symptom table is the form), `upgrade-cairn.md` and
`migration-notes.md` (version records and steps; nothing topological), and
`auth-channel-security-model.md`, argued below.

1. **`architecture.md`**. Two diagrams return, updated to the current export map:
   - **The system block diagram** at the top: the site (adapter, admin mount, delivery routes),
     the engine's four subpaths (core, `/sveltekit`, `/components`, `/delivery`), and the three
     stores (git, D1, R2). Updated from the deleted `docs/explanation/architecture.md` original.
     *Shortens* the second paragraph's export enumeration ("`@glw907/cairn-cms`'s root barrel
     exports the adapter-declaration functions... `/sveltekit` exports the route factories and
     the guard..."); the paragraph keeps its reasoning sentence (why the three-way split exists)
     and drops the inventory the diagram now carries.
   - **The write-path sequence diagram** in "The write path": editor, admin, GitHub App, holding
     branch, main, the site's own deploy, with the author/committer split labeled on the commit
     arrow. *Shortens:* "Saving an entry commits to a per-entry holding branch, named
     `cairn/<concept>/<id>`, through the configured Backend... Publishing is a second, deliberate
     action that copies the holding branch's content onto the default branch, which is what
     actually triggers a site's existing deploy." The whys (drafts iterate; history is honest)
     stay prose.
   - *Word count:* falls slightly.

2. **`security-model.md`**. Two diagrams:
   - **The trust-boundary diagram** (returns, updated): editor's browser through the guard to
     the commit pipeline and the repo, then deploy, then the render pipeline to the visitor's
     browser, with the two models labeled on their halves (this page's model on the left, render
     safety's on the right). Placed after "The threat model", it makes the two-model split one
     picture. *Shortens* the cross-referencing sentences at the ends of "The threat model".
   - **The guard order**, a new small ordered-flow diagram in "The guard's request order": dev
     tripwire, non-admin origin check, https help page, bindings check, CSRF, session resolve.
     *Replaces* the single dense enumerating sentence spanning that paragraph; each step's
     rationale clause survives as a short list item beside the diagram. *Must survive:* every
     step logs a named `guard.rejected` reason.
   - *Word count:* falls slightly.

3. **`content-model.md`**. **One small diagram**: the fieldset as single source, fanning out to
   its three products (the editor's form, the server-side validator, the inferred TypeScript
   type). *Replaces* nothing structural; it shortens "The fieldset is the single source of truth
   for three things at once: the editor's form, the server-side validator, and the inferred
   TypeScript type a site reads its own entries as" into a caption. *Deliberate no-visual* for
   ids, filenames, and routing: worked filename examples (`2026-08-14-my-post.md`) do that job
   better than a drawing. *Word count:* flat.

4. **`data-tiers.md`**. Two diagrams:
   - **The three-tier map** at the top: git (entries, the two manifests), D1 (the five tables,
     with the opt-in migrations marked), R2 (bytes by content hash), each labeled with its
     selection rule. *Shortens* the section-opening enumerations; the per-tier reasoning stays.
   - **The media-storage flow** (returns, updated from the deleted `media-storage.md` original):
     upload splitting into content-addressed bytes to R2 and a manifest row in git, both meeting
     at the delivery URL. *Shortens* the R2 section's mechanics sentences ("Bytes are addressed
     by their own content hash: the same image uploaded twice is stored once, and the media
     manifest, keyed by a 16-hex hash prefix, is the dedup lookup...").
   - *Must survive:* the gate rank-3 narrowed fold (the adapter member is `media`, never
     `assets`) anywhere the diagram labels the adapter, and the manifests' different keying
     (concept-and-id versus content hash) as a caption.
   - *Word count:* falls slightly.

5. **`link-content-with-references.md`**. **The delete-guard decision diagram** (returns,
   updated from the deleted `reference-integrity.md` flowchart): delete requested, manifest
   inbound check, the cross-branch index build with its strict failure, refuse or proceed.
   Placed spanning "The delete guard" and "What blocks and what only warns". *Shortens* the
   blocks-versus-warns enumeration; the asymmetry's reasoning (a body `cairn:` link degrades
   visibly, a reference field does not) survives as prose. *Must survive:* the byte-preserving
   rename fact and the build-gate-is-the-only-backstop sentence. *Word count:* flat.

6. **`render-safety.md`**. **The pipeline-order diagram**, new: parse, `rehype-raw`, the
   sanitize floor, component `build()` dispatch, `rehypeSinkGuard`, anchor hardening, with the
   `unsafeDisableSanitize` switch drawn spanning exactly the floor and the sink guard. Ordering
   is this page's hardest content and currently lives in scattered sentences ("The sanitize
   floor runs before a site's own component `build()` functions execute, deliberately...";
   "`rehypeSinkGuard` runs last, over the fully built tree"). The diagram carries the order; the
   prose keeps the whys and the exact allowlist details. `configure-rendering.md` links here
   rather than duplicating. *Word count:* falls slightly.

7. **`auth-channel-security-model.md`**. **Deliberate no-visual.** The page's load-bearing
   content is an invariant ("no control keyed on the victim's identity may deny, delay, or
   destroy") and its three-failure history, plus three correctness obligations. None of that is
   a topology, and a budget-flow diagram would imply a fixed structure the contract deliberately
   does not promise. A security contract's precision lives in its sentences; this page stays a
   findable, fully textual contract, the same reasoning that kept it a standalone page at the
   adversarial gate.

8. **`wire-the-delivery-surface.md`**. **One small diagram**: the one content index feeding the
   five surfaces (entry catch-all, the `.md` twin, feed, sitemap, `robots.txt`), with the
   `[...path=md]` matcher drawn claiming `.md` requests ahead of the plain catch-all.
   *Shortens* the intro enumeration and the route-coexistence paragraph's first half; the
   measured content-type findings stay entirely prose, since they are evidence, not structure.
   *Word count:* flat.

9. **`build-a-site-by-hand.md`**. **The milestone map**, new, at the top: the five milestones
   with what runs after each, and the dev-backend fence drawn across milestones 2 through 4 with
   the real-credentials swap at 5. The track's trickiest mental model is that `/admin` works
   locally in 2 and deliberately does not work deployed in 4; the map states it once, in
   advance. *Shortens* the intro's second paragraph and milestone 4's expectation-setting
   ("`/admin` on the deployed site does **not** work yet: the dev backend is stripped from a
   production build by design..."), which survives as a shorter sentence pointing at the map.
   The write-path picture is not duplicated here; milestone 5 links `architecture.md`'s
   sequence diagram. *Must survive:* the no-`svelte.config.js` fact and its doctor-skip
   consequence, the `__CAIRN_DEV_BUILD__` inlining rule, and the `ORIGIN` rebake step (gate
   rank-2's fold). *Word count:* flat.

10. **`what-the-scaffold-wrote.md`**. **A fenced directory tree** at the top (plain text, READY,
    not a diagram): the generated tree at one glance, orienting the per-file map below.
    *Replaces* nothing; it is the page's own table of contents in the shape the reader's editor
    shows them. *Must survive:* the `APP_DB`/`migrations-app/` rows and the `probe-craft/`
    disclosure (both gate folds). *Word count:* flat.

11. **`organize-your-admin-nav.md`**. **One live reproduction** (BLOCKED): the rendered sidebar
    produced by the page's own worked `navLayout`, placed directly under that snippet, with the
    fallback group visible below the divider. The code-to-result pairing is the fastest way this
    reader confirms the tree semantics. *Shortens* "What happens to a screen you never mention"
    ("Anything the tree never references still renders, in a trailing group after a divider...")
    to a caption plus the rule. *Must survive as prose:* hiding is never authorization, and the
    cookie-wins collapse behavior. *Word count:* falls slightly.

12. **`add-a-custom-admin-screen.md`**. **One live reproduction** (BLOCKED): the worked screen
    composed from the toolkit primitives, rendered inside `CairnAdminShell`, placed at "Compose
    the screen". The shell and toolkit's coherent look is a stated reason to build inside them,
    and no page currently shows the result of doing so. *Replaces* little prose (the section is
    code-first); it earns its place as the visible payoff of the composition contract. *Must
    survive:* the walk rank-2 fold (`sequence(createAuthGuard(), ...)`, never a bare `handle`
    overwrite) and the `defineAccess` roles precondition pointer (the walk's stopping-point
    fix). *Word count:* flat.

13. **`rotate-the-github-app-key.md`**. **One small authored timeline** (READY): the old and new
    keys' validity overlapping, with the swap point marked. *Replaces* the narrative half of
    "Why there's no downtime window". The steps stay steps. *Word count:* flat.

## What this record could not resolve

- **Whether cairn-pub's `/help` and `/docs` pipelines render mermaid today, and at what
  legibility.** The old corpus's diagrams and the retired 320/390 carry-forward imply they
  rendered somewhere, but the current pipeline was not verified from this repo. The first
  wave-1 diagram landing must verify rendering and reinstate the legibility gate before the
  rest follow.
- **Whether the recorded-run fixtures the transcript CI gate needs exist in consumable form.**
  The Pass D outline specified the gate and the T-series spikes recorded live runs, but the
  admin track shipped without transcript blocks, so the fixture path is unproven. If no recorded
  run covers a stage, that stage's transcript block waits (no invented output), and the
  narrative prose stays.
- **The live-reproduction seam's actual contract** (fixture data, width variants, theme
  handling, version pinning). This plan states what the pages need from it; designing it belongs
  to the cairn-pub work, and the editors rewrite cannot be scoped more finely until the seam's
  constraints are known, in particular whether two-width rendering ships in its first version
  (it decides whether `publish-and-history.md`'s narrow-screen sentence survives).
