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

The boundary is the real directory `.claude` in the working directory, not the name. `install`
refuses a destination whose path passes through a symlink at any point, and it refuses a
destination that is itself a symlink. A `.claude` that is a symlink refuses the whole tree,
because the files would land somewhere these rules do not cover. A working directory reached
through a symlinked parent is fine and installs normally. A refusal names the path, repairs
nothing, and the run continues with the remaining files. A refusal is distinct from a write
error: a failed write (an out-of-space disk, a permissions error) is reported by name with its
error code, not folded into the containment refusals, since the fix is different (free disk
space or a permission change, not a symlink or a path outside `.claude/`).

When a destination's existing content differs from what the package now ships, `install` writes
`<destination>.orig` beside it before overwriting, so an edit is recoverable. An existing `.orig`
is never rewritten: the first divergence is what gets preserved, and a later install keeps
refreshing the destination without touching it again. A symlink at the `.orig` path is refused by
name, and the destination beside it is refused too and left alone in that run: the recovery copy
could not be made, so the edit stays as the site left it, and both paths are named so an operator
can find which destination is stale. `.orig` files are meant to be read and
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

## What ships under `claude/`

The package's `claude/` directory, added to `files` alongside `skills/`, carries every file
`install` copies beyond the packaged skills:

- **`claude/CLAUDE.md`** is the fragment `install` writes to `.claude/cairn/CLAUDE.md`. It opens
  with the imperative to keep site-specific guidance out of this file, then carries the boundary
  in one paragraph, the named atoms with their reference pages, the gates and how to run them,
  the DaisyUI-first rule, the `Stop` hook snippet with its one-line why, the DaisyUI tooling
  recommendation, and where the docs are. It stays under 1,500 words.
- **`claude/agents/cairn-extension-reviewer.md`** is the read-only review agent `install` writes
  to `.claude/agents/`. Its frontmatter carries only `name`, `description`, and
  `tools: Read, Grep, Glob`, no `Bash`, no model pin, so it runs on the consumer's own default
  model and can only read a diff, never change or run anything. It checks a change against the
  boundary and the atoms, asks whether a new component could be a stock DaisyUI component
  instead, and whether an action with more than two outcomes uses the `outcome` grammar, then
  returns accept, fix, or escalate with `file:line` findings.
- **`claude/snippets/check-cairn.json`** carries the seven `package.json` script entries a site
  needs for the admin stylesheet build and the `check:cairn`/`check:cairn:rendered` gates,
  printed by `check` under its `check:cairn script` item when the site has none.
- **`claude/snippets/cairn-audit.config.json`** is the audit's own config, naming the compiled
  admin stylesheet, printed under `check`'s `cairn-audit.config.json` item when the site has none.
- **`claude/snippets/check.yml`** is a starting CI workflow running `npm run check`,
  `npm run check:cairn`, and `npx cairn-guidance check` (under `continue-on-error`) on push and
  pull request, printed under `check`'s CI workflow item when the site has none.
- **`claude/snippets/settings-hook.json`** is the `Stop` hook block quoted in the fragment
  above, for a site that wants to paste it straight into `.claude/settings.json` rather than
  copying it out of the fragment's prose.
- **`claude/snippets/claude-md-import.txt`** carries the one import line
  (`@.claude/cairn/CLAUDE.md`) a site's root `CLAUDE.md` needs, printed by `check`'s import-line
  item when it is absent.

## The three skills

`install` copies every directory the package ships under `skills/` into `.claude/skills/`:

- **`cairn-admin-screens`** teaches an agent the register cairn's own admin holds itself to
  before touching anything under `/admin`, admin-toolkit components, or `cairn-admin.css`,
  pointing at `cairn-audit`'s mechanical checks rather than restating their formulas.
- **`cairn-extend`** is the recipe router: given what a developer is building, it opens with
  whether a stock DaisyUI component already covers it, then names the atom, the seam, and the
  shipped recipe doc for each case, and closes with a pre-flight checklist reference.
- **`cairn-consult`** triggers when a developer has worked around the engine twice, or wants
  something the seams do not reach, and writes a consultation brief in the four-field format
  (what the pass builds, the engine edge it presses, evidence for the any-site case, the site's
  fallback if declined) filed at the installed package's `bugs.url` when it is reachable, or
  handed to the developer to send by whatever channel they have when it is not.

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
Everything `install` writes is committed to the site's own repository, so it is diffable. A third
rule holds the write side: `install` resolves every destination against the real `.claude`
directory and refuses any path that reaches it through a symlink, so a link committed in the
site's own repository cannot redirect the tree, or a `.orig` copy, onto a file elsewhere on the
machine.

## See also

- [The `cairn-doctor` CLI](./doctor.md) for the setup preflight, a separate concern from guidance.
- [Is it working?](../admin/is-it-working.md) for the manual walkthrough the doctor's checks follow.
