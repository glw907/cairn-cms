# cairn-cms — Architecture Critique (pre-build red-team)

> **Purpose:** Find the flaws before building. Severity-ranked, evidence-backed (2024–2026 research),
> each mapped to a load-bearing assumption in `ARCHITECTURE.md §10` with a **verdict**: PROCEED (sound as-is),
> GUARD (sound but needs a named safeguard), CHANGE (design must change before building), or DEFER (accept now,
> revisit at a named trigger). Evidence from five parallel research agents (git-CMS, plugin architecture,
> edge/Workers+SvelteKit, scaffold-copy economics, magic-link auth); key sources cited inline.
>
> **Date:** 2026-05-26.

## Headline verdict

**The architecture is sound for its actual threat model and scale (a handful of small, trusted-editor
sites), but it rests on four beliefs that the evidence breaks, plus several that need named safeguards.**
Encouragingly, several "obvious" risks are *already* mitigated by existing choices (Carta client-only;
single workspace `@sveltejs/kit`; auth + UI live in the **engine**, not the copied theme). The work before
building is concentrated, not sprawling.

### Must-fix before building (CHANGE) — 4 items
1. **Magic-link nonce on KV is a real token-reuse vulnerability** — move single-use enforcement to a Durable Object or D1 atomic delete. *(Assumption #6 — INVALID.)*
2. **Email-scanner prefetch silently consumes magic links** — adopt a POST-confirm flow. *(Lockout + security; not in §10 — newly surfaced.)*
3. **Concurrent edit → HTTP 409 lost update** — detect, warn, reload; never silently fail. *(Assumption #4 — partially INVALID.)*
4. **Timing-unsafe token/HMAC comparison** on Workers (no `timingSafeEqual`) — use Double-HMAC. *(Cheap, an outright omission if absent.)*

### Highest-leverage design refinements (CHANGE/GUARD)
- **Reinforce engine-fat / theme-thin** and **stop calling it "Hugo-like."** Keep *all* security + UI logic in the live engine; the copied theme is presentation/registry/CSS only. This is the only robust answer to "scaffold-copy can't propagate security fixes." cairn already does most of this.
- **Contents-API listing will silently truncate at 1,000 files** and **content >1 MB returns null** — switch listing to the Git Trees API and shard collections (year/month) before any site grows.
- **Govern the `CairnExtension` contract from day one** (narrow surface, versioned, extensions peer-dep only cairn-cms, build-time validation) — and accept that **SvelteKit cannot provide package routes**; extensions contribute data + components, the site owns thin route shims (ideally generated).
- **Non-developer safety net:** server-side frontmatter validation *before* commit + a deploy-status signal + a revert affordance — today a bad save breaks the live build with no editor recovery.

---

## Premise & dependency re-validation (2026 — added after the initial critique)

### P1 — Is cairn still worth building? → **YES, the niche is unfilled** (premise holds)
A fresh 2026 scan (Sveltia, Decap+DecapBridge, TinaCMS, Keystatic+Cloud, Pages CMS, Front Matter, cms-worker,
SonicJS) confirms **no tool does all three of {magic-link email auth, no GitHub account for editors} + {git-commit
storage} + {embedded in a SvelteKit Cloudflare Worker}.** Closest is **Pages CMS** — it now does magic-link
invites for non-GitHub editors **and** GitHub-commit storage (criteria 1+2), but **fails criterion 3 decisively**
(PostgreSQL + a Node server behind a reverse proxy; cannot run on Workers or embed at `/admin`). All others fail
on auth (GitHub-only), storage (D1/R2, not git), or hosting. **Verdict: build is justified.**

### P2 — Adopt `better-auth` for the auth primitive → **STRONG (converges with C1)**
Pages CMS implements its magic-link via **`better-auth`'s MagicURL plugin**, and **`better-auth` runs natively on
Cloudflare Workers + D1** (documented 2025–2026 pattern). This is independently recommended by the auth red-team
(the "if scope grows, migrate to Better Auth + D1" escape hatch) **and** the build-vs-adopt scan. Adopting it
**simultaneously fixes C1** (moves the single-use nonce off eventually-consistent KV onto D1's strong consistency)
and retires the hand-rolled JWT/token lifecycle (timing-safe compare, single-use, TTL — H3, C1 handled by a
maintained lib). **Recommendation: the Architecture-Refinement pass should seriously evaluate replacing the
hand-rolled magic-link/session with `better-auth` (D1 adapter + magic-link plugin)** rather than hand-hardening
KV. The rest of cairn (GitHub-App commit, SvelteKit embedding, editor, registry) stays bespoke — genuinely unfilled.

### P3 — Editor engine: the "alternatives" aren't alternatives → **STAY on Carta, abstract behind an interface** (resolves M6)
TipTap, ProseMirror, Milkdown, and Lexical **all fail the only axis that matters**: they use a rich *document model*
and treat markdown as an import/export format, so custom `:::directive{attrs}` blocks get dropped/mangled on
round-trip. They solve a different problem (WYSIWYG), not cairn's (raw-markdown + directive fidelity). The *real*
comparison is **Carta vs bare CodeMirror 6** — and **Carta is itself a thin Svelte wrapper around CodeMirror 6**.
Both pass raw-md fidelity, directive safety, Svelte 5, preview integration, and light bundle. The only delta is bus
factor: Carta = 1 maintainer (~753★, but actively released Apr 2026); CM6 = effectively the ecosystem standard
(OpenAI-sponsored). **Decision:** keep Carta now (rebuilding its toolbar/preview/plugin wiring on bare CM6 buys
nothing today), but **add a thin `MarkdownEditor` interface immediately** (`getValue/setValue/onInput`) so the
component depends on the interface, not Carta's API — making a later swap to bare CM6 a one-file change. **Reassess
at the extraction milestone:** if Carta still lacks command-palette/CM-instance hooks the component palette (R10)
needs, migrate to bare CM6 + a custom toolbar *then*, while the code is being pulled into the library anyway.

---

## CRITICAL

### C1 — KV eventual consistency breaks single-use magic-link enforcement  → **CHANGE** (Assumption #6 INVALID)
cairn enforces single-use by deleting the KV nonce. **KV is eventually consistent**; deletes propagate via
tombstones over up to ~60 s, and read-your-own-write is only (and not even reliably) same-PoP. An attacker
who obtains the link (see C2/H3) can replay it from a different PoP inside the window; two near-simultaneous
verifies can both succeed. Cloudflare's own guidance: use **Durable Objects** for atomic check-and-delete;
KV is for "read at high rates, not immediately consistent" — the opposite of an auth nonce.
**Fix:** nonce in a Durable Object (atomic `verify()` delete-and-return), or D1 `DELETE … WHERE token=? AND expires_at>? RETURNING *`. **Or — strongly — adopt `better-auth` (D1 adapter + magic-link plugin), which handles this on strongly-consistent D1 and retires the hand-rolled token lifecycle entirely (see P2).**
*Evidence:* Cloudflare KV "How KV works" + Storage-options guide; corroborated independently by the auth and edge agents; better-auth+D1 pattern (P2).

### C2 — Email security scanners prefetch and burn the magic link  → **CHANGE** (new; not in §10)
Corporate email gateways (Microsoft Defender, Proofpoint, Mimecast) issue GET requests to every URL in
inbound mail. A GET-consumed magic link is **redeemed by the scanner before the user clicks** → the user
gets "invalid/expired," i.e. a self-inflicted auth DoS, plus a confused security state. Documented against
Better Auth (#6985) and Supabase Auth (#1214).
**Fix:** **POST-confirm flow** — the email link lands on a page with a "Confirm sign-in" button that POSTs;
the nonce is consumed on POST (scanners don't POST). This also closes the GET/CSRF consumption vector and
pairs naturally with C1. *Verdict: required* — it will hit real editors on managed email.

### C3 — Concurrent edit → HTTP 409 lost update  → **CHANGE** (Assumption #4 PARTIALLY INVALID)
`commitFile` reads the blob SHA then PUTs with it (optimistic lock). If anything commits between (another
editor, *or the site's own CI*), GitHub returns **409** and cairn's save fails raw. No git-backed CMS solves
in-UI merge (Decap #277 open since 2017). The "small trusted set rarely collides" assumption is reasonable,
but **silent raw failure is not acceptable** even rarely.
**Fix (scoped):** catch 409 → re-fetch → if the file changed under them, show "this file changed since you
opened it — reload and reapply" rather than losing the edit or 500ing. Full conflict-merge is out of scope;
*safe failure* is not. *Evidence:* GitHub community #62198, PyGithub #1787, Retool's git-API post-mortem.

### C4 — Carta/Shiki bundle blowout vs the Workers size wall  → **GUARD** (Assumption #12)
Shiki can balloon a Worker bundle to ~9.7 MB; Workers Free is **3 MB** compressed, Paid **10 MB**. cairn
*already* mounts Carta client-only — the correct mitigation — so this is a **guard, not a change**: enforce
the client-only boundary in tests, keep Shiki off the server (CDN/fine-grained), and watch bundle size in CI
(`wrangler deploy --dry-run`). Without the guard, a careless import re-breaks deploys. *Evidence:* Carta #78,
Shiki perf guide, Astro #15094.

---

## HIGH

### H1 — Scaffold-copy themes cannot propagate security/bug fixes  → **CHANGE the line** (Assumption #8)
The defining property of scaffold-copy: every site is a fork at creation; there is no `npm update` for copied
files. Shopify Dawn evidence: ~90% of users run outdated themes because edits block updates; CRA was
*deprecated* partly over this fragmentation. **The only robust mitigation is to keep all security-critical and
update-worthy logic in the live ENGINE, leaving the copied theme as pure presentation.** cairn already does
this (auth, commit, admin shell/components, server logic are in `@glw907/cairn-cms`). **Action:** make it a
hard rule — nothing security-relevant or fix-prone lives in the copied layer; the theme is design tokens +
component registry data + CSS + thin route shims. Add a **theme/engine version stamp** so drift is visible,
and ship a Renovate config in the scaffold. *Evidence:* CRA sunset post; Shopify Dawn update docs; Nx migrate.

### H2 — "Hugo-like" is architecturally wrong and sets false expectations  → **CHANGE terminology/claim** (Assumption #8)
Hugo's override model is a **runtime virtual-filesystem lookup** (site shadows theme at render time). SvelteKit/
Vite resolve routes/imports at **compile time** — there is no overlay (SvelteKit #8896, open/"non-urgent").
So scaffold-copy isn't a stylistic choice, it's **forced by the build model**, and users cannot "override theme
files" the way Hugo implies. **Action:** drop "Hugo-like" from the docs; describe it as a **starter/scaffold**
model (CRA/Dawn/Astro-Starlight family). The closest *successful* live-theme analogue is **Astro Starlight**
(live integration + narrow, registered override surface + an upgrade script) — which validates the hybrid:
**a live `@glw907/cairn-cms` UI/component layer + only thin copied route shims.** cairn is already most of the
way there.

### H3 — Token-in-URL + no timing-safe compare + host-header origin  → **CHANGE** (auth hardening)
Three concrete auth gaps: (a) **no `timingSafeEqual` on Workers** → token/HMAC compared with `===` leaks a
timing oracle; use **Double-HMAC** (≈10 lines). (b) Token in the URL leaks via `Referer`/logs/scanner →
set `Referrer-Policy: no-referrer` on the verify page and consume-before-redirect. (c) **Host-header/origin**
must never be request-derived (cairn already tripped `PUBLIC_ORIGIN` once) — audit that it's always config,
never `Host`/`X-Forwarded-Host`. *Evidence:* OWASP Forgot-Password/Session cheat sheets; PortSwigger host-header;
DataHub HMAC advisory; web-timing-safe-equal.

### H4 — Contents-API hard caps: 1,000-entry listing + 1 MB content  → **CHANGE** (Assumptions #2/#3)
The contents API lists **≤1,000 entries per directory with no pagination** (silent truncation — newer posts
vanish from the admin) and returns content only for files **≤1 MB** (`content: null` above, needs the Blobs
API). A 2-posts/week blog hits 1,000 in ~10 years, but a flat `posts/` dir is the default.
**Fix:** list via the **Git Trees API**; shard collections by year/month; document the 1 MB body limit.
*Evidence:* GitHub docs + community #136892; hub4j #85.

### H5 — Extension contract calcification + peer-dep conflict + no route mechanism  → **CHANGE R13 principles** (Assumption #9)
Plugin ecosystems rot via (a) **dependency calcification** (Gatsby died on a 168-dep tangle; Webpack/ESLint
ecosystem-wide breakage), (b) **contract drift** once published (ESLint v9 retrospective), and (c) extensions
**reaching into internals** (Babel) vs VS Code's durable "declare data, not internals." cairn already forced a
single `@sveltejs/kit`/`vite` across sites — a third-party extension declaring its own kit/vite peer-dep
reintroduces three-way conflicts. And **SvelteKit cannot let a package contribute routes** (#8896).
**Action (bake into R13's own design round):** narrow, versioned `CairnExtension` type (`version: 1` literal);
extensions **peer-dep only `cairn-cms`**, never kit/vite; expose **data + components, not internals**;
**build-time validation** (dup nav/collection names, unknown fields → warn); admin routes mount via
**generated shims** (VS Code "contributes data" model, Option B), not package-provided routes; **governance
doc before the first external extension.** *Evidence:* WordPress supply-chain (Flippa, 20k installs), Gatsby
#39062, ESLint v9 retro, VS Code extensibility, SvelteKit #8896, semver-ts.

### H6 — Cloudflare Email Sending is still beta and is the sole auth channel  → **DEFER + GUARD** (reliability)
All authentication depends on `env.EMAIL.send()`, a **beta** product with undocumented per-account limits.
A beta change or quota hit silently breaks all login. **Action:** wrap with explicit user-facing error (not
500) + audit-log sends; keep **Resend as a coded fallback** (the locked decision already names it); track GA.
*Evidence:* Cloudflare Email Service docs (beta banner); PLAN risk #1.

---

## MEDIUM

### M1 — Commit-as-publish: no deploy feedback, no validation, no recovery  → **CHANGE** (Assumption #1)
Save → commit → CI → deploy is 1–4 min with **no status signal**, and a malformed save (bad frontmatter)
**breaks the live build with zero editor recovery** — a developer must intervene. **Fix:** server-side
frontmatter/schema **validation before commit** (reject → inline error, never commit invalid); a **deploy
status** signal (poll the deployments API / a webhook); a **revert-last-change** affordance (GitHub revert).
This is the difference between "non-technical-safe" and not. *Evidence:* git-CMS agent; CloudCannon/Tina show
build status; gitana.io git-native vs git-like.

### M2 — PKCS#1→PKCS#8 key handling is brittle and untested at the Worker layer  → **GUARD** (Assumption built)
Workers `SubtleCrypto` accepts only PKCS#8; GitHub issues PKCS#1. cairn converts in-process — correct, but
string/PEM munging is brittle and **untested in-Worker**, and a key rotation could skip the conversion → all
commits silently die. **Fix:** prefer `jose`/`workers-jwt` `importPKCS8`; add a `/admin/healthz` that signs a
dummy JWT; document rotation incl. the conversion step. *Evidence:* Workers Web-Crypto docs; gr2m example.

### M3 — Role in signed cookie: no instant revocation; secret leak = forgery  → **DEFER** (Assumptions #5/#7)
Acceptable at current scale (tiny allowlist, content-only blast radius, reversible via git history). Residual:
removing a compromised editor doesn't invalidate their cookie until TTL; a leaked `SESSION_SECRET` forges any
role. **Action:** secret hygiene (never in `.dev.vars`/toml/logs; rotate); if scope grows, add a KV/D1 session
**blocklist** (one read/request). Revisit if editor enrollment becomes public or data sensitivity rises.

### M4 — `@sveltejs/kit` `instanceof` across the package boundary  → **GUARD** (already retired, keep it)
Package-thrown `redirect`/`error` must share class identity with the host runtime or auth redirects become
500s — exactly the workspace-symlink case. **Already retired** (single root kit; live-verified Pass F2; kit's
July-2025 patch). **Action:** keep `@sveltejs/kit` a **peerDependency** (never a dependency), assert one
resolved version in CI. *Evidence:* SvelteKit PR #13971/#13843, issues #8617/#10062.

### M5 — Startup CPU / memory / subrequest / nodejs_compat edge limits  → **GUARD** (Assumption #12)
Startup CPU budget (1 s since 2025-10-10; error 10021), 128 MB isolate, 50 subrequests (Free) / 10k (Paid),
and `nodejs_compat`/`compatibility_date` CI drift can each bite as features grow. **Action:** lazy-init all
heavy objects inside handlers (no top-level Shiki/octokit); pin wrangler v4 + `nodejs_compat` + a recent
compat date; `wrangler deploy --dry-run` in CI to catch size/startup regressions. *Evidence:* Cloudflare limits
+ changelogs.

### M6 — Carta bus factor  → **RESOLVED by P3**; cairn's own single-author risk → DEFER (strategic)
Contentlayer's 2024 abandonment is the cautionary tale; the git-CMS space is littered with single-maintainer
stalls, and **Carta has a thin community (1 maintainer)**. But P3 shows the rich-doc "alternatives"
(TipTap/ProseMirror/Milkdown/Lexical) are **not** options (they mangle directives), and Carta is a thin wrapper
over **CodeMirror 6** — the safe fallback. **Action:** keep Carta now; **add a thin `MarkdownEditor` interface
immediately** so a swap to bare CM6 is a one-file change; reassess at extraction. (Resolved by P3.)

### M7 — Media in git / LFS economics  → **DEFER** (Assumption #3, R7)
No media-upload path defined; git/LFS bandwidth is a documented cost trap (public-repo crawlers can disable
LFS). **Action:** when R7 is scoped, default to **R2** (zero egress) with only the URL in markdown; don't put
binaries in git. Already a roadmap item.

---

## LOW / ACCEPTED

- **Email as single factor** (Assumption — accepted): correct for the threat model; optionally add a visible
  confirmation-code UX (defeats phishing relay) without TOTP.
- **Single-file commits only** (Assumption #3): fine until a feature needs atomic multi-file writes (relations,
  rename-with-references, media-beside-post) → then the Git Data tree API. Note the boundary; don't pre-build.
- **Components are code, not user-creatable** (Assumption #10): correct and well-reasoned (render + CSS are code).
- **Opinionated stack lock-in** (Assumption #11): intentional; the critique doesn't challenge it.

---

## Assumptions scorecard (§10 of ARCHITECTURE.md)

| # | Assumption | Verdict |
|---|---|---|
| 1 | Commit-as-publish UX acceptable | **Conditional** — needs deploy-status + validation + revert (M1) |
| 2 | No content DB suffices for read/list | **Conditional** — Trees API + sharding (H4) |
| 3 | Single-file commits enough | Hold, with a noted boundary (LOW) |
| 4 | Concurrent-edit rare/tolerable | **Partially invalid** — must fail safe on 409 (C3) |
| 5 | Hand-rolled auth adequate | **Yes, with fixes** (C1, C2, H3) |
| 6 | KV consistency OK for single-use | **INVALID** — DO/D1 required (C1) |
| 7 | Role-in-cookie acceptable | Yes at scale (M3) |
| 8 | Scaffold-copy right | Yes **iff** engine-fat/theme-thin + drop "Hugo-like" (H1, H2) |
| 9 | Lean core, extensions absorb growth | Yes **iff** governed contract (H5) |
| 10 | Components are code | **Sound** |
| 11 | Opinionated lock-in is a feature | **Sound** |
| 12 | Bundle fits the Worker | Yes **with guards** (C4, M5) |

## Net recommendation
**Proceed — the core thesis (embedded, magic-link, git-committing CMS on an engine/theme/extension split)
survives scrutiny — but sequence the four CHANGE items into the build, and fold the design refinements into
the relevant passes:**
- The **theme-architecture extraction** plan must enforce **engine-fat/theme-thin** and the **single-kit
  peerDep** (H1, H2, M4), and is the right place to keep Shiki off the server (C4).
- A short **auth-hardening pass** should precede broad rollout: DO/D1 nonce (C1), POST-confirm (C2), Double-HMAC
  + Referrer-Policy + origin audit (H3). Small, high-value, mostly mechanical.
- The **R8/R10/R13 design rounds** must adopt the contract-governance + Trees-API + non-dev-safety findings
  (H4, H5, M1) as constraints, not afterthoughts.
- The rest are GUARD/DEFER items to track in the risk register.
