# Wayfinder component survey: aksailingclub.org + Blowfish (2026-07-02)

Ground-truth input to the starter-component-set plan and the third-site migration.

---

All data is in hand: my direct greps (ground-truth shortcode usage), the live-site survey, and the Blowfish docs inventory. The lost repo-survey agent's slice I covered directly (git logs, READMEs, content model). Final report follows.

---

# Alaska Sailing Club survey — for cairn's Wayfinder starter-component set

## Which repo is current

- **Production = `/home/glw907/Projects/aksailingclub-org`** (Hugo, Blowfish-derived, Cloudflare Worker in front). Evidence: the sveltekit repo's README states "Production site (Hugo): aksailingclub.org / Staging (this project): staging.aksailingclub.org".
- **`/home/glw907/Projects/aksailingclub-sveltekit`** is the in-progress rewrite (more recent commits, 2026-06-09 vs 2026-05-20) targeting SvelteKit + Workers + D1 + R2. It is presumably where a cairn migration lands. Its content already uses the same custom shortcode vocabulary as the Hugo repo.
- Caution for future greps: the Hugo repo vendors the Blowfish theme docs/demo content (`themes/`, `docs/`), which pollutes repo-wide shortcode counts (e.g. 621 `ref`, 352 `filetree` are demo-ware, not site content). Ground truth is `content/` (76 md files) plus the separate `handbook/content/` Hugo site (87 md files).

## (6a) ACTUAL shortcode usage in real site content (ground truth)

`content/` (the public site):

| Shortcode | Count | What it is |
|---|---|---|
| `phosphor-icon` | 99 | inline SVG icon in prose (custom, `layouts/shortcodes/phosphor-icon.html`) |
| `sb` | 73 | semibold inline `<span>` (Discord channel names etc.) |
| `mw` | 5 | MembershipWorks third-party JS embed (membership/payments) |
| `season-calendar` | 1 | homepage season calendar from `data/season-events.yaml`; in prod a Worker injects live D1 data via HTMLRewriter |
| `racing-events` | 1 | empty div, JS-hydrated from D1 (`src/lib/injection.js`) |
| `class-schedule` | 1 | table hydrated from `/api/class-schedule` (D1), no-JS fallback |
| `latest-bulletin` | 1 | banner showing newest unexpired bulletin (7-day default or `bulletinExpires` frontmatter) |
| `recent-posts` | 1 | homepage news cards |
| forms: `contact-form`, `donate-form`, `issues-form`, `it-request-form`, `discord-invite-form`, `class-waitlist-form` | 1 each | custom HTML forms POSTing to Worker `/api/*` endpoints (Turnstile-protected) |
| `mw-help` | 1 | MembershipWorks help partial |

`handbook/content/` (separate members-handbook Hugo site): `group-members` 13, `figure` 2, `toc`/`recent-posts`/misc 1-2 each.

**Blowfish stock shortcodes used in real content: effectively zero** (2 `figure` in the handbook; no `alert`, `callout`, `gallery`, `carousel`, `youtube`, `badge`, `button`, `timeline` anywhere in `content/`). The migration must replace a *custom* vocabulary, not Blowfish's.

Plain-markdown blocks in `content/`: **zero inline images** (every post uses only `featuredImage` frontmatter; galleries were lost in the WordPress migration — a literal `<!-- TODO: Replace WordPress Envira gallery -->` sits in the 2024 Pirate Race post); markdown **tables on 5 pages** (education, racing, elections, visiting-the-club, one post); **PDF links in 12 files** (race results, sailing instructions); `static/uploads` holds only 34 files (31 images, 5 PDFs, WordPress `year/month` paths).

## (1) Recurring content blocks (repo + live site combined)

| Block | Where / frequency |
|---|---|
| Hero/featured image per page+post | every page (frontmatter-driven, no captions) |
| **Structured event listings** | the standout pattern: ~16 `event-block`s on /events (image, type badge, reg-status pill, date, location, register link), lighter cards on /racing, month-grouped season calendar on home — three renderings of the same D1-backed event data |
| Regatta post lifecycle | every regatta: Notice of Race post → Sailing Instructions post → Results post (dense multi-table scoring); recurs across Firecracker, Fireweed, Northern Lights, Gov Cup |
| Static tables | 5 pages + results posts |
| Dynamic API-backed table | /education class schedule (D1) |
| Forms | 6 custom Worker-backed forms + MembershipWorks embed on /join |
| CTA cards / icon card grids | home, /join, /members, /education (repeating) |
| Inline icons + semibold spans | 99 + 73 uses, the daily editor vocabulary |
| Expiring bulletin banner | home (bulletins section, auto-expiry) |
| PDF download links | 12 files (race docs) |
| TOC sidebar w/ scrollspy | /racing, /education, /join, /bylaws (template chrome, not a content block) |
| Map embed | /contact only (one-off iframe) |
| **Absent**: galleries (owed/TODO), video embeds, blockquotes/pull quotes, FAQ accordions, sponsor strips, countdowns | — |

## (2) Coverage by the planned set, and gaps

**Covered / justified:** `figure` + `gallery` (zero current inline images is a migration artifact — the WP galleries are owed and posts like "Pirate Race Wrap Up & Photos" are waiting for exactly this; gallery is the single most *demanded* planned component for this site). `CTA/button` (register links, cta-lists). `callout` + `alert` (fine-print notice, static announcements). `video`, `pull quote`, `FAQ/details`: no current usage anywhere — harmless, but this site won't exercise them.

**Gaps (blocks with no planned component), with charter judgment:**

| Gap | Blocks migration? | Judgment |
|---|---|---|
| **Inline icon** (`phosphor-icon`, 99 uses) | No, but it's the #1 shortcode by frequency | The one gap worth considering for the starter set: a tiny inline-icon directive. Trivial for the developer to build, but its frequency says editors actually type it daily. |
| `sb` semibold span (73) | No | Rewrite to `**bold**`/site CSS at migration; content-cleanup task, not a component. |
| Event listings / season calendar / class schedule | No | D1-backed site-domain work per the charter; cairn's island seam serves it, the developer builds it. Already lives outside content. |
| Forms (x6) + MembershipWorks embed | No | Explicitly the developer's domain (Workers endpoints, Turnstile, third-party SaaS). |
| Static tables | No | Plain markdown; the site's `render()` handles it. |
| PDF/document links | Maybe | Plain links suffice (no download component needed), but **check early whether cairn's media upload accepts non-image files (PDFs)** — race docs are a recurring need. |
| Map embed | No | One-off raw HTML/site component. |
| Expiring bulletin banner | Content-model question, not a component | See (5). |

Nothing here blocks a migration. The dynamic surface is already segregated into Workers/D1 exactly along cairn's charter boundary.

## (3) Would an event countdown island serve this site?

Genuinely yes in domain terms — it's a racing club (regatta series, race-start sequences, a season calendar), and no countdown/date-driven widget exists today, so it'd be additive with a natural home (a NOR post counting down to race start is plausible). **One caveat:** this site's events live in D1, not markdown frontmatter, so a countdown keyed to content frontmatter fits the *exemplar* role (a date prop in the directive) better than it replaces this site's real event system.

## (4) A better island exemplar?

Two candidates beat a bare countdown *for this site*:

1. **"Next event / upcoming events" card** — mirrors the pattern the site renders three different ways; a countdown is its degenerate case. But its real data source here is D1, so as a *starter-template* exemplar it drifts toward site-domain work.
2. **Expiring announcement banner** (the `latest-bulletin` pattern) — the most content-native option: purely frontmatter-date-driven, demonstrates the same date logic as a countdown, and replaces an actual live feature of the next migration target.

Recommendation: keep the countdown if the exemplar must stay minimal, but the expiring-banner is the stronger teaching exemplar (same date-driven mechanics, real-world payoff on the very next site). A middle path: a countdown that accepts a date prop and renders slotted fallback content when past — which *is* half a bulletin banner.

## (5) Content-model notes for the migration

- **Posts map cleanly**: 32 posts, date-prefixed filenames, frontmatter `title/date/slug/tags/author/featuredImage/description`. `author` is an **email address** — aligns exactly with cairn's editor attribution. Tags are governed by `data/tags.yaml` — a direct fit for cairn's enforced tag vocabulary in `site.config.yaml`.
- **Bulletins are a third concept** with expiry semantics (`bulletinExpires`, 7-day default). Decide early: fold into Posts with an expiry frontmatter field + tag, or stand up a distinct concept. This is the first real test of "multiplicity by distinct concept".
- **Pages nest** (`governance/`, `members/`, `payment/` sections, ~15 pages) — verify cairn Pages handles the nesting depth.
- **Events and classes are not content**: they live in the D1 `asc-ops` tables, synced to `data/season-events.yaml` at build (do-not-edit header) and injected live by the Worker in prod. The migration should keep them outside cairn, per charter.
- **Editors already author markdown+frontmatter via a git-based CMS (Sveltia)** — this is a CMS swap, not a content restructure. Content is markdown-clean (no shortcode soup in prose beyond icons/spans).
- **Media re-import is a real task**: only 34 files in `static/uploads`, the WP galleries were dropped, and posts promise photos they don't deliver. Cairn's media library + gallery component directly pays this debt.
- **Separate handbook site** (`handbook/`, own Hugo instance, `group-members` shortcode) — scope decision needed: in or out of the cairn migration.
- `render()` must handle markdown tables and raw HTML (the map iframe); PDFs must be uploadable.

## (6b) Blowfish components beyond cairn's planned set: candidates vs demo-ware

Blowfish ships 34 shortcodes. Cairn's planned set already covers the club-relevant core (figure, gallery, alert/admonition→callout+alert, button→CTA, accordion→FAQ, video/youtubeLite→video).

- **Real candidate (backed by ground truth): `icon`** — the only Blowfish-style component whose analogue this site heavily uses (99x). Cheap, editor-facing, and cairn's admin already has an icon idiom (Lucide).
- **Occasionally plausible for club/small-org content, but unused here**: `lead` (intro emphasis — this site uses `description` frontmatter instead), `badge` (the site's status pills are data-driven, not authored), `timeline` (club-history pages), `tabs`, `carousel` (redundant with gallery), `email` obfuscation. None demanded by this migration; add none preemptively.
- **Demo-ware for this audience**: `chart`, `mermaid`, `katex`, `typeit`, `gist`, `codeimporter`, `markdown importer`, `swatches`, `ltr/rtl`, `list` (template-level), and the entire repo-card family (GitHub/GitLab/Gitea/Forgejo/Codeberg/Ansible/HuggingFace cards). A club content author will never type these; the site's own zero usage confirms it.

**Bottom line:** the planned set + gallery covers this migration; the only frequency-justified addition is an inline icon component; everything dynamic already sits on the developer's side of cairn's charter line; and the countdown island is defensible but an expiring-announcement banner would teach the same mechanics while replacing a real feature of the next site cairn migrates.