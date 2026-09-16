# Facts container review: evolution feasibility lens

Reviewer: fresh-context adversarial, read-only. Subject: `docs/internal/facts/` at `main` (b9282369).
Lens: can the public arms be rebuilt from these bullets after the arms are deleted, does the container
survive the site round, and what does a facts-only record lose? Grammar, charter, and cost are other
reviewers' lenses.

Method: read `facts/README.md`'s contract, then tested one page per arm against its bullets:
`docs/admin/create-your-site.md` + `is-it-working.md`, `docs/editors/write-in-the-editor.md`,
`docs/extend/build-a-site-by-hand.md` + `add-cairn-to-a-sveltekit-app.md`, `docs/reference/core.md`
and the two reference gates, and `docs/why-cairn.md`. Also read the gate scripts that consume the arms.

## Findings, ranked

1. **Seven gates read the arms and the container restores none of them.**
   `scripts/checks/check-snippets.mjs:47` (`DOC_DIRS = ['docs/reference','docs/extend','docs/admin','docs/editors']`),
   `check-symbols.mjs:56-59`, `transcript-blocks.mjs:23`, `check-arm-indexes.mjs:30-32`, `check-editor-quotes.mjs:30`,
   `check-readiness.mjs:13`, `check-package-files.mjs:70-89`. Deleting the arms silently retires the
   hallucinated-symbol and stale-snippet defenses, the exact drift class the container exists to prevent.

2. **Shipped engine code points into the arm the pass deletes.**
   `src/lib/diagnostics/conditions.ts:22` ("'is-it-working.md#<heading-slug>' so a doc can link it relative
   to docs/admin/"), with ~25 `docsAnchor` values at `:40` onward, pinned fail-closed by `check-readiness.mjs:13`.
   No fact bullet carries a heading anchor, so the pointer breaks and the gate has nothing to pin against.

3. **The reference arm cannot become fact bullets: the signature gate parses fenced `ts` blocks.**
   `scripts/checks/check-reference-signatures.mjs:1-8` scans "the page's fenced ts blocks for that name's
   declared signature"; `reference-coverage.mjs` CONFIG maps each subpath to exactly one page. `docs/reference/`
   holds 239 `ts` fences; `docs/internal/facts/*.md` hold **zero** fences.

4. **facts/reference.md is a gotcha harvest, not a per-export catalog.**
   `docs/internal/facts/reference.md:291-326` gives `core.md` seven bullets (permalink default, maxUploadBytes,
   canReach, ...) against that page's 49 signature blocks and ~150 `###` export headings arm-wide. Moving the
   arm into the container must move the pages verbatim; reformatting them into this shape loses the type contract.

5. **No worked code survives anywhere in the container.**
   `docs/extend/` carries 131 fenced blocks; `build-a-site-by-hand.md` alone has 33 across five milestones
   (`wrangler.jsonc`, `app.d.ts`, `cairn.config.ts`, `hooks.server.ts`, route files). `facts/extend.md`'s
   20 bullets for it *describe* them ("page's own worked `wrangler.jsonc` example") and carry none of them.

6. **Every `**Act:**` remedy is missing.** `docs/admin/is-it-working.md:170-172` gives `edge.https-not-forced`
   its fix (Always Use HTTPS, keep HSTS, Cloudflare's own linked page); `facts/admin.md:42` records the
   diagnosis only. The pattern holds across all ~25 condition sections: the container kept the symptom half.

7. **The container's taxonomy is the page tree the pass deletes.** All 55 section headers across the arm files
   are `## docs/<arm>/<page>.md`. Once the arms are gone a `cairn-fact` call from a site pass has no destination
   header to file under, and `gaps.md:35,41,49` already cite paths that will not exist.

8. **107 of 335 extend facts (32%) source only to a doc page.** Sampled at `facts/extend.md:53,82,103` and
   throughout: "Source: page text", "page's own mermaid diagram", "[verified via cross-page duplicate]".
   Counts by arm: extend 107, reference 35, front-door 17, admin 13, editors 2. After the deletion these are
   tagged `[verified]` but trace to nothing, which is worse than an honest `[candidate]`.

9. **No per-fact version or date.** Provenance is file-level (`facts/extend.md` "Harvested 2026-09-15").
   `gaps.md:17-19` argues a version field is mandatory because "a gap with no version attached can't be told
   apart from a stale one"; the same argument applies to facts, which two engine passes and a release will age.

10. **All 10 mermaid diagrams are lost.** `docs/admin/create-your-site.md:100-127` (setup journey, browser
    moments), plus `extend/architecture.md` (2), `security-model.md`, `data-tiers.md`, `render-safety.md`,
    `link-content-with-references.md`, `build-a-site-by-hand.md`, `rotate-the-github-app-key.md`,
    `admin/own-your-domain.md`, `admin/before-you-start.md`. Facts cite diagrams as *sources* and never carry
    their content; `check-visuals.mjs:1-12` enforces their accTitle/accDescr/caption contract today.

11. **The recorded-transcript corpus is orphaned.** `docs/admin/create-your-site.md` carries 3
    `<!-- transcript: -->` markers (`:35,:55,:133`) and `is-it-working.md` one, replayed against pty fixtures
    with per-page floors at `transcript-blocks.mjs:33-34`. No fact records a transcript, a fixture path, or the
    "recorded proof, not a paraphrase" convention.

12. **Editor-facing behaviors only the prose carried.** `docs/editors/write-in-the-editor.md:33-36` states what
    survives a paste from a word processor (headings, bold, italic, links, lists marked; tables and images
    arrive plain) and `:171` the markdown-help "?" sheet. Neither is in `facts/editors.md`: grep "paste" returns
    only the media-upload path at `:75`, grep "help" returns nothing.

Also noted, below the cut: `facts/README.md:3-9` declares the container "never shipped" and lists
`docs/reference/` as one of the arms it is not, while `:13-17` fixes the format at one bullet per fact. The
planned pass ships the container in the tarball with `docs/reference/` inside it, so the contract has to be
rewritten before the move rather than violated by it.

## Verdict

Deleting the arms now is not safe. The container is a genuinely strong record of *what is true and surprising*
about cairn, verified to a standard the arms themselves never met, and it will earn its place as the fact basis
a rebuild checks against. But it was harvested as a claims audit, not as a rebuild source, and three classes of
content are absent by construction: worked code (zero fences against 131 in the extend arm alone), remedy and
sequence prose (every `**Act:**` paragraph, every step order the narrative carries), and figures. A writer
handed only these bullets could rebuild a correct reference stub and a plausible editors page, but not the
getting-started page, not `build-a-site-by-hand`, and not any page whose value is the ordered walk. Worse, the
deletion is not doc-only: `check:snippets`, `check:symbols`, `check:transcripts`, `check:readiness`,
`check:arm-indexes`, `check:editor-quotes`, `check:visuals`, and `check:package` all read the arms, and
`conditions.ts`'s shipped `docsAnchor` values point into `docs/admin/`. Minimum before any arm is removed:
(a) move `docs/reference/` as *pages*, fences intact, repointing CONFIG and DOC_DIRS rather than reformatting;
(b) extend the bullet form to carry fenced code, and repoint `check:snippets` and `check:symbols` at the
container so the corpus keeps its teeth; (c) replace the page-path taxonomy and add a per-fact `since <version>`
field before `cairn-fact` writes its first entry; (d) harvest what only the prose holds, every `**Act:**`
remedy with its anchor slug, the ten diagrams' content and captions, the transcript markers, and the ordered
steps; (e) resolve or retag the 174 doc-only `[verified]` citations; (f) decide each orphaned gate's fate in the
same pass, not after. Split that as its own task ahead of the deletion; the deletion itself is the cheap half.
