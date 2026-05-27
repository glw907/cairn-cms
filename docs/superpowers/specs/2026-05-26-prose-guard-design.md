# Design: `prose-guard` — an AI-tell guard for docs, code comments, and content

> The writing-cleanup pass. Builds one workstation tool that flags AI-flavored-writing tells,
> wires it as a PreToolUse hook, supersedes ecnordic's per-repo content guard, and drives a
> phased cleanup of existing prose across the workspace and the Claude infrastructure.
> The cairn-cms ≥0.5.0 release is held until this pass completes.

## Why

The standing rule (memory `cairn-avoid-ai-tells-in-writing`) is to write docs *and* code comments
free of AI tells, the same standard ecnordic already enforces on its marketing content. Today only
ecnordic enforces it, only on `src/content/**`, and only inside the ecnordic subtree — its hook
uses `$CLAUDE_PROJECT_DIR`, so it never fires in the meta-workspace session whose project dir is
`~/Projects/cairn`. This pass closes that gap with a single tool and cleans what already shipped.

## Decisions locked during brainstorming (2026-05-26)

| Decision | Choice |
|---|---|
| Placement | **Workstation tool** in `~/.dotfiles`, stowed to `~/.local/bin/prose-guard`. Reusable beyond cairn. |
| Ruleset model | **Three tiers**, each tuned for its register: code comments, technical docs, general prose. |
| ecnordic's hook | **Superseded.** `prose-guard` becomes the single source of truth; ecnordic's per-repo hook is retired. |
| Comment extraction | **Pygments** — tokenize, scan only `Comment.*` tokens (no false hits on identifiers/strings/URLs). |
| Hook reach | **Global + cairn workspace** — wired in `~/.claude/settings.json` and `~/Projects/cairn/.claude/settings.json`. |
| Cleanup | **Release surface first, then full workspace, then Claude infrastructure** (three phases). |

## Architecture

One Python script, `prose-guard`, with two modes from a shared core:

- **Hook mode** (`prose-guard --hook`): reads the PreToolUse tool-call JSON on stdin, classifies the
  target file by path, scans the content being written (`Write.content`, `Edit.new_string`, the
  joined `MultiEdit` new strings), and exits `2` with a hit report on stderr when it finds a tell —
  which Claude Code feeds back and blocks the write. Otherwise exits `0`. On *any* internal
  exception it exits `0`: a hook bug must never block real work. (Ecnordic's doctrine, kept.)
- **Sweep mode** (`prose-guard <paths…>`, `prose-guard --all`): scans whole files, prints a grouped
  report, exits non-zero when anything is flagged. Drives the cleanup phases and is CI-ready later.

The two modes differ only in how they obtain text and what they do with the result. Classification,
extraction, and scanning are shared.

### Module shape

A single file is enough, organized into small, independently testable functions:

- `classify(path) -> Tier | None` — path globs decide the tier; `None` means "don't scan."
- `extract_comments(path, text) -> str` — Pygments lexer by filename; join `Comment.*` token values.
  Returns `""` and is skipped if Pygments can't load or lex.
- `scan(text, tier) -> list[Issue]` — the structural detectors plus the tier's phrase/opener/word
  lists. `Issue` is `(kind, snippet, hint)`.
- `report(issues, path) -> str` — the human-readable hit list (shared by both modes).
- `main_hook()` / `main_sweep(paths)` — the two entry points; `main()` dispatches on `--hook`.

## Tiers

The tier selects which checks run. Classification is purely path-based.

| Tier | Matches | What runs |
|---|---|---|
| **general** | `**/src/content/**/*.md` | Full ruleset — ports `ecnordic-ski/docs/content-guide.md` (the marketing-voice authority). Structural tells + banned phrases + banned openers + the full word-list (`seamless, robust, leverage, comprehensive, dedicated, curated, tailored, foster, elevate, …`). |
| **docs** | every other `*.md`: `PLAN/ARCHITECTURE/README/CLAUDE.md`, `docs/**`, `.claude/**/*.md`, memory files | Structural tells + banned phrases + banned openers + a **trimmed** slop list (`delve, tapestry, multifaceted, testament, seamless`). **No** judgment words — `robust`, `leverage`, `comprehensive`, `dedicated`, `curated`, `tailored` are frequently the right word in technical prose and cairn's own docs use them. |
| **comments** | code files (`.ts .js .mjs .cjs .svelte .py .go .sh …`) | Pygments comment text only. Structural tells + banned phrases + banned openers. **No word-list at all** — comments legitimately say "robust", "comprehensive". |

### Shared structural detectors (every tier)

These are the high-confidence, regex-reliable tells, lifted from the ecnordic guard:

- **Em-dash appendage** — a sentence with exactly one em dash and a 1–6-word trailing fragment after
  it. The signature tell. A balanced *pair* of em dashes (an appositive) is allowed.
- **Em-dash spray** — more than two em dashes on one line.
- **`not only … but also`** — the correlative-pair construction.

### Lists (per tier, in a `RULES` table)

- **Banned phrases** (docs + comments + general): `it's worth noting`, `when it comes to`,
  `dive into`, `delve`, `let's explore`, `at the end of the day`, `game-changer`,
  `state-of-the-art`, `look no further`, `in today's world`.
- **Banned openers** (docs + comments + general): `moreover`, `additionally`, `furthermore`,
  `in conclusion`, `needless to say`, `certainly`, `it should be noted`.
- **Word-lists**: general = full ecnordic list; docs = trimmed slop only; comments = none.

A single `RULES` dict keyed by tier toggles which lists apply, so retuning is a one-line edit.

### Scanning details (carried from the ecnordic guard)

Skip fenced code blocks, YAML frontmatter, and lines containing `PLACEHOLDER`. Word and phrase
matches are case-insensitive; word matches are whole-word with a trailing `\w*` so `leverage`
catches `leveraging`. Openers are checked sentence-initially after stripping markdown list/emphasis
markers. The en dash (`–`, U+2013, used for ranges) is never flagged; only the em dash (`—`) is.

## Comment extraction (Pygments)

Pygments 2.19.2 is installed. Pick the lexer with `get_lexer_for_filename(path)`, tokenize the text,
and keep token values whose type is in `Comment` (covers `Comment.Single`, `Comment.Multiline`,
`Comment.Special`/JSDoc, and HTML/Svelte `<!-- -->`). Join them with newlines and run `scan` at the
`comments` tier. This is what keeps the guard off identifiers, string literals, and URLs — the
false-positive trap a naive `//`/`#` regex falls into.

Hook mode on an `Edit` sees only the `new_string` fragment, so it lexes the fragment. A fragment
that starts mid-comment may lex imperfectly; that is an accepted limitation (ecnordic's hook has the
same fragment horizon). Whole-file correctness comes from sweep mode and a later CI pass. Any
Pygments failure (no lexer, lex error) returns no comments and is skipped — never an error.

## Wiring & supersession

- **New** `~/Projects/cairn/.claude/settings.json` (the first `.claude/` at the workspace root):
  a PreToolUse `Write|Edit|MultiEdit` hook running `prose-guard --hook`.
- **Global** `~/.claude/settings.json`: the same PreToolUse hook, so edits to skills, memory, and
  `CLAUDE.md` files anywhere are guarded. This is what "guard all Claude infrastructure" means going
  forward.
- **Retire ecnordic's hook**: remove the `content-style-guard.py` entry from
  `ecnordic-ski/.claude/settings.json` and delete the script. `prose-guard`'s `general` tier (path
  `src/content/**`) carries its rules forward. Keep `ecnordic-ski/docs/content-guide.md` as the
  documented authority for those rules.

Because `prose-guard` is a stable absolute path in `~/.local/bin`, both settings files invoke it
directly — no `$CLAUDE_PROJECT_DIR` indirection, so it fires regardless of the session's project dir.

## Cleanup phases

The guard reports; I edit with judgment (it never auto-rewrites). Each phase is a sweep, then fixes.

- **Phase 1 — release surface** (unblocks ≥0.5.0). `cairn-cms/docs/**` (PLAN, ARCHITECTURE, the
  critique, FORWARD-COMPAT, creating-a-cairn-site), the extracted `cairn-cms` `render/*` comments,
  and the Pass ROBUST code comments. After this, the held bundle (render extraction + Pass ROBUST +
  AUTH decommission) can publish.
- **Phase 2 — full workspace sweep.** The remaining docs and code comments across `cairn-cms`,
  `ecnordic-ski`, and `907-life` (excluding `node_modules`, `dist`, build output, vendored code).
- **Phase 3 — Claude infrastructure.** Geoff-authored Claude infra prose, enumerated:
  - global `~/.claude/CLAUDE.md` and each repo's `CLAUDE.md`,
  - authored skills under `~/.claude/skills/**` (cairn-pass, site-pass, ship, go-conventions, …) —
    **not** third-party plugin skills (superpowers et al.),
  - hook scripts' docstrings/comments, including `prose-guard`'s own,
  - agent definitions and any prose in settings,
  - the memory files under `~/.claude/projects/.../memory/*.md`,
  - the dotfiles `claude` stow package.

## Error handling

- Hook mode wraps `main()` in a bare `except` → exit `0`. The guard fails open by design.
- Pygments load/lex failure → no comments extracted, scan skipped for that file.
- Sweep mode reports per-file errors to stderr and continues; a file it can't read is skipped, not
  fatal.

## Testing

`pytest`, table-driven:

- **Per-tier scan tests**: known-bad lines (each must be caught at the tiers that should catch it)
  and known-good lines (must pass), proving the tier gates work — e.g. `robust` passes `comments`
  and `docs` but is caught in `general`.
- **Structural-detector tests**: appendage vs. allowed appositive pair; spray threshold; en dash
  never flagged.
- **Comment-extraction tests**: a `.ts`, a `.svelte`, and a `.py` fixture where a tell sits in a
  comment (caught) and an identical string sits in a string literal / identifier (not caught).
- **Hook-protocol tests**: stdin JSON for Write/Edit/MultiEdit → correct exit code; unknown path →
  exit `0`; malformed JSON → exit `0`.
- **Self-guard**: `prose-guard`'s own docstrings pass its `comments` tier.

## Out of scope

Auto-rewriting prose (the guard reports; edits are human-judged). Cadence/tricolon/burstiness
detection (left to self-critique, not regex). CI integration (sweep mode is built CI-ready, but
adding it to the sites' workflows is a later pass). Third-party plugin skills and vendored code.

## PLAN.md / tracking

This pass is the held gate before the cairn-cms ≥0.5.0 release. On completion: append a progress-log
entry to `cairn-cms/docs/PLAN.md`, note ecnordic's guard supersession, and mark the writing-cleanup
gate cleared so the bundled release (render extraction + Pass ROBUST + AUTH decommission) can ship.
Update memory `cairn-ai-tell-guard-pass` from "planned" to "built."
