# Design: a two-prong system for AI-tell-free prose

> The writing-cleanup initiative. Two prongs that share one engine: **generation** (an
> always-on output style that shifts Claude toward good prose) and **detection** (the
> `prose-guard` tool — a blocking write-time hook plus a sweep/CI scanner). A phased cleanup
> removes the tells already in the tree. The cairn-cms ≥0.5.0 release is held until the
> cleanup completes.

## Why

The standing rule (memory `cairn-avoid-ai-tells-in-writing`) is to write docs and code comments
free of AI tells, the standard ecnordic already enforces on its marketing content. Two gaps:
the rule only fired inside the ecnordic subtree on `src/content/**`, and a word-blocklist
catches the easy lexical tells while missing what actually reads as machine-written — the
*cadence*. This design closes both. It teaches the voice at generation time and catches lapses
at write time, and it goes past banned words to sentence structure.

## Two prongs

Detection alone punishes after the fact and teaches nothing about rhythm. Generation alone
drifts and can't be audited. Run both, sharing one rule engine:

- **Prong 2 — generation (write well the first time).** A Claude Code **output style**,
  always on, that biases every response toward varied, plain prose. This is the higher-leverage
  prong: fewer tells get written in the first place.
- **Prong 1 — detection (catch what slips through).** The `prose-guard` tool. A blocking
  PreToolUse hook stops a write that trips the rules and hands Claude a structured reason to
  fix; a sweep mode scans whole files for the cleanup pass and for CI.

The output style's self-check step runs `prose-guard` on a draft, so prong 2 uses prong 1's
engine. The thin always-loaded standard in CLAUDE.md points at both.

## Decisions locked (brainstorming + research, 2026-05-26)

| Decision | Choice |
|---|---|
| Shape | **Two prongs:** generation (output style) + detection (`prose-guard`). |
| Detection placement | **Workstation tool** in `~/.dotfiles`, stowed to `~/.local/bin/prose-guard`. |
| Detection depth | **Lexical + structural regex + statistics**, native Python. No Vale, no LLM in v1 (LLM "deep" pass is a future flag). |
| Rule tiers | **Three**, by path: code comments / technical docs / general (marketing) prose. |
| Blocking vs advisory | The hook blocks on **lexical + high-precision structural** tells only. **Statistics (burstiness) and multi-sentence patterns are sweep-only/advisory** (they need whole-doc context and carry false-positive risk). |
| Hook protocol | **JSON `permissionDecision: "deny"`** with a `permissionDecisionReason` (2026 best practice), `"timeout": 5`, fail-open on internal error. |
| ecnordic's hook | **Superseded** — `prose-guard` is the single source of truth; ecnordic's per-repo guard retired. |
| Comment extraction | **Pygments** — scan only `Comment.*` tokens (Svelte → HTML lexer fallback). |
| Hook reach | **Global + cairn workspace** `settings.json`. |
| Generation mechanism | **Output style** `~/.claude/output-styles/writing-voice.md` with `keep-coding-instructions: true`; set default via `"outputStyle"` in global `~/.claude/settings.json`. |
| Comment voice | Cleaned comments also follow their **stack conventions** (go-conventions for Go, file idiom for TS/Svelte, PEP 257 for the Python tool). The guard removes tells; conventions govern form. |
| Cleanup | **Two passes** with a context-clear between: Pass 1 builds both prongs + cleans Claude infrastructure; Pass 2 cleans the release surface + full workspace. |

---

# Prong 1 — detection (`prose-guard`)

One Python script at `~/.dotfiles/bin/.local/bin/prose-guard`, stowed to `~/.local/bin`.

## Modes

- **Hook** (`prose-guard --hook`): reads the PreToolUse tool-call JSON on stdin, classifies the
  target file, scans the content being written, and on a hit prints a JSON deny decision on
  stdout and exits 0. On a clean file it prints nothing and exits 0. On any internal exception
  it exits 0 (fail open — a hook bug must never block work). The blocking layer is **lexical +
  structural regex** only.
- **Sweep** (`prose-guard <paths…>` / `--all`): scans whole files, runs **every** layer
  including statistics and multi-sentence patterns, prints a grouped report, exits 1 if anything
  is flagged. Drives the cleanup pass and is CI-ready.

### Hook output (2026 best practice)

On a hit, write to stdout and exit 0:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "prose-guard (docs): 2 AI-writing tell(s) — banned opener 'Moreover' (line 3); em-dash appendage (line 7). Rewrite and retry."
  }
}
```

`permissionDecision: "deny"` cancels the tool call even under `defaultMode: bypassPermissions`
(PreToolUse runs before the permission-mode check), and `permissionDecisionReason` is fed back
to Claude so it self-corrects on the retry. Exit 2 + stderr is the older, coarser form; this
design uses the JSON form. Never mix them (Claude ignores JSON when the hook exits 2).

**Known gap:** the `Write|Edit|MultiEdit` matcher does not see prose written via a Bash
heredoc/`tee`. Acceptable for this use; a `Stop`-hook tree scan could close it later if needed.

## Tiers (by path)

| Tier | Matches | Lexical word-list |
|---|---|---|
| **general** | `**/src/content/**/*.md` | Full ecnordic list (ports `content-guide.md`). |
| **docs** | every other `*.md`: PLAN/ARCHITECTURE/README/CLAUDE.md, `docs/**`, `.claude/**/*.md`, memory | Trimmed slop list only (no judgment words). |
| **comments** | code files (`.ts .svelte .py .go …`), Pygments comment text only | None. |

## Detection layers

Lexical and structural run per line and feed both hook and sweep. Statistics and multi-sentence
run on the whole document, sweep-only.

### Lexical (blocking)
Banned phrases, banned openers, the `not only … but also` correlative, and the tier's word-list.
Whole-word, case-insensitive, with the frontmatter / fenced-code / `PLACEHOLDER` skips carried
from the ecnordic guard. The en dash (ranges) is never flagged; only the em dash.

### Structural regex (blocking, high-precision)
A small set of patterns chosen for precision in technical prose. Run in every tier:

- **Negative antithesis** — "it's not X, it's Y" / "this isn't X, it's Y":
  `(?i)\b(it|this|that)'?s?\s+(not|isn'?t)\b[^.!?;]{3,60}[,;]\s+(it|this|that|but)'?s?\b`
- **"Not just X but Y" escalation:** `(?i)\bnot\s+just\b[^.!?]{5,60}\bbut\s+(also\s+)?`
- **Setup-colon payoff (hollow nouns only):**
  `(?i)\b(the\s+)?(point|takeaway|truth|reality|bottom line|catch|kicker)\s*:\s+[A-Z]`
- **"serves as / stands as / acts as" copula dodge:** `(?i)\b(serves?|stands?|acts?|functions?)\s+as\s+a\b`
- **Participial wind-up opener** — sentence opens with a hollow gerund bridge from a curated
  list (`Building on`, `Recognizing`, `Leveraging`, `Drawing on`, `Having established`,
  `Taking … into account`).
- **Bold-header bullet** (AI markdown default) — a `**Bold**:` bullet whose value continues as a
  sentence (opens with a pronoun or article): `(?im)^\s*[-*]\s+\*\*[^*]+\*\*\s*[:—-]\s+(it|this|that|these|those|they|we|you|our|your|its|a|an|the)\b`.
  Narrowed during Pass 1 so terse key-value definition-list bullets (`- **OS**: Linux Mint`) pass;
  only the fake-heading listicle form fires.

These are "flag for review," tuned to rarely fire on clean human prose. Each is unit-tested with
a positive and a legitimate-negative case.

### Statistics (sweep-only, advisory)
On passages of 150+ words:
- **Burstiness** `B = stdev(sentence_word_counts) / mean(sentence_word_counts)`. Warn at
  `B < 0.40`, strong-warn at `B < 0.25`. (Human prose ≈ 0.6–1.2; model prose ≈ 0.15–0.4.)
- **Mean sentence length** > 22 words combined with `B < 0.45` (the "flat hum" profile).
- **Type-token ratio** `unique/total` < 0.40 on 200+ words.

Thresholds are config-exposed; no threshold is universal (reference docs run naturally flat).
Statistics never block and never run on the `comments` tier (comments are too short to be
meaningful).

### Multi-sentence (sweep-only, advisory)
- **Anaphora** — 3+ consecutive sentences opening with the same word.
- **Consecutive tricolons** — more than two "A, B, and C" lists back to back in a paragraph.
- **Listicle-in-prose** — "First … Second … Third …" across consecutive sentences.

## Comment extraction (Pygments)

`get_lexer_for_filename(path)`, keep token values whose type is in `Comment`. Svelte has no
Pygments lexer → fall back to `HtmlLexer` (covers `<!-- -->` and embedded script/style). Any
Pygments failure returns no comments and is skipped, never raised. The hook's `Edit` fragment is
lexed as-is (an accepted horizon; whole-file correctness comes from sweep + CI).

## Module shape
`classify`, `_scannable_lines`/`_strip_frontmatter`, `scan(text, tier)` (lexical + structural),
`analyze_document(text, tier)` (stats + multi-sentence), `extract_comments(path, text)`,
`report(...)`, `hook_decision(issues, path, tier)` (the JSON), `main_hook`, `main_sweep`, `main`.

---

# Prong 2 — generation (output style)

A custom output style makes good prose the default for every response, without removing Claude's
coding behavior.

## Artifact

`~/.dotfiles/claude/.claude/output-styles/writing-voice.md` (stowed to `~/.claude/output-styles/`):

```markdown
---
name: writing-voice
description: Always-on plain-voice prose guidance; avoids AI-writing tells
keep-coding-instructions: true
---

<positive cadence guidance + tell catalogue + before/after examples — see below>
```

`keep-coding-instructions: true` appends this guidance to the full software-engineering system
prompt, so coding behavior is preserved. Persist it with `"outputStyle": "writing-voice"` in
global `~/.claude/settings.json` (the only current activation path; the `/output-style` command
was removed in v2.1.91 — use `/config` to switch interactively). It takes effect at session
start, so it is live for Pass 2 and every session after.

## Body (what the style teaches)

Positive cadence first, because examples teach rhythm better than bans:
- **Vary sentence length** — mix short and long; never four medium clauses in a row. (This is
  burstiness, the strongest human/AI signal.)
- One idea per sentence; don't bridge three with em dashes.
- Prefer **implicit** contrast over the explicit "not X, it's Y" / "not just X but Y" frame.
- Cut tricolons to the one item that earns its place.
- Start a sentence with its subject, not a participial wind-up or a connector.
- Don't end a paragraph by restating it.
- Avoid the lexical tells (kept as a short fenced list so the style doesn't trip its own guard).
- Two or three **before/after** rewrites of real AI-cadence prose into the plain target voice.
- Scope: applies to text output (docs, comments, commit messages, error strings, replies); does
  not change code or tool behavior. Code comments additionally follow their stack's conventions.

## Relationship to the other layers
- **CLAUDE.md** stays a thin, always-loaded pointer: "before writing prose, the writing-voice
  output style applies" + the few highest-value principles. It does not carry the full tutorial
  (it would cost tokens every turn).
- **The guard** is the backstop and the self-check tool the style names.

## Optional later: a `Stop`-hook nudge
A `Stop` hook with `type: "prompt"` could review each finished turn and inject a soft reminder
when it spots cadence tells, a non-blocking complement to the write-time hook. Out of scope for
v1; noted so the architecture leaves room.

---

# Wiring & supersession

- **Global** `~/.claude/settings.json` (symlinked to `~/.dotfiles/claude/.claude/settings.json`,
  already holds SessionStart + Notification): add a PreToolUse `Write|Edit|MultiEdit` hook
  (`prose-guard --hook`, `"timeout": 5`) and the `"outputStyle": "writing-voice"` key. Merge;
  don't overwrite the existing hooks.
- **New** `~/Projects/cairn/.claude/settings.json`: the same PreToolUse hook.
- **Retire ecnordic's hook**: remove the `content-style-guard.py` entry from
  `ecnordic-ski/.claude/settings.json` and delete the script; keep `content-guide.md` as the
  documented authority for the `general` tier.

`prose-guard` is invoked by absolute name on `PATH` (no `$CLAUDE_PROJECT_DIR`), so it fires
regardless of the session's project dir.

# Cleanup — two passes, context-clear between

- **Pass 1 — infrastructure (`…-infrastructure.md`).** Build `prose-guard` (all layers) + tests,
  stow, wire the hook + output style (global + workspace), retire ecnordic's hook, add the thin
  CLAUDE.md pointer, and clean **all Claude-infrastructure prose** (global + repo `CLAUDE.md`,
  authored skills under `~/.claude/skills/**`, hook docstrings incl. the tool's own, agent defs,
  memory files, the dotfiles `claude` package). Then clear context.
- **Pass 2 — repo cleanup (`…-cleanup.md`).** Phase 1 release surface (cairn-cms docs + `render/*`
  + Pass ROBUST comments) → Phase 2 full workspace (ecnordic, 907). The guard reports; edits are
  human-judged; comment fixes follow stack conventions; a clean sweep is necessary but a human
  cadence read is the real bar. Then clear the writing-cleanup gate in PLAN.md so the held
  ≥0.5.0 bundle (render extraction + Pass ROBUST + AUTH decommission) can ship.

# Best-practice basis (validated 2026-05-26)

Confirmed current against `code.claude.com/docs` via the Claude Code guide: JSON
`hookSpecificOutput.permissionDecision: "deny"` is the preferred PreToolUse block form and fires
before the permission-mode check; the `hooks.PreToolUse[].matcher` + `hooks[]` shape and the
`Write|Edit|MultiEdit` pipe matcher are current; fail-open + a short `timeout` are the right
posture; output styles with `keep-coding-instructions: true` are current and the `outputStyle`
settings key is the supported persistence (only the `/output-style` slash command was removed).
Detection-method basis: burstiness (coefficient of variation of sentence lengths) is the most
robust model-free signal (GPTZero methodology; thinkst/zippy); perplexity needs a local model
and is too noisy for v1; AI-detectors are unreliable, so every statistical/structural finding is
"flag for review," never a verdict. Structural patterns drawn from Wikipedia "Signs of AI
writing", tropes.fyi, and Gorrie's rhetorical analysis (explicit vs. implicit antithesis).

# Testing

`pytest`, table-driven: per-tier lexical gating (e.g. `robust` passes comments/docs, caught in
general); structural-regex positives + legitimate negatives for each pattern; burstiness on a
flat vs. varied passage; anaphora across three sentences; Pygments comment-vs-string-literal
across `.ts`/`.svelte`/`.py`; hook protocol (Write/Edit/MultiEdit → JSON deny / clean exit 0;
unknown path → 0; malformed JSON → 0). The tool's own docstrings pass its `comments` tier; the
output style and CLAUDE.md pointer pass their `docs` tier (literal token lists inside fences).

# Out of scope (v1)

Auto-rewriting prose (the guard reports; edits are human-judged). Perplexity / LLM "deep" pass
(future `--deep` flag). Vale adoption. The `Stop`-hook nudge. CI wiring of the sweep (sweep is
built CI-ready; adding it to the sites' workflows is a later pass). Third-party plugin skills and
vendored code.
