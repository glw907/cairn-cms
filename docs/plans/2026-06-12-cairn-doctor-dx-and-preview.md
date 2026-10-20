# Doctor DX and the iframed preview (0.51.0)

**Status: LANDED on `main` and PUBLISHED 2026-06-12 as `0.51.0`. Post-mortem at the end.**

## Why

Two sources, one release. The ecxc 0.50.0 retrofit surfaced three doctor and floor gaps live:
the doctor asked for flags (`--from`, `--repo`, the account id) that are derivable from the repo
it runs in; the manual live proof (login-page envelope plus a CSRF round-trip POST) is mechanical
and belongs in the doctor as a zero-side-effect probe; and the svelte `^5.56.3` floor lives only
in a changelog note, so ecxc's lockfile sat on the miscompiling 5.56.0 with every gate green.

Separately, Geoff reported the edit-page preview broken in production use: links do not show,
and components render as giant icons. The root cause is architectural. The preview renders the
site's markup inside the admin document, where the site's stylesheet deliberately never loads
(the 0.33 chrome isolation), so the markup is class-correct but unstyled: inline SVGs have no
width rule, and the admin sheet's scoped anchor reset hides links. Design-accurate preview needs
the site's CSS without re-polluting the admin, which means an iframe.

## The shape

**Doctor arm.**
- `cairn-doctor` derives missing inputs from the repo: `backend.owner`/`backend.repo` and
  `sender.from` by evaluating the consumer's config module through the manifest bin's existing
  nested-Vite machinery, and the account id from the wrangler config. Precedence: flag, then
  env, then derived. Degrades to the current skip behavior when derivation is impossible.
- `cairn-doctor --probe <url>`: a live check against the deployed admin. GET `/admin/login` and
  assert the envelope (200, `__Host-cairn_csrf` cookie, rendered csrf field, the `?/request`
  form); then POST the login action with a random non-editor email and assert the uniform
  `{ status: 'sent' }`. The non-leak design makes this side-effect free: a non-editor request
  sends no email and mints no token. One new registry condition for the probe, with its
  checklist anchor.
- Dependency floors get teeth: `peerDependencies` declares svelte `^5.56.3`, and a new local
  doctor check reads the consumer's lockfile against the engine's declared peer floors. One new
  registry condition plus anchor.

**Preview arm.**
- The adapter gains an additive `preview` knob: `{ stylesheets: string[]; bodyClass?: string }`.
  A site passes its compiled CSS URLs (a Vite `?url` import of its `app.css` resolves the hashed
  asset URL at build time). `composeRuntime` carries it onto the runtime.
- `EditPage`'s preview pane becomes an iframe (`srcdoc`): the rendered HTML wrapped in a minimal
  document that links the adapter's stylesheets and applies `bodyClass`. Sandboxed (no scripts;
  the sanitize floor already strips them, the sandbox is belt and braces), links inert inside
  the frame. No `preview` knob configured degrades to the same iframe with no stylesheets, which
  is no worse than today and correctly sized.
- Preview mode takes the full surface: the sidebar (Details/Visibility/Address) collapses while
  the Preview tab is active, so the document renders at a standard width.
- Device selection lives on the Preview tab itself (Geoff's direction, 2026-06-12): the tab
  carries a dropdown with the four widths, Desktop (100%), Tablet (768), Phone (390), and
  Small phone (320), the frame centered and the choice persisted per the editor-preferences
  idiom the page already uses. The dropdown follows the design system's popover pattern, and
  the UI work runs through the frontend-design skill with a critique pass (the 0.40.0 Task 10
  precedent) before the fidelity gate.
- The showcase wires `preview.stylesheets` with its plain `site.css`, proving the knob without
  Tailwind. Docs: the adapter reference, the editor guide section on preview accuracy, the
  design system page for the new toolbar recipe, changelog with a Consumers-should note.

**Editor highlighting arm (added 2026-06-12 from Geoff's field report).** In the editor, only
some `:::` rows highlight (it reads as only the end tags). The probable cause is the directive
line matcher missing 4-plus-colon fences (`::::split[Costs & volunteers]`) and attributed or
labeled openers, while bare closers match. Geoff's nested split/panel example is the regression
fixture verbatim. With the fix, nesting gets a visual treatment: per-depth bands (darker and
lighter, the bracket-pair-colorization idea from code editors), designed through the
frontend-design skill with the preview UI work.

## Tasks

1. Doctor input self-derivation (vite-arm helper + wrangler account id + precedence + skip-copy).
2. `--probe` live check (+ one condition, checklist anchor, reference docs).
3. Dependency floors: peer bump + lockfile check (+ one condition, anchor; changelog
   `Consumers must` for the svelte floor).
4. Adapter `preview` knob through `composeRuntime` (+ reference docs).
5. EditPage iframed preview: srcdoc build, sidebar collapse in preview, device toolbar,
   persistence, component tests per the existing EditPage suites.
6. Showcase wiring + E2E (preview renders the site stylesheet inside the frame; device widths
   apply) + docs arm + upgrade-guide sync note from the retrofit (the `svelte-kit sync` step).
7. **ecxc fidelity proof (the preview arm's acceptance gate).** Pack the engine into the
   ecxc-ski checkout, wire its `preview` knob, and for EACH current ecxc page compare the
   iframed preview against the production rendering of the same content region. The preview
   must match production exactly (typography, links, component rendering, icon sizing,
   container width); chrome (header, footer, nav) is outside the preview by design. Any
   divergence is an engine or knob-design defect to fix before release; if the knob needs a
   container-class extension to reproduce a site's content wrapper, that lands here.
8. Pass end: simplifier, svelte + a11y reviewers over the preview work, gate, bump 0.51.0,
   release, STATUS/memory; ecxc's one-line 0.51 bump (the `preview` knob wiring from task 7)
   ships to the site after the publish.

## Out of scope

The kit `checkOrigin` removal path (kit#15992) stays a ROADMAP item; this pass only raises its
priority note. The render pipeline itself does not change; the iframe wraps its output.

## Post-mortem (2026-06-12)

**What shipped.** All eight tasks landed on `main` as commits `ca117e5..257d752`. The doctor arm
gave `cairn-doctor` input self-derivation (`ca117e5`, the config-module facts through the manifest
bin's Vite machinery plus the wrangler account id, with flag-then-env-then-derived precedence), the
`--probe <url>` live sign-in check (`ec02a36`, with the probe returning the csrf field value
directly in `497e8d7`), and dependency floors with teeth (`5b92507`, the svelte `^5.56.3` peer
bump plus the lockfile-vs-peer-floors check). The condition registry grew to fifteen entries with
the two new ids `config.dependency-floors-unmet` and `admin.login-probe-failed`, each with its
checklist anchor, and `check:readiness` pins fifteen. The preview arm landed the adapter `preview`
knob through `composeRuntime` (`5dc1287`), the sandboxed-iframe preview with the collapsing
sidebar and the device-width menu (`97fd14c`), and the showcase wiring with its E2E proof
(`940dedd`). The directive-highlighting arm fixed the opener matching (labeled and attributed
openers, four-plus-colon fences) and added per-depth bands (`2283e1f`). The docs arm is `2d9f8de`.

**The ecxc fidelity gate earned its keep.** Task 7 packed the engine into the ecxc-ski checkout,
wired its `preview` knob, and compared each page's iframed preview against the production
rendering. It proved the knob as designed could not express a site whose posts and pages wrap
content differently, so one adapter-level pair previewed posts with page styling. The fix is the
`byConcept` per-concept override, with `editLoad` shipping the entry's already-resolved flat shape
as the new exported `ResolvedPreview` (`477fd90`). The site-side wiring is committed in the ecxc
checkout (`47f82dc`) and held unpushed until this publish, per the publish-before-site-push rule.

**The review gate.** The svelte and daisyui-a11y reviewers converged on twelve findings, all
folded in as `32ade6b`. The one Critical was invisible keyboard focus in the new popover menus,
where DaisyUI v5's `.menu` quiets `:focus-visible` from the utilities layer and so beats the
components-layer brand ring; an unlayered scoped rule in `cairn-admin.css` restores a 2px primary
outline, recorded in the design system as a deliberate layering exception. Several preview-frame
correctness fixes in the same fold-in were real. An empty `sandbox` never made links inert (a
sandboxed srcdoc context can navigate itself against the parent base URL), so `buildPreviewDoc`
emits `<base target="_blank">` and the sandbox blocks the resulting popup, with a showcase E2E
clicking a frame link to prove the admin stays put. Bumping `previewRun` in the render effect's
cleanup means an in-flight render can no longer write entry A's html into entry B after a
same-route hop. A capture-phase `invalid` listener flips Preview back to Write before the browser
reports, so a hidden required sidebar field can no longer cancel a save silently, and the iframe
takes `tabindex="0"`. A follow-up (`b7cf172`) leveled `.menu` button items to the anchor baseline
with a scoped Preflight substitute, since the admin sheet ships without Preflight and DaisyUI's
menu rules assume it.

**Session note.** The authoring session crashed mid-release. The code was all committed, but the
version bump and changelog header sat uncommitted in the working tree, the plan status line had
been flipped to PUBLISHED prematurely, and no post-mortem, STATUS update, push, or release
existed. The resume session trusted none of the prior session's claims and re-ran everything
first-hand before completing the release.

**Verification evidence (run first-hand at the tip, post-crash).** `npm run check` 902 files 0/0.
`npm test` 156 files / 1369 tests exit 0. All five doc and readiness gates exit 0
(`check:reference`, `check:package`, `check:docs`, `check:readiness`, `check:prose`). One flake
observed and resolved: `MarkdownEditor.test.ts` hit a matcher timeout once while the doc gates ran
beside the browser suite, then passed in isolation (15/15) and in the clean full run. The
simplifier ran post-crash and made one consolidation, the shared `previewDevice`/`deviceLabel`
helpers in `preview-doc.ts` replacing the duplicated lookup and label strings in `EditPage` and
`EditorToolbar` (`257d752`), re-gated green.

**Carry-forwards.**
1. **ecxc's `^0.51.0` bump** ships right after this publish (the knob wiring already sits in its
   checkout), and `npx cairn-doctor --probe https://ecxc.ski` against the deployed site is the
   probe's first live proof.
2. **907-life stays the last retrofit**, now crossing straight to `^0.51.0` and inheriting the
   svelte `^5.56.3` floor action from this changelog.
3. **The component suite can flake under parallel load** (browser-mode matcher timeouts). Keep
   other heavy work off the box during the gate; revisit the matcher timeout if it recurs.
