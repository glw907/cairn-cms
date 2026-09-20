# The `cairn-guidance` CLI

`cairn-guidance` installs and checks the package's agent-facing guidance in a consumer repo: the
skills under `skills/`, the read-only `cairn-extension-reviewer` agent, and a `CLAUDE.md` fragment
that points a build agent at the boundary, the atoms, and the gates. A scaffolded site is born
with all three baked in; `cairn-guidance install` is how an existing site adopts them, and how any
site refreshes after a version bump.

## How to run it

```bash
npx cairn-guidance install
npx cairn-guidance check
npx cairn-guidance check --strict
```

Both commands read and write relative to the working directory, so run them from the site's root,
the same directory `cairn-doctor` runs in.

## `install`

`install` copies every directory the package ships under `skills/`, the review agent under
`claude/agents/`, and the `CLAUDE.md` fragment into `.claude/`:

- `.claude/skills/<dir>/` for each packaged skill directory
- `.claude/agents/cairn-extension-reviewer.md`
- `.claude/cairn/CLAUDE.md`, the fragment
- `.claude/cairn/VERSION`, stamped from the installed package's own version
- `.claude/cairn/MANIFEST`, the list of paths this install wrote

Every write is contained under `.claude/`; a destination that would resolve outside it is refused
and named rather than written. `install` never writes `.claude/settings.json`, `CLAUDE.md` at the
repo root, `package.json`, or anything under `.github/`.

When a destination's existing content differs from what the package now ships, `install` writes
`<destination>.orig` beside it before overwriting, so an edit is recoverable. An existing `.orig`
is never rewritten: the first divergence is what gets preserved, and a later install keeps
refreshing the destination without touching it again. `.orig` files are meant to be read and
deleted, not ignored, and the whole guidance tree belongs in the site's own commit, so an upgrade's
guidance change is a reviewable diff in the site's repo.

`install` never deletes. A path a previous `MANIFEST` listed that the current package no longer
ships is reported as removable, left for the site to remove by hand.

## `check`

`check` reports seven lines, then a recommendation block that is never counted:

1. The guidance tree's freshness against the installed package (fresh, stale, or missing), by the
   same content hash `install` uses, with any removable path named.
2. Whether the root `CLAUDE.md` carries the `@.claude/cairn/CLAUDE.md` import line.
3. Whether `package.json` declares a `check:cairn` script.
4. Whether `cairn-audit.config.json` is present.
5. Whether `.github/workflows/check.yml` is present.
6. Whether `.claude/` is excluded from the site's own Tailwind build.
7. Whether any `.orig` file is still present.

`check` exits 0 by default; a missing gate-wiring item never fails the run, it is reported so the
site can paste the matching snippet. `--strict` exits 1 when the guidance tree itself (line 1) is
stale or missing, for a site that wants the gate.

The recommendation block names the DaisyUI skill install, a free DaisyUI documentation MCP server,
and Blueprint as the paid option, none of it gated.

## The `.claude/` exclusion from the Tailwind build

The installed skills' own reference files quote utility class names verbatim as worked examples,
and Tailwind v4's automatic source detection scans any non-ignored file under the project,
`.claude/` included. Exclude `.claude/` from the site's own Tailwind build (an `@source not`
directive, available from Tailwind 4.1, or the equivalent of a `.gitignore` exclusion for the
toolchain in use) so those examples never compile into the site's own shipped CSS. A gitignored
`.claude` passes `check`'s item 6 outright, since Tailwind's own scanner already skips it.

## The trust boundary

Shipping agent markdown adds no capability a compromised release does not already have: the
package runs four other bins and a Vite plugin in the site's build. It adds a review class,
because markdown is not typed, tested, or read by any gate. Two rules hold the line:
`cairn-guidance` never writes `.claude/settings.json`, because a hook is what would give a
compromised package unattended execution inside a developer's session without a deliberate edit;
and the shipped agent carries no tool that can write or execute
(`tools: Read, Grep, Glob`, no `Bash`, no model pin). Claude Code auto-discovers `.claude/skills/`
and `.claude/agents/` once they exist, so the honest statement is that installing the package's
guidance is the consent, and the one deliberate act that removes all of it is deleting
`.claude/skills/cairn-*`, `.claude/agents/cairn-extension-reviewer.md`, and `.claude/cairn/`.
Everything `install` writes is committed to the site's own repository, so it is diffable.

## See also

- [The `cairn-doctor` CLI](./doctor.md) for the setup preflight, a separate concern from guidance.
- [Is it working?](../admin/is-it-working.md) for the manual walkthrough the doctor's checks follow.
