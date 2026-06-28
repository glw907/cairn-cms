# Extensibility competitive research

How developer-extensible CMSs and content frameworks handle three things: extending the admin with
custom screens, reusing the login session on a developer's own routes, and keeping customizations
working across version upgrades. Gathered 2026-06-28 to ground the developer-extensibility design
([`docs/superpowers/specs/2026-06-28-cairn-developer-extensibility-design.md`](../superpowers/specs/2026-06-28-cairn-developer-extensibility-design.md)).
Sources are primary vendor documentation current as of mid-2026 (Payload v3, Sanity Studio v6, Strapi
v5, Directus current, Keystatic/Decap current). Findings were adversarially verified (25 claims, 25
confirmed, 0 killed in the verification pass).

## Admin extension converges on declarative config registration

Mature CMSs register custom components through a typed config object the host imports and the CMS
resolves. None ask consumers to patch internals.

- **Payload** identifies components by file-path string across four scopes (Root, Collection, Global,
  Field), with named exports via a `#export` hash. "Components are not directly imported into your
  config. Instead, they are identified by their file path."
- **Sanity** passes a `plugins` array in `sanity.config.ts` and treats even its Structure Tool as a
  plugin whose resolver receives the structure builder `S` plus a `context`.
- **TinaCMS** customizes per field via a `ui` property and registers field plugins through a
  `cmsCallback` hook.
- **Decap** registers custom field widgets and Markdown block components on a global `window.CMS`
  (`CMS.registerWidget(...)`).

The takeaway for cairn: the field's pattern exists because these tools are not the host framework and
must dispatch components through their own runtime. cairn is a SvelteKit app, so it does not need a
dispatcher at all. A custom screen is a SvelteKit route; cairn only needs a data-only registration for
the sidebar entry.

## Auth-session reuse splits by architecture

Tools with a runtime backend expose the logged-in user for reuse; the markdown-in-git tools do not.

- **Payload** models auth as a per-collection flag (`auth: true`), so the user is an ordinary
  queryable document and login/logout/me/refresh are auto-added to the REST, Local, and GraphQL APIs.
- **Directus** issues a single httpOnly `directus_session_token` cookie, auto-attached on same-domain
  requests, read server-side to call `readMe()` for the current user and role. This is the closest
  precedent to cairn's model: read the session in a server `load`, not a token in JS.
- **Strapi** authenticates end-users by JWT in an `Authorization: Bearer` header, so reuse means
  carrying the token. Its admin-panel auth and end-user auth are explicitly two disjoint systems with
  no integration bridge.
- **TinaCMS self-hosted** is the one tool with an explicit named two-sided auth contract: a frontend
  `AbstractAuthProvider` (`authenticate`, `getUser`, `getToken`, `logOut`) and a backend
  `BackendAuthProvider` whose `isAuthorized` validates the token.
- **Keystatic and Decap**, the tools sharing cairn's markdown-in-git, no-runtime-content-DB
  architecture, gate login on git-host repo access (a GitHub App OAuth flow at `/keystatic`) and
  provide **no documented mechanism** to reuse that login or read the user on a developer's own app
  routes.

The takeaway for cairn: its stated goal (reuse the magic-link editor login on the developer's own
SvelteKit routes via a same-domain session cookie) is genuinely differentiated rather than catch-up.
The Directus same-domain cookie is the precedent to mirror, and TinaCMS's named two-sided contract is
the shape to imitate for a documented, callable "who is logged in" surface.

## Extension-API stability is informal and fails badly

Across the field, stability is npm-peer-dependency-mediated or undocumented, and the failure modes are
upgrade-blocking or silent.

- **Sanity** requires each plugin to publish a host-compatible `peerDependencies` range per major
  version. "Until you publish that range, studios upgrading to v6 that depend on your plugin will hit
  an npm peer-dependency error."
- **Decap** publishes no explicit stability statement for custom widgets; stability is inferred only
  from longevity, and its docs reference Babel-7/Webpack-4-era tooling.
- **Strapi** keeps admin-panel auth and end-user auth as distinct systems with no integration
  mechanism, a structural seam developers must bridge themselves.

The takeaway for cairn: a documented-only boundary drifts and fails silently. An *enforced* boundary
(a single versioned export subpath, `attw`'s internal-resolution rule un-muted, a surface-snapshot
gate) that fails *loud at build time* targets the axis the field handles worst. A version-gate that
fails loud beats both Sanity's peer-error wall and Decap's silent inference.

## Framework coupling is industry-normal

**Keystatic** ships framework-specific installation paths and a local admin that runs inside Next.js
or Astro, with a React editing UI regardless of host. This is a deliberate choice for an opinionated
tool, not a defect.

The takeaway for cairn: single-framework coupling need not be hidden behind a portability layer.
cairn's coupling is tighter still (it mounts with Svelte's own `mount()`), so its extension seam
should let a developer write Svelte naturally rather than forcing a foreign component model into the
shell.

## Open questions the research did not settle

- KeystoneJS, Statamic, and WordPress produced no surviving verified claims in this batch, so the
  comparison is silent on them. WordPress in particular is the reference case for both a stable
  hooks/filters contract and same-app session reuse, and is worth a targeted follow-up if a future
  design needs it.
- "No documented mechanism" (Decap auth reuse, Strapi admin/end-user bridge) means absent from docs,
  not provably impossible. Undocumented workarounds may exist.
- Strapi since v5.24 does use httpOnly admin cookies and an opt-in refresh-session mode, so the
  "purely token-oriented" characterization is slightly overstated for the admin panel, though
  external-app reuse genuinely remains JWT-in-header.
