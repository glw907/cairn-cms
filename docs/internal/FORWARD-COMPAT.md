# Forward-Compatibility Memo: keeping cairn's seams open

> **Status:** research output of the **Exploration pass** (2026-05-25). Not a build, not a
> commitment to ship any feature below. The question this answers: *do cairn's extensibility
> seams stay general enough to absorb likely future features later, without a rewrite?* Timing
> is deliberate. The adapter contract is extracted (Pass E) and validated on a 2nd site (Pass
> F/F2), and `@glw907/cairn-cms@0.2.0` is published but **not yet pinned for outside consumers**,
> so this lands *before the API calcifies*. "Out of scope" is a valid verdict per item.

## The three seams under review

Everything below is judged against the actual code, not the plan's prose:

| Seam | File | Shape today |
|---|---|---|
| **Adapter contract** | `src/lib/adapter.ts` | `CairnAdapter { siteName, sender, backend: RepoRef, preview, collections[] }`; `CairnCollection { type, label, dir, fields[], validate() }`; `CairnField` = `text \| date \| textarea \| boolean \| tags \| freetags`. Helpers `findCollection`, `frontmatterFromForm`. |
| **Storage** | `src/lib/github.ts` | GitHub contents API. `RepoRef { owner, repo, branch }`. `listMarkdown` / `readRaw` (anon) · `commitFile` (single-file PUT, author=editor, committer=bot, sha-on-update) · `installationToken` (App JWT, Web Crypto). |
| **Auth / roles** | `src/lib/auth.ts` | Magic-link (HMAC + KV nonce + TTL), signed session cookie. `Role = 'owner' \| 'editor'`; KV allowlist `editor:<email> → {name, role}`. |

Two structural facts shape every verdict:

- **Filename-based ids, no slug codec** (Pass E finding). A collection is a `dir` + markdown files; `[id]` is the bare filename stem. Day-bearing and dayless filenames already flow through unchanged.
- **`commitFile` is single-file.** One contents-API PUT per save. Anything needing *atomic multi-file* writes (bidirectional relations, some i18n moves) would need the git-data **tree/commit** API, which is a real addition, not a tweak.

## Verdicts: is the door open?

Surveyed git-based peers (Sveltia, Decap, Keystatic, Tina) and file-based/traditional peers
(Statamic, the closest architectural cousin, plus WordPress and Ghost). Per capability: **door open?**,
**cheap seam to add now?**, or **out of scope?**

| Capability | Verdict | Door status | Cheap seam now? |
|---|---|---|---|
| Media / uploads | Roadmapped | **Open** (additive) | No: decide storage target first |
| Editorial workflow / review | Open | **Open** via frontmatter; branch-mode is a lift | No |
| Scheduled publish | Open | **Open**, no contract change | No |
| Content relations | Open (unidirectional) | **Open**; bidirectional needs tree API | Optional `relation` field type: defer |
| i18n / localization | Open (file-per-locale) | **Open**; field inheritance is a UI lift | No |
| Revision history & rollback | **Free from git** | **Wide open**, no contract change | Available anytime, additive |
| Roles / permissions | **Ahead of the field** | Per-collection scoping additive | Document the shape; don't add fields yet |
| Multiple backends | **Out of scope** | Opinionated GitHub-forward stack (locked) | No |
| Themes | **Already correct** | Hugo-style scaffold-time (locked) | No |

### 1. Media / uploads: *door open; storage decision is the gate, not the contract*
Bytes don't belong in git: GitHub's 100 MB file ceiling, LFS bandwidth cost, and git-isn't-a-CDN
all bite. Every peer that scales decouples **the bytes** (S3 / Cloudinary / R2 / Cloudflare Images)
from **the editorial facts** (alt text, URL). Statamic's container+`.meta` sidecar is the clearest
version. cairn already stores a URL string fine (a `text` field). What's *missing* is an upload
path: `commitFile` is **text-only** (`toBase64` over `TextEncoder` output), so committing binaries
to the repo would need a separate bytes→base64 commit helper. **Recommendation when built (the
roadmap "Manage media" item):** add an `uploadAsset(file) ⇒ url` method to the adapter and prefer
**R2 / Cloudflare Images** over git for the bytes; storing only the URL in frontmatter needs no
contract change. The storage-target decision (repo-binary vs R2/Images) is the real fork. Make it
before building, not now.

### 2. Editorial workflow / review-before-publish: *door open via frontmatter; branch-mode is bigger*
The git tension: `main` is live. Two models. (a) **Soft gate:** a `draft`/`status` frontmatter
field the SSG honours; this is cairn's *locked* posture and needs nothing new. (b) **Branch-per-draft
+ PR** (Decap's editorial workflow; Statamic's working-copy file): review happens off `main`. That's
a real lift. `commitFile` commits to `RepoRef.branch` (fixed per adapter), so branch-mode would need
a per-commit branch override + branch/PR creation calls. **Verdict:** door is open; if branch-mode is
ever wanted, the additive move is an optional `branch` arg on `commitFile` + a `workflowMode`
discriminant. Don't build now, since `draft` covers the requirement.

### 3. Scheduled publish: *door open, lives entirely outside the contract*
No peer does this in-band; all use "date in the file + a process that compares now to the date."
Workers have no persistent process, but **Cloudflare Cron Triggers do**. Pattern: a `publishAt`
frontmatter date + a scheduled Worker that reads due entries via the contents API and commits a
status flip through the existing GitHub App path. **Verdict:** fully open, **zero adapter/storage
change.** It's a separate cron Worker plus a date field. Out of scope to build; documented so it
isn't designed against.

### 4. Content relations: *unidirectional open; bidirectional is the limit*
Every peer (Keystatic `relationship`, Decap/Sveltia `relation`, Statamic `entries`, Tina `reference`)
stores **a slug/ID string** in frontmatter and resolves at render time, with no FK integrity. cairn can do
this today with a `text` field; a typed `relation` field (target `collection` + stored slug) would be a
clean, **additive** `CairnField` variant. The hard part is **bidirectional sync** (writing the inverse
link into the other file), which needs the multi-file atomic commit cairn doesn't have (`commitFile`
is single-file). **Verdict:** door open for unidirectional; defer the typed field (YAGNI until a site
needs it); bidirectional waits on a tree-API commit path.

### 5. i18n / localization: *door open for file-per-locale; field inheritance is a UI lift*
Cleanest git model is **one file per locale** (`content/blog/en/slug.md` + `…/fr/slug.md`, or a
locale-suffixed filename). Diffs stay legible, commits independent. cairn's **filename-based, codec-free**
model already expresses this: locale dirs are just collections, or a locale suffix rides through `[id]`
untouched. What's *hard* is Statamic-style **field-level inheritance** (showing the English value greyed-out
in the French editor), which needs the edit UI to fetch and merge two files. **Verdict:** door open for
the file-per-locale shape with no contract change; field inheritance is a deferred UI feature, not a
seam problem.

### 6. Revision history & rollback: *free from git; the one cheap win sitting right there*
This is cairn's structural advantage: **every commit already is a revision** (author, timestamp, full
diff). Peers bolt on a YAML revision store (Statamic) or a DB history (WP/Ghost) to get what git gives
cairn for nothing. A friendly "history + restore" UI is purely additive. `github.ts` gains a
`listCommits(path)` + `readRaw(path, ref)`, and "restore" is just another `commitFile`. **No adapter or
storage-contract change.** Available anytime as a self-contained feature; flagged as the lowest-effort,
highest-author-value future win.

### 7. Roles / permissions: *cairn is ahead of the field here*
The git-CMS survey's **#1 highest retrofit-risk** finding was *"the session/JWT must carry a role
claim or you face a breaking change later."* cairn **already did this** (Pass G): `role` lives in the
session token and the KV value, the owner/editor split is enforced, and `verifySession` defaults legacy
sessions to `editor`. The next tier, **per-collection scoping** (journalist edits `news` only), is
additive: an optional `allowedRoles?` on `CairnCollection` + a check in `editLoad`/`saveCommit`.
**Verdict:** door open. Don't add fields speculatively. The two-tier owner/editor model is a locked
decision and per-collection scoping needs a richer role vocabulary than exists today. Documented as the
known-shape extension; build only when a real multi-editor site needs it.

### 8. Multiple backends: *out of scope by design, and that's fine*
Decap abstracts 8 backends; cairn is **GitHub-App-only** by locked decision (opinionated Cloudflare/
SvelteKit/GitHub stack; "not a CMS for all hosts"). Crucially the adapter is **already transport-agnostic**:
it describes collections/fields/preview, not auth or wire protocol; the only backend leak is
`backend: RepoRef`. If GitLab ever mattered, the clean retrofit is a backend discriminant wrapping
`github.ts`, but that's a hypothetical, not a door to hold open now. **Verdict:** out of scope; no action.

### 9. Themes: *the design is already right*
Confirmed against the spectrum: WordPress (runtime switcher + marketplace, the cautionary tale),
Ghost (uploadable runtime themes), and **Statamic Starter Kits** (install-time scaffold, then the files
*are your repo*, with no runtime theme layer). Statamic's Starter Kit model **is** the Hugo model, and **is**
what cairn already does: the per-site `src/` + `cairn.config.ts` adapter *is* the theme boundary; the
admin chrome stays neutral by its own rule. **Verdict:** no runtime theme management, ever; the locked
"Hugo-style scaffold-time" decision is validated.

## "Keep these doors open": the short list

1. **Don't let `commitFile` ossify as single-file-only in consumers' mental model.** Bidirectional
   relations, some i18n moves, and atomic multi-collection edits all want a tree-API commit path.
   It's additive when needed, so don't design features assuming one-PUT-per-save is the only shape.
2. **Reserve `media` and `relation` as *named future* adapter concepts** (in docs, not code) so a
   consumer building an adapter today doesn't invent a conflicting convention. No fields added now.
3. **Per-collection role scoping is the known next step for roles.** The shape is `allowedRoles?` on the
   collection + a guard in `editLoad`/`saveCommit`. Documented, not built.
4. **Revision/rollback is the cheapest, highest-value additive feature** and needs no contract change.
   It's the natural next capability if author-facing polish is wanted.

Net: **no breaking change is required now.** The single highest retrofit-risk industry gap (roles in the
session) cairn already closed. The contract is safe to pin for outside consumers.

---

## Admin shell direction (UI base): extensible + fully responsive

Brought into this pass per the steer: *"a UI where it's easy to add new functionality as needed,
and fully responsive."* Both are **layout-architecture** decisions, so they belong with the seam review.

**Current shell** (`src/lib/components/AdminLayout.svelte`) is deliberately spartan: a `bg-base-200`
page with a single `max-w-3xl` centered column, no nav rail, no header. It works but doesn't *scale*.
Every new surface (media, revisions, settings...) has to invent its own way in, and there's no responsive
chrome to inherit.

**Recommendation: adopt a DaisyUI `drawer` + `navbar` shell.** It answers both requirements structurally:

- **Fully responsive by construction.** `drawer lg:drawer-open` = a persistent sidebar on `lg+` that
  collapses to a hamburger-triggered overlay drawer on mobile. Responsiveness is the component's job,
  not per-page CSS.
- **Easy to add functionality = a data-driven nav.** New surface ⇒ one nav `<li>` + one route shim +
  one `cairn-cms/sveltekit` load fn + one `cairn-cms/components` component. The F2 architecture already
  makes routes thin shims over package functions, so the nav is the only new wiring. Role-gate entries
  the way `AdminList` already gates the owner-only "Editors" link (`{#if data.editor?.role === 'owner'}`),
  and the nav can even derive content entries from `adapter.collections`.

**Base to start from: [`scosman/CMSaasStarter`](https://github.com/scosman/CMSaasStarter).** It's
Svelte 5 runes (`$props`, `{@render children?.()}`), MIT, pure DaisyUI semantic classes (theme-driven,
no hard-coded colors). Its `(admin)/(menu)/+layout.svelte` is exactly a drawer+navbar admin shell scoped to
a route group, mirroring cairn's `/admin`. Lift the layout, strip its SaaS nav, wire cairn's surfaces.

> **Correction to PLAN.md's UI-reference note:** the named **`joshnuss/capriole`** repo **does not
> exist** (verified via `gh api` 404, no matching repo in search). Replace that reference with
> CMSaasStarter. **Lucia** (`pilcrowOnPaper/lucia`) is an auth *library* with no UI, so nothing to mine
> for layout; cairn's guard already covers its only relevant pattern.

Canonical skeleton (Svelte 5, all DaisyUI semantic classes, drops into `AdminLayout.svelte`):

```svelte
<div class="drawer lg:drawer-open">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content flex min-h-screen flex-col">
    <!-- mobile-only header with hamburger -->
    <div class="navbar border-b border-base-300 bg-base-100 lg:hidden">
      <label for="admin-drawer" class="btn btn-square btn-ghost">☰</label>
      <span class="px-2 text-lg font-semibold">{siteName} CMS</span>
    </div>
    <main class="flex-1 overflow-auto p-6">{@render children()}</main>
  </div>
  <div class="drawer-side z-40">
    <label for="admin-drawer" class="drawer-overlay" aria-label="close"></label>
    <aside class="flex min-h-full w-72 flex-col border-r border-base-300 bg-base-200">
      <div class="border-b border-base-300 px-4 py-5 text-lg font-bold">{siteName} CMS</div>
      <ul class="menu menu-lg flex-1 gap-1 p-3"><!-- data-driven nav entries --></ul>
      <div class="border-t border-base-300 p-3"><!-- sign out --></div>
    </aside>
  </div>
</div>
```

This shell is itself a forward-compat seam: a data-driven, role-gated nav makes *"easy to add
functionality"* a structural property rather than a per-feature effort. Building it is admin-UI-polish
work, a separate pass, not part of this research pass; this memo records the decision and the base.
