# Doctor DX and the iframed preview (0.51.0)

**Status: in progress (started 2026-06-12).**

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
