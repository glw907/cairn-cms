# The theme contract: outline input for draft docs stage 2 and stage 5

Written at theme identity pass C's close (2026-09-29, Geoff's 2026-09-28 ruling that the facts carry atomic claims and the draft
docs stages also need page-level intent). It covers passes A, B, and C together. It is an input to
the stage 2 (extend) and stage 5 (front door) outlines in
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` ("Each rebuilt stage's flow", step 1); the outline
that Geoff approves on the R10 page is drawn from it, and this file is not itself the outline. The
page type is a section-heading vocabulary from `docs/internal/record/docs-exemplars.md` (Designers and Extenders slices);
each outline assigns its two exemplars. Fact ids are `f:` ids in `docs/internal/facts/`; an id
marked with an asterisk was added or had its claim edited by passes B or C. The complete list of
touched ids is in `2026-09-29-theme-pass-bc-harvest-handoff.md`.

## What changed, in one paragraph

Pass A moved the admin's look into daisyUI's theme layer (the corner ladder, the size step, the
hairline button). Pass B renamed `./components` to `./admin`, added `./public` for built-in public
components, and gave the admin an agent path (the recipe table, `radius-scale`). Pass C made one
public theme contract: the engine ships `@glw907/cairn-cms/cairn-public.css`, derives status inks
from fills, adds heading levers, and audits the public side with three advisory rules
(`public-literals`, `theme-conformance`, `theme-contrast`). A new shipped skill, `cairn-public`,
teaches the contract to an agent. The Waymark render did not move.

## The vocabulary the pages share

The two-axis Names grid in `docs/internal/docs-register.md#names` is authoritative: a component is
admin or public, and built-in or custom. "Built-in public component" lives in `src/lib/public/` and
ships on `./public`; a "custom public component" is a site's own `defineComponent` declaration;
"custom admin screen" names a whole route. The terms "the public theme contract", "the public
stylesheet" (`cairn-public.css`), and "the public scope" (the audit's) are the three new nouns.
Every page below uses them the same way.

## Pages the outline should carry

Each page lists its reader, its job, its page type, its facts, and how it stands against today's
page (keep, rebuild, new, or retire).

### Stage 2 (extend)

1. **`design-your-site.md`, rebuilt as the designer's theme guide.** Reader: a Svelte-fluent
   developer or a designer giving the scaffolded public site its own identity. Job: change the
   site's look through tokens without editing the chassis, and know the change is safe. Page type:
   Task guide (Designers). Facts: `*p8hsnz` `*i9pgd2` `*nz87b3` `*faofr4` `*iel6v5` `kt0epf` `*ylmc9c`
   `*xv2ien` `*bdnzcy` `rxj43c` `s4prb0` `lwrqfd` `7pv6se` `ctognq` `kj37zz`; reference facts `*c4nnu9`
   `*w6pqic` `*7653l0` `*q8atv6`. The required topic from Geoff's 2026-09-24 input rides here: a short
   general section on giving a daisyUI-built site its own identity, linking to daisyUI's theme docs
   without restating them. Keep: the ownership split (the engine owns the roles, the chassis owns the
   scale, the theme owns the values) and the re-skin recipe's fourteen values (`kt0epf`).
2. **A concept page, "The public theme contract".** Reader: the same developer, before the task
   guide. Job: know what a theme must meet and nothing more: daisyUI's theme variables, the engine's
   public stylesheet, and the emitted classes. Page type: Concept page (Designers). Facts: `*c4nnu9`
   `*w6pqic` `*7653l0` `*5vw8k1` `*uzducy`, `*iel6v5`, `*gknz29`. Status: new. It carries the three-part
   contract, the layer placement (`@layer theme` roles versus `@theme` colors, the nesting limit),
   and the promise that the contract is a floor. It is the page the Toward 1.0 seam-stability work
   points at.
3. **A task guide, "Check your theme with the audit".** Reader: the developer who edited a theme.
   Job: run the three public rules, read a finding (including "unmeasured"), and clear it. Page type:
   Task guide (Designers or Extenders). Facts: `*o4ctu5` `*tbq6gh` `*lqtwdt` `*eri2g3` `*0nfxs2`
   `*eqsngu` `*mrv24k`, `*hqhp14` `*z1rbea`. Status: new. It states the tier honestly: advisory on a
   consumer, with no promise of promotion (the promotion is a `ROADMAP.md` intent only). It names the
   two optional peers and the failure message when one is missing.
4. **A task guide, "Build a custom public component".** Reader: a developer adding a
   `defineComponent` declaration. Job: write markup and rules that read contract tokens, then
   preview it in the styleguide. Page type: Task guide (Extenders). Facts: `*bdnzcy` `*hlk5jw`
   `*vvag2y`, and the `cairn-public` component recipe. Status: new if the contract warrants it (Geoff
   decides at the outline); otherwise a section of page 1. The built-in path (`src/lib/public/`) belongs
   to the engine and stays out of the page.
5. **`share-a-draft-preview.md`.** Reader: a developer wiring the preview route. Job: mount
   `PreviewBanner` and set its palette. Page type: Task guide (Extenders). Facts: `6gmzt1` `049lo2`
   `rr00qr` `gvim4v` `*xssf06` `afkvsb` `zke3iw` `l4waby` `pimnjy` `a7yrhq` `cnz554` `*btx359`, `*6q5q05`.
   Keep: the import from `@glw907/cairn-cms/public`, the token palette, and the five override
   properties with the site-toggle example.
6. **`what-the-scaffold-wrote.md`.** Reader: a developer reading a fresh scaffold. Job: know what
   each file is and which are theirs. Page type: Reference entry or Concept (Extenders). Facts:
   `*s23sk0` `*7ozknm` `*6jxd81` `*guiavc` `*vs6k2k` `*mrv24k` `*jcux9z`. Keep: the four skills under
   `.claude/skills/`, the `/styleguide` route's registry-driven kit, the CI Node 24 pin, and the
   `cairn-public.css` layering.
7. **The custom admin screen pages** (`add-a-custom-admin-screen.md`, `animate-a-custom-screen.md`,
   `add-an-island.md` where it names an import path). Reader: a developer adding an admin route.
   Job: import from `./admin` or `./admin-toolkit`, place the component under `src/routes/admin` or
   `src/lib/admin`, and know which rules read it. Page type: Task guide (Extenders). Facts: `*g7zuji`
   `*9oa6sk` `*gc0hx3` `*5stbq2` `2babfl` `39sn8c` `*bwn0uo` `*t767qb`, `*eqsngu`. Keep: `static.scope` replaces
   the defaults and a configured root the tree lacks fails; the motion rules read `static.adminScope`
   (default `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit`).
8. **`architecture.md`.** Reader: a developer building on the seams. Job: the ownership map and the
   subpath map. Page type: Concept page (Extenders). Facts: `*a7qx4m` `*0duu5p` `4esdoz` `cjonmm`
   `cng7dr` `e69d0l` `n3cvf9` `i87sd3` `*bmxw7w`. Keep: the split between `/admin` (admin components)
   and `/public` (built-in public components), and the ownership map that draft docs decision 6
   moves here from `why-cairn.md`.
9. **`build-a-site-by-hand.md`.** Reader: a developer not using the scaffold. Job: wire every piece
   and import from the current subpaths, including `cairn-public.css`. Page type: Task guide.
   Facts: `*jzb3d0`, `*c8efq5`, `*yegr67`, plus the import-position rule in `*c4nnu9`. The page must
   teach the import order (after `tailwindcss`, before `prose.css`), which today's page does not.
10. **`upgrade-cairn.md` and `migration-notes.md`.** Reader: a developer taking an upgrade. Job:
    apply every crossed `Consumers must:` line. Page type: Migration or upgrade guide (Extenders).
    Both are per-version records outside the freeze and stay current; the rebuild keeps their shape
    and the theme-window content written at pass C's close (the swap, the changed defaults, the
    `paletteFiles` entry, the two optional peers, the public scope's default roots, and the template
    fixes a copied site ports by hand). Facts: `*gxdg1k` `zyguyn`, `*aj9516`, `*w6pqic`.
11. **`configure-rendering.md`.** Reader: a developer supplying `render(md)`. Job: know that the
    editor preview and every public page call the one function, and which classes the engine
    emits. Page type: Concept or Task guide. Facts: `*3l7f56` and the emitted-class registry
    `*5vw8k1`.

The extend README (one paragraph) is drafted last and lists `./admin`, `./public`, and
`./cairn-public.css` as three distinct entry points.

### Stage 5 (the front door)

1. **`why-cairn.md`.** Reader: an evaluator. Job: decide whether cairn fits. Page type: Front door.
   Facts: the owner-tier bullets `*gknz29` (a narrow, versioned seam surface) and `*xh2mwb`
   (`cairn-audit` ships whole as a consumer product), and the design-agnostic claim in `CLAUDE.md`'s
   scope paragraph. One sentence covers the theme: cairn's public output is design-agnostic, and the
   engine ships one public theme contract a theme meets. No sentence describes a rule tier beyond
   "advisory on a consumer".
2. **`docs/README.md` and the four arm READMEs.** Reader: any visitor. Job: route each reader to
   their track. Page type: Front door. Facts: `*k439hm`, `vrt55t`, `zmih7p`, `*0xsi67`. The reference
   README gains three entries (`admin.md`, `public.md`, `public-css.md`), already written.
3. **`docs/reference/README.md`** is stage 5's, and today's file already indexes the three
   pages.

## What the `cairn-public` skill teaches, and what the docs teach

The skill (`skills/cairn-public/`) is procedure for an agent editing a site's public side. The docs
are for a person deciding and understanding. The two neither duplicate nor contradict, because each
binds to the same source: the sheet.

- **The skill teaches:** the job-to-token table (which token to change for which job, and where it
  goes: a daisyUI block, `@theme`, or `:root`), where a per-scheme value goes and the comma
  exception, the two paths (fast and full control) to a theme, the two sanctioned escapes from a
  literal, renaming a theme and its three touchpoints, what a theme directory holds, replacing
  `prose.css`, one catalogue page per public piece (29 pages: the markup, the classes and tokens it
  reads, its override seams), the recipe for a custom or built-in public component, and how to run
  the three rules.
- **The docs teach:** why the contract exists and what it is (the concept page), the designer's
  workflow start to finish (the task guide), the honest tier of each rule, every key with its
  default (`docs/reference/public-css.md`, gated to the sheet by `cairn-public-surface.test.ts`),
  every emitted class and who styles it (`docs/reference/render.md`), and every rule and config key
  (`docs/reference/cairn-audit.md`).
- **The rule that keeps them apart:** a default value, an exact class list, or a config key lives
  in one reference page, and the skill and the guides link to it. The skill carries token names and
  placements; the docs carry the reasons. `check:public-skill` holds the skill's catalogue complete
  against the compiled sheet and the registry, and the reference gates hold the reference pages. A
  drafter who is about to restate a default in a guide links to the reference page instead.

## Frozen-page fixes this pass made in place, which the rebuild must keep

Each fix stands against the narrative-arm freeze: a deficiency found on a shipped page is fixed on
the page. The rebuild's drafter reads these as facts (each fix's fact is listed) and must carry the
corrected claim.

- **`docs/extend/design-your-site.md`.** The design-scale key list now names `--leading-*`,
  `--tracking-*`, `--container-measure*`, and `--font-weight-heading`; the roles come from
  `cairn-public.css`, not `tokens.css` (`*iel6v5`). A status-color rebrand costs one fill per
  status, because the ink derives from the fill at 50 percent (`*ylmc9c`). The CI gates section names
  the three public rules and says they run in the site's `check:cairn` at advisory tier
  (`*xv2ien`). `/styleguide` renders from the registry (`*bdnzcy`).
- **`docs/extend/share-a-draft-preview.md`.** `PreviewBanner` imports from `./public`, reads
  daisyUI role tokens, and takes five override properties (the page previously said four and
  carried literal palettes); the site-toggle example points the properties at the site's tokens
  (`*xssf06` `*btx359`).
- **`docs/extend/animate-a-custom-screen.md`.** `static.adminScope` defaults to
  `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit` (`*t767qb`).
- **`docs/extend/what-the-scaffold-wrote.md`.** The tree shows the four skills under `.claude/skills/`
  and says what it leaves out; the `theme.css` row names the engine's `cairn-public.css` layer; the
  `(site)/styleguide/` row says it renders the registry (`*s23sk0` `*7ozknm` `*6jxd81`).
- Two more edits ride the rename and need no new prose: `docs/extend/architecture.md` (the subpath
  diagram and split sentence, `*a7qx4m` `*0duu5p` `*bmxw7w`) and `docs/extend/build-a-site-by-hand.md`
  (two import paths, `*jzb3d0`).
