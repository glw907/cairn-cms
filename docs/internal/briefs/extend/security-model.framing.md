# Framing record: Security model intro (2026-10-04 intro round)

Agent-facing. Drives the rewrite of the introduction of `docs/extend/security-model.md` only.

## Who arrives, from where, why

- **Evaluator.** Svelte-fluent developer or technical lead deciding whether to adopt cairn. Arrives
  from `architecture.md` ("security properties of each piece"), the extend README's "Auth and
  access" group, or a search for cairn security. Wants: who can change the site, what attacker
  cairn assumes, what it leaves to the site. Knows SvelteKit and probably Workers. Lacks: why cairn
  runs its own sign-in at all, where cairn's identity lives (D1), how edits reach GitHub (the App,
  not the editor's credential).
- **Curious setter-up.** Met one design choice while building a site (add-cairn links here for "the
  GitHub App's repository-wide write and the CSRF design"). Wants the reasoning behind that one
  choice, then leaves. Lacks the threat position that makes the choice make sense.
- **Replacer.** About to swap magic links for an identity gate (from
  `replace-magic-links-with-cloudflare-access.md`) or add an auth channel (from
  `add-a-second-sign-in-group.md`). Knows the default works; wants which defenses move with the
  seam. Lacks: the defaults are floors, and the `identity` hand-off is where the gate plugs in.
- **Pre-ship checker.** Any of the above before launch; wants the responsibilities list at the end.

## Background the page rests on (the old intro skipped it)

- Why cairn holds identity at all: editors are non-technical, sign in by emailed link with no
  GitHub account and no password (`f:0ij7do`, `f:wvediq`); the Decap-style alternative needs a
  GitHub account with push access per editor (`f:0on5qx`). So cairn is the identity system
  (`f:u77pea`) and commits through the site's GitHub App, never a personal account (`f:kkp5bi`,
  `f:cjonmm`).
- Consequence: an editor's cairn sign-in is what stands between a person and a commit, which is
  why the threat position centers on the editor's account (`f:v85shm`).
- Where SvelteKit fits: cairn runs inside the site's SvelteKit app; the admin is the `/admin` part
  of it (`f:4zpvor`, `f:9xthnq`); every `/admin` request passes the guard, a server hook
  (`f:7qqhda`).
- Where Cloudflare fits: the app runs as a Worker (`f:i74t7g`); the store is D1; Worker isolation
  is Cloudflare's, linked out.

## Place in the doc set

The one concept page under "Auth and access". Task pages (Restrict admin access, Replace magic
links, Add a second sign-in group, Configure rendering, Rotate the GitHub App key) each configure
one piece and point here for the why; Architecture covers the parts and seams without the threat
reasoning.

## Intro plan

1. Model and why: opening statement from the reader's situation (people with no GitHub account
   change the site, so security starts from who they are); SvelteKit + Workers placement; why the
   emailed link; cairn as identity system; App commits.
2. Threat position (owner sentences kept, subject made explicit), the guard as the SvelteKit hook,
   Cloudflare isolation linked.
3. The readers and what each wants.
4. Seams for the replacer: floors, the `identity` hand-off, the auth channel; prior knowledge.
5. Covers list (kept), one bounding sentence for seams and ending, the elsewhere links (kept).

Departures from the plan's "Introduction" section: owner paragraph 2 (self-referential, closing
imperative) is replaced by the readers paragraph under Geoff's 2026-10-04 intro ruling, which bars
a page-describing opening and imperatives outside steps; paragraph 1's threat sentences are kept
word for word except the subject pronoun; the old "A site can also replace..." sentence folds into
the seams paragraph.
