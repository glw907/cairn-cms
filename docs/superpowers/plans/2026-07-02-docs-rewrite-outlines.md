# Docs rewrite: the twelve open-shape outlines

The outline-gate artifact for `2026-07-01-docs-rewrite-stage-2.md`: heading-plus-one-liner
skeletons for the documents whose structure is genuinely open, drafted ahead of the pass
(front-loaded 2026-07-02) for the single batched adversarial review. Settled-shape pages are
not outlined. Each outline opens with its one-line job from the IA.

## 1. `README.md` (repo root, and the npm front door)

**Job:** the ten-second answer to "what is this and is it for me," funneling to the docs.

- *(opening, no heading)* — Two sentences: what cairn is (embedded magic-link CMS library for
  SvelteKit/Cloudflare; editors write markdown, publishing commits to git) and the two personas
  (the developer who owns everything; the editor who gets a humane tool). One sentence of
  dual-mode: an almost-end-point for simple sites, a foundation for ones that grow.
- **Quick look** — One `npm create` / install block plus a four-line adapter sketch; a
  screenshot-free description of the thirty-second experience (Wayfinder link once live).
- **Is cairn right for you?** — Three bullets for, three against (no Cloudflare account, React
  team, open-ended collections), linking `why-cairn` for the argued version.
- **Documentation** — The four arms in one line each, linking the docs front door.
- **Status** — Pre-1.0 posture, versioning promise, the two production sites, CHANGELOG pointer.
- **License** — One line.

## 2. `docs/README.md` (the docs front door)

**Job:** route the two audiences and give the reading path.

- *(opening)* — One paragraph: developers start here-then-there; editors are usually sent
  directly to a For-editors guide by their developer.
- **Start here** — The reading path: why-cairn → tutorial → guides/reference on demand.
- **The four arms** — Tutorial / Guides (For developers, For editors) / Reference / Explanation,
  one line each with their indexes.
- **Vocabulary** — The six-to-eight terms (concept, adapter, seam, owner/editor, holding
  branch, island), one sentence each.

## 3. `docs/explanation/why-cairn.md`

**Job:** the positioning page — who cairn is for and not for, with the stack argued.

- *(opening)* — The dual-mode thesis as cairn's charter seen from the user's side; Wayfinder
  named as its visible instantiation, not its carrier.
- **What cairn is** — The one job (markdown content + editor/admin frame) and the thin-seam
  boundary; fixed concepts, not collections.
- **Who it serves** — The two personas, each in its own short section (the developer's
  ownership story; the editor's humane-tool story).
- **Why this stack** — Three subsections, each an argued trade-off with its cost named:
  *Why Cloudflare* (complete small-site substrate; the refused portability layer is what keeps
  the engine small), *Why SvelteKit* (form actions before JavaScript match the admin; islands
  match mostly-static sites), *Why DaisyUI, for the admin only* (extension in the most
  copyable idiom).
- **Who should not choose cairn** — The honest section: the three named exclusions, plainly.
- **Where cairn sits** — One short paragraph: the Kirby/Eleventy/iA Writer triangle, no
  competitor bashing, Ghost as the road deliberately not taken.

## 4. `docs/tutorial/build-your-first-cairn-site.md` (milestone-level outline)

**Job:** the guided build, empty directory to running site, on the surviving ten-milestone
skeleton. Milestones (payoff moments marked ★, diagrams marked ◆):

- **M0 Orientation** — What you'll build; the "fastest path" seam (scaffolder mount point).
- **M1 Project shell** — SvelteKit + adapter + the wiring files.
- **M2 The adapter** — defineAdapter/defineConcept; fields.
- **M3 Content on disk** — First markdown entries; the manifest. ◆ *the two-file config
  boundary (adapter vs site.config.yaml)*
- **M4 Rendering** — createRenderer, the render seam, first page in the browser. ★ *first page*
- **M5 The delivery surface** — createSiteIndexes, routes, feeds/sitemap/robots.
- **M6 Auth + D1** — Magic-link store; the bindings idiom (`CairnPlatformBindings`).
- **M7 The GitHub App** — Identity as adapter config; the key as the one secret.
- **M8 The admin** — The five-file mount; first login; first save. ★ *first save* ◆ *save →
  holding branch → publish → deploy flow*
- **M9 Publish** — The deliberate publish; what lands on main. ★ *first publish*
- **M10 Deploy** — Cloudflare, doctor, live. ★ *first deploy; the celebratory close*

## 5. `docs/guides/migrate-existing-content.md`

**Job:** bring existing markdown (Hugo/Jekyll-shaped) into cairn concepts.

- *(opening)* — The claim: content is directories of markdown; migration is mapping, not
  conversion.
- **Map your content to concepts** — Posts/pages sorting; what has no cairn home (and why
  that's the charter, not a gap).
- **Translate the frontmatter** — Field-by-field mapping table pattern; dates and the URL
  identity (permalink preservation, `datePrefix`).
- **Shortcodes and embeds** — The honest section: theme shortcodes map to cairn components or
  get rebuilt as your own; a worked example (one shortcode → one `defineComponent`).
- **Verify** — Manifest, build, a permalink spot-check list.

## 6. `docs/guides/add-authors.md`

**Job:** teach declare-your-own-concept + `fields.reference` through the authors case.

- *(opening)* — The reframe: "does cairn support authors?" is the wrong question; concepts are
  yours to declare, and this guide is the pattern for a whole class of such questions.
- **Declare the concept** — An `authors` concept: dir, fields, no routing.
- **Reference it** — `fields.reference` on posts; what the editor sees; rename/delete safety
  for free.
- **Render it** — resolveReferences on the site's routes; a byline component sketch.
- **The pattern generalized** — One paragraph: projects, events, testimonials — same move.

## 7. `docs/guides/troubleshooting.md`

**Job:** symptom → log event → fix; the day-two page.

- *(opening)* — How to read this page; where logs live (one line + link to read-cairn-logs).
- **An editor can't sign in** — auth.link.send_failed / guard.rejected table.
- **A save does nothing** — commit.failed; conflict vs error.
- **Publishing doesn't deploy** — The pipeline checkpoints.
- **Media misbehaves** — Upload/replace/delete failure shapes.
- **The build fails** — Manifest staleness; the snippet/config errors with loud messages.
- **Run the doctor** — When symptoms don't match: doctor flags and reading its output.

## 8. `docs/guides/upgrade-cairn.md` (the thin replacement)

**Job:** the upgrade *process*, with history living in the CHANGELOG.

- *(opening)* — The promise and the mechanism, three sentences.
- **Upgrade** — Bump the range; read `Consumers must:` between your versions; run doctor;
  run your gate.
- **How cairn versions** — The scheme in one paragraph (post-beta: compatibility SemVer;
  pre-release semantics during beta).
- **When something breaks anyway** — File an issue with the log record; the support promise.

## 9. `docs/explanation/security-model.md` (restructure)

**Job:** the trust-model hub — every boundary's guarantee, residual, and why; mechanics live
in their own pages.

- *(opening)* — The three boundaries in one paragraph; how to read this page.
- **Cairn handles / your site handles** — THE table (per boundary: what the engine guarantees,
  what remains the developer's).
- **Who may edit** — Magic-link + sessions: guarantee, residual (inbox compromise), why
  (the D1 single-use design, POST-confirm, OWASP-cited bound). ◆ *trust-boundary diagram*
- **What a save may write** — CSRF + commit pipeline + content-directory confinement:
  guarantee, residual, why.
- **What rendering may output** — Guarantee + developer-controlled residual, three sentences,
  link to render-safety for the exhaustive what. *(The duplication dies here.)*
- **Reference integrity** — Same shrink: guarantee + link.
- **Reporting** — The disclosure pointer, procedural, four lines.

## 10. `docs/explanation/media-storage.md` (rescope)

**Job:** why media works this way — bytes in R2, references in git, hash identity.

- *(opening)* — The split in one paragraph. ◆ *bytes/reference split diagram*
- **Why bytes don't live in git** — The argument, not the API.
- **Why identity is a content hash** — Dedup, replace semantics, immutability.
- **Why transforms are on-demand** — And the external-zone-state honesty (`transformations`).
- *(everything API-shaped moves to reference/media.md)*

## 11. `docs/internal/docs-maintenance.md`

**Job:** the standing hygiene model; freshness as a system.

- *(opening)* — The claim: gates catch what they can, the pass rule covers what they can't,
  the drift routine samples what neither sees.
- **The machine layer** — The gate inventory table: each gate, what it catches, what it can't.
- **The pass layer** — Docs-is-a-pass-dimension restated as the one human rule; the
  grep-for-the-old-name discipline.
- **The drift layer** — The monthly sampled fact-check routine: what it does, its id, how to
  read its reports.
- **When Topo lands** — The constraints ledger items that join this doc (docs-build CI,
  llms.txt).

## 12. `examples/showcase/README.md`

**Job:** name the double life — the Wayfinder template and the tutorial's companion.

- *(opening)* — Two sentences: what this directory is, its two jobs.
- **Running it** — Three commands; where the dev backend fits.
- **Using it as a starting point** — The scaffolder relationship; what to change first
  (tokens, content, config) — three lines each.
- **Keeping it honest** — One paragraph: this example is the template cairn ships and the
  live site at cairn.pub; treat changes accordingly.
