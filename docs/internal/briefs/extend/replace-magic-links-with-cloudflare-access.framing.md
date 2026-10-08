# Framing record: `docs/extend/replace-magic-links-with-cloudflare-access.md`

Agent-facing, written 2026-10-04 for the intro-only round (owner feedback: intros thin; this page's
comment asked why cairn uses magic links, why someone would replace them, and flagged the
imperative first sentence). The introduction follows this record; the body is untouched.

## Who arrives, from where, and why

- **The organization's site developer** (the core reader). Arrives from the extend README's "Auth
  and access" group, the architecture page's seams table (the `identity` row), the security model's
  auth section, or a search for cairn plus SSO, Google Workspace, Entra, or Cloudflare Access.
  Runs a deployed magic-link site. Wants editors to sign in with the organization's accounts.
  Knows SvelteKit and Wrangler. Lacks: why the default is magic links (what they give up), what
  stays cairn's after the switch (the roster), and where Access sits relative to the Worker.
- **The developer still deciding.** Same arrival paths, earlier in the decision. Needs the costs
  before any step: all editors or none, Zero Trust's free-plan user cap, two admission lists to
  keep in agreement. Staying on magic links is the usual path, and the intro should make that a
  live option.
- **The developer behind another authenticating proxy.** Arrives by search or from the reference's
  `IdentityResolver` entry. Needs to learn the seam is not Cloudflare-specific and which parts of
  the page carry over (the resolver) and which they replace (the Cloudflare steps).
- **Readers whose need is elsewhere.** Someone who only wants a rebranded sign-in email; someone
  adding a second population beside magic-link editors. Each gets a redirect early.
- **The security reviewer.** Wants identity mode's threat analysis, which lives in the security
  model; one sentence routes them.

## Background the page rests on

- cairn's default sign-in: an emailed one-time link, no GitHub account, no password
  (f:0ij7do, f:7oxmh4). It is the default so a content site runs with zero config (f:zxdoaf, new),
  because cairn is itself the identity system, with `AUTH_DB` holding roster, sessions, and tokens
  (f:u77pea).
- SvelteKit's place: the guard is a plain `Handle` in the server hooks (f:dwc4kp) gating every
  `/admin` path except sign-in (f:9xthnq).
- Cloudflare's place: the site is a Worker (f:i74t7g); Access is an application in front of it that
  admits by policy and signs in through a connected provider (f:agif8l, f:gw1oas).
- Why replace: editors already hold provider accounts (f:gw1oas). What stays: the roster still
  decides who may edit among those Access lets through (f:k40l86).

## Place in the doc set

Auth and access group, beside the security model. The architecture page names the `identity`
seam and points here; the security model holds the threat analysis and points here for setup;
add-cairn sets up the magic-link starting state this page requires.

## Intro plan

1. Statement opener: the magic-link default, why it exists (zero config, cairn as identity system),
   and the guard as a SvelteKit handle gating `/admin`.
2. Why replace and how: editors with Workspace or Entra accounts; Access in front of the Worker;
   the contract sentence (Access application plus resolver); the roster stays cairn's; who does
   the work.
3. Decision input kept from the plan (all-or-nothing, the mechanism, the plan cap).
4. Prior knowledge and the three redirects, kept.
5. What the page leaves out, kept.
