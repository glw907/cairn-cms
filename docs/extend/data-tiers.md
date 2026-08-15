# Data tiers

Where cairn stores state, and why each kind of data lives where it does. Three tiers, each chosen
for what it's good at, none of them interchangeable with another.

## Git: content, the source of truth

Every entry is a markdown file with frontmatter, committed to the site's own repository. Git is the
source of truth for content by design: it's already the deploy trigger, it's already versioned, and
an editor's history is already an audit trail with no extra infrastructure. cairn never stores an
entry's body anywhere else; a read either fetches the file directly or reads a projection of it,
never a second copy that could drift from what's actually committed.

Two small, structured files are also committed, alongside the content they describe:

- **The content manifest**, one JSON row per entry: identity, routing facts, outbound `cairn:`
  links, reference-field edges, tags, and included fragments. A build regenerates and verifies it;
  a save patches its one changed entry in the same commit as the content change. It exists so the
  admin and the delivery layer can answer "what links here" or "what's tagged this" without an
  N+1 crawl of the repository through the GitHub API. See [Content model](./content-model.md).
- **The media manifest**, the equivalent small index for stored assets, covered below.

## D1: auth state and small operational records

Everything that has to answer a lookup in milliseconds on every admin request, and nothing that
belongs in an editor-readable git history, lives in D1. Five tables across four migrations, each
migration beyond the first opt-in:

- **`editor`, `magic_token`, `session`** (`0000_auth.sql`, the baseline auth store, always present
  once a site wires `AUTH_DB`): the allowlist, single-use sign-in tokens, and live sessions. A
  token and a session id are both looked up by their SHA-256 hash, never the raw value; `role` used
  to carry a database `CHECK` constraint limiting it to `owner`/`editor`, and `0001_roles.sql`
  rebuilds the table to validate against a site's declared role vocabulary at the application
  layer instead, so a site can extend the role set without a further schema migration. See
  [Security model](./security-model.md).
- **`audit_log`** (`0002_audit.sql`, opt-in: only a site that wires `createD1AuditSink` touches
  this table): one row per audited admin action, `actor`/`action`/`entity`/`entity_id`/`detail`,
  timestamped at millisecond-resolution ISO 8601 rather than the coarser, locally parsed format an
  earlier schema this one was adapted from used, since this column exists to be read by people.
- **`preview_tokens`** (`0003_preview.sql`, opt-in: only a site that mints preview links touches
  this table): a hashed, single-use-per-link token naming the draft it shares, swept on expiry the
  same no-cron way `magic_token` is. See [Share a draft preview](./share-a-draft-preview.md).

D1's role is deliberately narrow. It never holds content, and it never holds anything an editor
would expect to find by reading the repository; if a fact belongs in git's audit trail, it goes in
a commit, not a database row.

## R2: media bytes, deduplicated by content hash

A site that declares an `assets` block on its adapter gets an R2 bucket for uploaded media, bound
by name and resolved at request time from that declared binding, never a hard-coded one. Bytes are
addressed by their own content hash: the same image uploaded twice is stored once, and the media
manifest, keyed by a 16-hex hash prefix, is the dedup lookup an ingest checks before writing
anything. Each manifest row carries what the bytes themselves can't: a display name, alt text, the
original filename, and known pixel dimensions. Delivery serves the stored MIME type verbatim rather
than guessing from a URL extension, and optionally reaches Cloudflare's own Image Transformations
for the variant presets a site's `assets.variants` declares, when the zone has transformations on;
without that, the resolver serves the bare full-size original regardless of what preset was asked
for.

R2 exists specifically because git is the wrong place for binary asset bytes at any real scale, and
D1 is the wrong place for anything measured in megabytes. Both manifests are committed JSON under
`src/content/.cairn/`. Only the bytes they describe live in a different tier. The media manifest
keys by content hash rather than by concept and id, and carries exactly what the bytes themselves
can't: a display name, alt text, the original filename, and known pixel dimensions.

## Choosing the right tier for something new

The question that decides a new fact's home is what has to read it, and how fast. Something a
route needs to answer in milliseconds, keyed by a session or a token, belongs in D1. Something
whose byte size matters and that a URL should serve directly belongs in R2. Everything else, and
especially anything an editor authored or would expect to find in the repository's own history,
belongs in git, either as content or as one of the two committed manifests. A site extending cairn
with its own data (a member roster, an event schedule) makes this same choice for its own tables
and buckets; nothing about the engine's own three tiers constrains where a site's own extension
data lives, beyond the reserved `cairn_` cookie and table-naming conventions [Security
model](./security-model.md) and [Auth channel security model](./auth-channel-security-model.md)
each note in their own scope.
