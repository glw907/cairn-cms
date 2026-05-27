# prose-guard Infrastructure (Pass 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build both prongs of the prose system and clean the Claude infrastructure. Prong 1: the `prose-guard` tool (lexical + structural + statistics) wired as a global + cairn-workspace blocking hook. Prong 2: the always-on `writing-voice` output style. Plus retire ecnordic's guard, add a thin CLAUDE.md pointer, and clean all Claude-infra prose. After this pass: clear context, then run Pass 2 (repo cleanup).

**Architecture:** One Python script at `~/.dotfiles/bin/.local/bin/prose-guard`, stowed to `~/.local/bin`. Hook mode reads PreToolUse JSON on stdin and emits a JSON `permissionDecision: "deny"` on a hit (blocks even under `bypassPermissions`); sweep mode scans whole files. Blocking layers are lexical + high-precision structural regex; statistics (burstiness) and multi-sentence patterns are sweep-only/advisory. The output style biases generation toward good prose with `keep-coding-instructions: true`. Both wired in global `~/.claude/settings.json`.

**Tech Stack:** Python 3.12, Pygments 2.19.2, `statistics`/`re` stdlib (no numpy), pytest, GNU Stow, Claude Code hooks + output styles.

**Spec:** `cairn-cms/docs/superpowers/specs/2026-05-26-prose-guard-design.md`

**Repos touched:** `~/.dotfiles` (tool, tests, output style, global settings, CLAUDE.md, claude-pkg cleanup), `ecnordic-ski` (retire hook), `cairn-cms` (PLAN.md note), `~/.claude/projects/.../memory` (memory + cairn `.claude/settings.json`).

---

## File structure

| Path | Responsibility |
|---|---|
| `~/.dotfiles/bin/.local/bin/prose-guard` | The tool (executable, no extension). |
| `~/.dotfiles/tests/test_prose_guard.py` | pytest suite, outside the `bin` stow tree; loads the tool by path. |
| `~/.dotfiles/claude/.claude/output-styles/writing-voice.md` | Prong 2 output style (stowed to `~/.claude/output-styles/`). |
| `~/.dotfiles/claude/.claude/settings.json` | Global hooks + `outputStyle` (symlinked to `~/.claude/settings.json`). |
| `~/.dotfiles/claude/.claude/CLAUDE.md` | Thin always-loaded writing-voice pointer. |
| `~/Projects/cairn/.claude/settings.json` | New cairn-workspace PreToolUse entry. |
| `ecnordic-ski/.claude/{settings.json, hooks/content-style-guard.py}` | Remove the hook entry; delete the script. |

---

## Task 1: Scaffold the tool and test harness

**Files:** Create `~/.dotfiles/bin/.local/bin/prose-guard`, `~/.dotfiles/tests/test_prose_guard.py`.

- [ ] **Step 1: Write the failing test**

```python
# ~/.dotfiles/tests/test_prose_guard.py
import importlib.machinery, importlib.util, pathlib

TOOL = pathlib.Path(__file__).resolve().parent.parent / "bin" / ".local" / "bin" / "prose-guard"


def _load():
    loader = importlib.machinery.SourceFileLoader("prose_guard", str(TOOL))
    spec = importlib.util.spec_from_loader("prose_guard", loader)
    mod = importlib.util.module_from_spec(spec)
    loader.exec_module(mod)
    return mod


pg = _load()


def test_module_loads():
    assert hasattr(pg, "classify")
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: FAIL — `FileNotFoundError`/`AttributeError`.

- [ ] **Step 3: Create the tool skeleton**

```python
#!/usr/bin/env python3
"""prose-guard — flag AI-flavored-writing tells in docs, code comments, and content.

Two modes:
  prose-guard --hook    PreToolUse guard. Reads the tool-call JSON on stdin,
                        classifies the target file, scans the content being
                        written, and on a hit prints a JSON deny decision and
                        exits 0. Clean files print nothing. Any internal error
                        also exits 0 — a hook bug must never block real work.
  prose-guard PATHS...  Sweep mode. Scans whole files (every layer, including
  prose-guard --all     statistics), prints a grouped report, exits 1 on a hit.

Three tiers, chosen by path: general (marketing), docs (technical), comments
(code, Pygments comment text only). The hook blocks on lexical + structural
tells; statistics and multi-sentence patterns are sweep-only/advisory.
"""
import json
import re
import sys

EM_DASH = "—"  # em dash. The en dash (–, ranges) is never flagged.
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def classify(path):
    """Return the tier for a path, or None to skip it."""
    return None  # Task 2


def main():
    args = sys.argv[1:]
    if args and args[0] == "--hook":
        return 0  # Task 7
    return 0  # Task 8


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--hook":
        try:
            sys.exit(main())
        except Exception:
            sys.exit(0)  # fail open
    else:
        sys.exit(main())
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "Add prose-guard skeleton + test harness"
```

---

## Task 2: `classify()` — path to tier

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
import pytest

@pytest.mark.parametrize("path,tier", [
    ("ecnordic-ski/src/content/posts/x.md", "general"),
    ("/abs/site/src/content/pages/y.md", "general"),
    ("cairn-cms/docs/PLAN.md", "docs"),
    ("README.md", "docs"),
    ("/home/glw907/.claude/CLAUDE.md", "docs"),
    ("src/lib/cairn/auth.ts", "comments"),
    ("App.svelte", "comments"),
    ("scripts/mint.py", "comments"),
    ("photo.png", None),
    ("data.json", None),
])
def test_classify(path, tier):
    assert pg.classify(path) == tier
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py::test_classify -q`
Expected: FAIL — all `None`.

- [ ] **Step 3: Implement `classify()`**

```python
CODE_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte",
    ".py", ".go", ".sh", ".bash", ".rs", ".java", ".c", ".h", ".cpp", ".css", ".scss",
}


def classify(path):
    """Return the tier for a path, or None to skip it."""
    p = path.replace("\\", "/")
    if p.endswith(".md"):
        return "general" if "/src/content/" in p else "docs"
    dot = p.rfind(".")
    if dot != -1 and p[dot:].lower() in CODE_EXTS:
        return "comments"
    return None
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py::test_classify -q`
Expected: PASS (10 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: classify paths into tiers"
```

---

## Task 3: Text-prep helpers (frontmatter, fences, PLACEHOLDER)

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing test**

```python
def test_scannable_skips_frontmatter_fence_placeholder():
    text = (
        "---\ntitle: robust thing\n---\n"
        "real prose line\n"
        "```\nfenced robust code\n```\n"
        "PLACEHOLDER: ignore me\n"
        "second prose line\n"
    )
    lines = list(pg._scannable_lines(text))
    assert "real prose line" in lines and "second prose line" in lines
    assert all("robust" not in ln for ln in lines)
    assert all("PLACEHOLDER" not in ln for ln in lines)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py::test_scannable_skips_frontmatter_fence_placeholder -q`
Expected: FAIL — no `_scannable_lines`.

- [ ] **Step 3: Implement the helpers**

```python
def _strip_frontmatter(text):
    """Drop a leading YAML frontmatter block so field values aren't scanned."""
    if text.lstrip().startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            return parts[2]
    return text


def _scannable_lines(text):
    """Yield prose lines; skip fenced code, frontmatter, blanks, and PLACEHOLDER notes."""
    in_fence = False
    for line in _strip_frontmatter(text).split("\n"):
        s = line.strip()
        if s.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not s or "PLACEHOLDER" in s:
            continue
        yield s
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py::test_scannable_skips_frontmatter_fence_placeholder -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: text-prep helpers"
```

---

## Task 4: `scan()` — lexical + structural detectors (the blocking layer)

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
def _kinds(issues):
    return [k for k, _s, _h in issues]

# lexical
def test_em_dash_appendage(): 
    assert any("appendage" in k for k in _kinds(pg.scan("We tap the button — it then saves.", "comments")))
def test_em_dash_pair_ok():
    assert not any("appendage" in k or "spray" in k for k in _kinds(pg.scan("The camp — four days long — is the week's highlight.", "docs")))
def test_en_dash_ok():
    assert pg.scan("Open 9–17 on weekdays.", "docs") == []
def test_phrase_all_tiers():
    for t in ("general","docs","comments"):
        assert any("dive into" in k for k in _kinds(pg.scan("Let us dive into the code.", t)))
def test_opener():
    assert any("moreover" in k for k in _kinds(pg.scan("Moreover, the cache helps.", "docs")))
def test_word_tiering_judgment():
    assert any("robust" in k for k in _kinds(pg.scan("a robust system", "general")))
    assert not any("robust" in k for k in _kinds(pg.scan("a robust system", "docs")))
    assert not any("robust" in k for k in _kinds(pg.scan("a robust system", "comments")))
def test_word_tiering_slop():
    assert any("tapestry" in k for k in _kinds(pg.scan("a rich tapestry", "docs")))
    assert not any("tapestry" in k for k in _kinds(pg.scan("a rich tapestry", "comments")))

# structural (every tier; high precision)
def test_negative_antithesis():
    assert any("antithesis" in k for k in _kinds(pg.scan("It's not a bug, it's a feature.", "comments")))
def test_not_just_but():
    assert any("not just" in k for k in _kinds(pg.scan("This is not just fast but also safe.", "docs")))
def test_setup_colon_payoff():
    assert any("setup-colon" in k for k in _kinds(pg.scan("The takeaway: ship it.", "docs")))
def test_setup_colon_negative():
    # a normal definitional colon must NOT fire (hollow-noun list only)
    assert not any("setup-colon" in k for k in _kinds(pg.scan("The config: a JSON file.", "docs")))
def test_serves_as():
    assert any("copula" in k for k in _kinds(pg.scan("The cache serves as a buffer.", "docs")))
def test_participial_windup():
    assert any("wind-up" in k for k in _kinds(pg.scan("Building on this, the system scales.", "docs")))
def test_bold_header_bullet():
    assert any("bold-header" in k for k in _kinds(pg.scan("- **Performance**: it is fast", "docs")))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: FAIL — `scan` not defined.

- [ ] **Step 3: Implement lists, `RULES`, structural patterns, and `scan()`**

```python
BANNED_PHRASES = [
    "it's worth noting", "when it comes to", "dive into", "delve", "let's explore",
    "at the end of the day", "game-changer", "game changer", "state-of-the-art",
    "look no further", "in today's world",
]
BANNED_OPENERS = [
    "moreover", "additionally", "furthermore", "in conclusion",
    "needless to say", "certainly", "it should be noted",
]
SLOP_WORDS = ["tapestry", "multifaceted", "testament", "seamless"]
JUDGMENT_WORDS = [
    "robust", "leverage", "comprehensive", "dedicated", "curated", "tailored",
    "foster", "elevate", "transformative", "pivotal", "thriving", "meticulous", "nuanced",
]
RULES = {
    "general":  {"words": SLOP_WORDS + JUDGMENT_WORDS},
    "docs":     {"words": SLOP_WORDS},
    "comments": {"words": []},
}

# (kind, compiled regex, hint). High-precision; run in every tier.
STRUCTURAL = [
    ("negative antithesis",
     re.compile(r"(?i)\b(it|this|that)'?s?\s+(not|isn'?t)\b[^.!?;]{3,60}[,;]\s+(it|this|that|but)'?s?\b"),
     "Explicit 'not X, it's Y' antithesis. Prefer an implicit contrast or a plain statement."),
    ("not just … but",
     re.compile(r"(?i)\bnot\s+just\b[^.!?]{5,60}\bbut\s+(also\s+)?"),
     "The escalation frame reads as AI. State the point directly."),
    ("setup-colon payoff",
     re.compile(r"(?i)\b(the\s+)?(point|takeaway|truth|reality|bottom line|catch|kicker)\s*:\s+[A-Z]"),
     "The 'The point:' setup-payoff is a tell. Fold it into the sentence."),
    ("copula dodge (serves/stands as)",
     re.compile(r"(?i)\b(serves?|stands?|acts?|functions?)\s+as\s+a\b"),
     "Use 'is' instead of 'serves as a'."),
    ("participial wind-up",
     re.compile(r"(?im)^\s*(building on|recognizing|leveraging|drawing on|having established|taking)\b[^,]{0,40},\s"),
     "Start with the subject, not a participial bridge."),
    ("bold-header bullet",
     re.compile(r"(?m)^\s*[-*]\s+\*\*[^*]+\*\*\s*[:—-]"),
     "The '**Bolded**:' bullet is the AI list default. Write a plain bullet."),
]


def scan(text, tier):
    """Lexical + structural tells (the blocking layer). Returns [(kind, snippet, hint)]."""
    words = RULES[tier]["words"]
    issues = []
    for line in _scannable_lines(text):
        if line.count(EM_DASH) > 2:
            issues.append(("em-dash spray", line, "Keep at most one interruption (a pair) per line."))
        for sent in SENTENCE_SPLIT.split(line):
            if sent.count(EM_DASH) == 1:
                after = sent.split(EM_DASH, 1)[1]
                after = re.sub(r"[*_`)\]]+$", "", after).strip().rstrip(".!?").strip()
                if 1 <= len(after.split()) <= 6:
                    issues.append(("em-dash appendage", sent.strip(),
                                   "A clause + tacked-on fragment after a dash is a tell. Use a period, comma, or colon."))
        low = line.lower()
        if "not only" in low and "but also" in low:
            issues.append(("not only … but also", line, "Reword without the correlative pair."))
        for phrase in BANNED_PHRASES:
            if phrase in low:
                issues.append((f"banned phrase: {phrase}", line, "Reword in a human voice."))
        for opener in BANNED_OPENERS:
            for sent in SENTENCE_SPLIT.split(line):
                head = re.sub(r"^[\s\-*>#]+", "", sent).lower()
                if head.startswith(opener):
                    issues.append((f"banned opener: {opener}", sent.strip(), "Start with a subject, not a connector."))
        for word in words:
            if re.search(rf"\b{re.escape(word)}\w*\b", low):
                issues.append((f"banned word: {word}", line, "Reword in a human voice."))
        for kind, rx, hint in STRUCTURAL:
            if rx.search(line):
                issues.append((kind, line, hint))
    return issues
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (all green). If the `setup-colon negative` case fails, confirm the hollow-noun list excludes generic nouns like "config".

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: scan() with lexical + structural detectors"
```

---

## Task 5: `analyze_document()` — statistics + multi-sentence (sweep-only, advisory)

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
def test_burstiness_flags_flat_prose():
    # ~12 sentences, all near-identical length -> low burstiness
    flat = " ".join(["The system reads the file and writes the result to disk now."] * 12)
    kinds = [k for k, _s, _h in pg.analyze_document(flat, "docs")]
    assert any("burstiness" in k for k in kinds)

def test_burstiness_ok_for_varied_prose():
    varied = ("Stop. " 
              "The cache warms on the first request and stays warm for the rest of a long session that touches many files. "
              "It helps. "
              "When a write misses, the loader falls back to the slow path, reads from origin, and repopulates every layer it can. "
              "Fast again.")
    kinds = [k for k, _s, _h in pg.analyze_document(varied, "docs")]
    assert not any("burstiness" in k for k in kinds)

def test_anaphora_flagged():
    text = "We ship fast. We test first. We never guess."
    kinds = [k for k, _s, _h in pg.analyze_document(text, "docs")]
    assert any("anaphora" in k for k in kinds)

def test_stats_skipped_for_comments_tier():
    flat = " ".join(["The system reads the file and writes the result now."] * 12)
    assert pg.analyze_document(flat, "comments") == []
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k "burstiness or anaphora or stats_skipped" -q`
Expected: FAIL — no `analyze_document`.

- [ ] **Step 3: Implement `analyze_document()`**

```python
import statistics

def _sentences(text):
    """Flatten scannable prose into sentences for whole-document analysis."""
    joined = " ".join(_scannable_lines(text))
    return [s.strip() for s in SENTENCE_SPLIT.split(joined) if s.strip()]


def analyze_document(text, tier):
    """Advisory whole-document signals (sweep-only). Empty for the comments tier."""
    if tier == "comments":
        return []  # comments are too short for these to mean anything
    issues = []
    sents = _sentences(text)
    counts = [len(s.split()) for s in sents]
    total_words = sum(counts)
    if len(sents) >= 5 and total_words >= 150:
        mean = statistics.fmean(counts)
        if mean > 0:
            burst = statistics.pstdev(counts) / mean
            if burst < 0.25:
                issues.append(("low burstiness (strong)", f"B={burst:.2f} over {len(sents)} sentences",
                               "Sentences are uniform in length. Vary them — mix short and long."))
            elif burst < 0.40:
                issues.append(("low burstiness", f"B={burst:.2f} over {len(sents)} sentences",
                               "Cadence is flat. Add some short sentences and some long ones."))
    # anaphora: 3+ consecutive sentences opening with the same word
    heads = [s.split()[0].lower() for s in sents if s.split()]
    for i in range(len(heads) - 2):
        if heads[i] == heads[i + 1] == heads[i + 2]:
            issues.append(("anaphora", f"3+ sentences open with '{heads[i]}'",
                           "Vary sentence openings."))
            break
    return issues
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS. If `test_burstiness_ok_for_varied_prose` is flaky, confirm the varied passage's `B ≥ 0.40` by printing it; adjust the fixture, not the threshold.

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: analyze_document() burstiness + anaphora"
```

---

## Task 6: `extract_comments()` — Pygments comment tokens only

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
def test_extract_ts_comment_vs_string():
    src = ('// it\'s worth noting this loop is slow\n'
           'const url = "https://example.com/dive-into";  // delve here\n'
           'const robust = 1;\n')
    c = pg.extract_comments("x.ts", src)
    assert "it's worth noting" in c and "delve here" in c
    assert "https://example.com" not in c and "const robust" not in c

def test_extract_python():
    c = pg.extract_comments("y.py", '# moreover this matters\nx = "moreover not this"\n')
    assert "moreover this matters" in c and "not this" not in c

def test_extract_svelte_fallback():
    c = pg.extract_comments("App.svelte", "<!-- it's worth noting the layout -->\n<div>plain</div>\n")
    assert "it's worth noting" in c

def test_extract_unknown_graceful():
    assert pg.extract_comments("weird.xyz", "delve in") == ""
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k extract -q`
Expected: FAIL — no `extract_comments`.

- [ ] **Step 3: Implement `extract_comments()`**

```python
def _lexer_for(path):
    from pygments.lexers import get_lexer_for_filename
    from pygments.util import ClassNotFound
    try:
        return get_lexer_for_filename(path)
    except ClassNotFound:
        if path.endswith(".svelte"):
            from pygments.lexers import HtmlLexer
            return HtmlLexer()  # <!-- --> plus embedded <script>/<style>
        return None


def extract_comments(path, text):
    """Return only comment-token text from a code file (never identifiers/strings)."""
    try:
        from pygments.token import Comment
        lexer = _lexer_for(path)
        if lexer is None:
            return ""
        return "".join(val for tok, val in lexer.get_tokens(text) if tok in Comment)
    except Exception:
        return ""
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: Pygments comment extraction"
```

---

## Task 7: Hook mode — JSON deny decision

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
import io, json as _json

def _run_hook(monkeypatch, payload):
    monkeypatch.setattr("sys.stdin", io.StringIO(_json.dumps(payload)))
    out = io.StringIO(); monkeypatch.setattr("sys.stdout", out)
    code = pg.main_hook()
    return code, out.getvalue()

def test_hook_denies_doc_with_tell(monkeypatch):
    code, out = _run_hook(monkeypatch, {"tool_name": "Write",
        "tool_input": {"file_path": "docs/X.md", "content": "Moreover, this matters."}})
    assert code == 0
    payload = _json.loads(out)
    assert payload["hookSpecificOutput"]["permissionDecision"] == "deny"
    assert "opener" in payload["hookSpecificOutput"]["permissionDecisionReason"]

def test_hook_allows_clean_doc(monkeypatch):
    code, out = _run_hook(monkeypatch, {"tool_name": "Write",
        "tool_input": {"file_path": "docs/X.md", "content": "This matters because the cache is warm."}})
    assert code == 0 and out.strip() == ""

def test_hook_comments_tier_ts(monkeypatch):
    code, out = _run_hook(monkeypatch, {"tool_name": "Edit",
        "tool_input": {"file_path": "a.ts", "new_string": "// let's dive into this\nconst x=1;"}})
    assert _json.loads(out)["hookSpecificOutput"]["permissionDecision"] == "deny"

def test_hook_skips_unknown_path(monkeypatch):
    code, out = _run_hook(monkeypatch, {"tool_name": "Write",
        "tool_input": {"file_path": "img.png", "content": "delve delve delve"}})
    assert code == 0 and out.strip() == ""

def test_hook_multiedit(monkeypatch):
    code, out = _run_hook(monkeypatch, {"tool_name": "MultiEdit",
        "tool_input": {"file_path": "d.md", "edits": [{"new_string": "fine line"}, {"new_string": "Furthermore, no."}]}})
    assert "furthermore" in out.lower()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k hook -q`
Expected: FAIL — no `main_hook`.

- [ ] **Step 3: Implement report, deny-decision, content extraction, `main_hook()`**

```python
def report(issues, path, tier):
    """Human-readable hit list (sweep stdout)."""
    out = [f"PROSE GUARD ({tier}) — {len(issues)} tell(s) in {path}", ""]
    for kind, snippet, hint in issues:
        snippet = (snippet[:140] + "…") if len(snippet) > 140 else snippet
        out += [f"  [{kind}]  {snippet}", f"      → {hint}"]
    return "\n".join(out) + "\n"


def _reason(issues):
    """One-line reason for the hook deny decision."""
    parts = [f"{kind} ({(snip[:40] + '…') if len(snip) > 40 else snip})" for kind, snip, _h in issues[:5]]
    extra = "" if len(issues) <= 5 else f" (+{len(issues) - 5} more)"
    return "prose-guard: " + "; ".join(parts) + extra + ". Rewrite and retry."


def _content_being_written(tool_name, tool_input):
    if tool_name == "Write":
        return tool_input.get("content", "")
    if tool_name == "Edit":
        return tool_input.get("new_string", "")
    if tool_name == "MultiEdit":
        return "\n".join(e.get("new_string", "") for e in tool_input.get("edits", []))
    return ""


def _scan_for_hook(path, text):
    """Blocking layer only: lexical + structural. Returns (tier, issues)."""
    tier = classify(path)
    if tier is None:
        return None, []
    if tier == "comments":
        text = extract_comments(path, text)
    return tier, scan(text, tier)


def main_hook():
    data = json.loads(sys.stdin.read())
    ti = data.get("tool_input", {})
    path = ti.get("file_path", "")
    _tier, issues = _scan_for_hook(path, _content_being_written(data.get("tool_name", ""), ti))
    if not issues:
        return 0
    sys.stdout.write(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": _reason(issues),
    }}))
    return 0
```

Then point `main()` at it:

```python
def main():
    args = sys.argv[1:]
    if args and args[0] == "--hook":
        return main_hook()
    return main_sweep(args)  # Task 8
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k hook -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: hook mode emits JSON deny decision"
```

---

## Task 8: Sweep mode (`main_sweep` + `--all`), runs every layer

**Files:** Modify the tool; test.

- [ ] **Step 1: Write the failing tests**

```python
def test_sweep_reports_nonzero(tmp_path, capsys):
    f = tmp_path / "doc.md"; f.write_text("Moreover, this is a tell.\n")
    assert pg.main_sweep([str(f)]) == 1
    assert "banned opener" in capsys.readouterr().out

def test_sweep_clean_zero(tmp_path):
    f = tmp_path / "doc.md"; f.write_text("This sentence is clean and direct.\n")
    assert pg.main_sweep([str(f)]) == 0

def test_sweep_runs_stats(tmp_path, capsys):
    f = tmp_path / "flat.md"
    f.write_text(" ".join(["The system reads the file and writes the result to disk now."] * 12) + "\n")
    assert pg.main_sweep([str(f)]) == 1
    assert "burstiness" in capsys.readouterr().out

def test_sweep_skips_unreadable(tmp_path):
    assert pg.main_sweep([str(tmp_path / "nope.md")]) == 0

def test_sweep_all_skips_vendor(tmp_path, monkeypatch, capsys):
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "x.md").write_text("Moreover bad.\n")
    (tmp_path / "keep.md").write_text("Furthermore bad.\n")
    monkeypatch.chdir(tmp_path)
    assert pg.main_sweep(["--all"]) == 1
    out = capsys.readouterr().out
    assert "keep.md" in out and "node_modules" not in out
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k sweep -q`
Expected: FAIL — no `main_sweep`.

- [ ] **Step 3: Implement `main_sweep()` + walk**

```python
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".svelte-kit", ".wrangler", "__pycache__", ".venv"}


def _walk(root="."):
    import os
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            yield os.path.join(dirpath, name)


def main_sweep(args):
    paths = list(_walk(".")) if args == ["--all"] else args
    any_hit = False
    for path in paths:
        tier = classify(path)
        if tier is None:
            continue
        try:
            with open(path, encoding="utf-8") as fh:
                raw = fh.read()
        except (OSError, UnicodeDecodeError) as exc:
            sys.stderr.write(f"skip {path}: {exc}\n")
            continue
        text = extract_comments(path, raw) if tier == "comments" else raw
        issues = scan(text, tier) + analyze_document(text, tier)
        if issues:
            any_hit = True
            sys.stdout.write(report(issues, path, tier))
    return 1 if any_hit else 0
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (whole suite green).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: sweep mode runs all layers"
```

---

## Task 9: Deploy (chmod + stow) and CLI smoke

**Files:** filesystem only.

- [ ] **Step 1: Executable + re-stow**

Run:
```bash
chmod +x ~/.dotfiles/bin/.local/bin/prose-guard
cd ~/.dotfiles && stow -R bin
ls -l ~/.local/bin/prose-guard
```
Expected: symlink into `~/.dotfiles/bin/.local/bin/prose-guard`.

- [ ] **Step 2: Hook smoke (deny)**

Run:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"docs/x.md","content":"Moreover, this."}}' | prose-guard --hook; echo " exit=$?"
```
Expected: a JSON object with `"permissionDecision":"deny"`, `exit=0`.

- [ ] **Step 3: Hook smoke (allow)**

Run:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"img.png","content":"delve"}}' | prose-guard --hook; echo "exit=$?"
```
Expected: no output, `exit=0`.

- [ ] **Step 4: Sweep smoke (stats)**

Run:
```bash
python3 - <<'PY' > /tmp/pg-flat.md
print(" ".join(["The system reads the file and writes the result to disk now."]*12))
PY
prose-guard /tmp/pg-flat.md; echo "exit=$?"; rm /tmp/pg-flat.md
```
Expected: a report including `low burstiness`, `exit=1`.

- [ ] **Step 5: Commit (executable bit)**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard && git commit -m "prose-guard: mark executable" --allow-empty
```

---

## Task 10: Prong 2 — the `writing-voice` output style + thin CLAUDE.md pointer

**Files:** Create `~/.dotfiles/claude/.claude/output-styles/writing-voice.md`; modify `~/.dotfiles/claude/.claude/CLAUDE.md`.

- [ ] **Step 1: Write the output style**

Create `~/.dotfiles/claude/.claude/output-styles/writing-voice.md`. Keep the literal banned-token list inside a fenced block so the style passes its own `docs`-tier guard:

```markdown
---
name: writing-voice
description: Always-on plain-voice prose guidance; avoids AI-writing tells
keep-coding-instructions: true
---

# Writing voice

Apply this to all prose you produce — docs, code comments, commit messages, error
strings, and replies. It does not change code, tool use, or file edits.

Write in a plain, varied human voice. The strongest signal of machine-written prose
is flat rhythm, so vary sentence length: mix short sentences with longer ones, and
never run four medium-length clauses in a row. Carry one idea per sentence instead
of bridging three with em dashes.

Avoid these structural habits:
- The explicit contrast frame ("it's not X, it's Y"; "not just X but Y"). Prefer an
  implicit contrast, or just state the point.
- Tricolons by reflex. Keep the one item that earns its place.
- The setup-colon payoff ("The point: ..."). Fold it into the sentence.
- Opening with a participial bridge ("Building on this, ...") or a connector
  ("Moreover, ..."). Start with the subject.
- Restating a paragraph's point at its end.

Avoid these words and phrases (judgment words like "robust" or "comprehensive" are
fine in technical prose where they're exact; the rest read as filler):

​```
openers: moreover, additionally, furthermore, in conclusion, needless to say, certainly
phrases: it's worth noting, when it comes to, dive into, delve, let's explore,
         at the end of the day, game-changer, state-of-the-art
slop:    seamless, tapestry, multifaceted, testament
​```

Code comments also follow their stack's conventions: the go-conventions skill for
Go, the surrounding file's idiom for TypeScript/Svelte, PEP 257 for Python.

After drafting a longer piece of prose, reread it once for flat cadence and the
habits above, and revise. You can check a file with `prose-guard <path>`.

## Before / after

- Before: "This isn't just a linter, it's a philosophy — clean, consistent, and clear."
  After:  "This is a linter. It enforces one writing standard across the repo."
- Before: "Moreover, the cache serves as a buffer, reducing latency significantly."
  After:  "The cache also buffers reads, so latency drops."
- Before: "The result? A faster, leaner, more maintainable system."
  After:  "The system ends up faster and easier to maintain."
```

(In the file, the inner fence uses plain triple backticks; the zero-width marks above are only to keep this plan's outer block intact.)

- [ ] **Step 2: Verify the style passes its own guard**

Run: `prose-guard ~/.dotfiles/claude/.claude/output-styles/writing-voice.md; echo "exit=$?"`
Expected: `exit=0`. The before/after "bad" examples must sit inside the fenced before/after block or on lines the guard skips; if any is flagged, move it into a fence or rephrase the surrounding prose.

- [ ] **Step 3: Add the thin pointer to global CLAUDE.md**

Append to `~/.dotfiles/claude/.claude/CLAUDE.md`:

```markdown
## Writing voice

The `writing-voice` output style is always on (set in settings.json) and carries the
full prose standard: plain voice, varied sentence length, no AI-writing tells. The
`prose-guard` PreToolUse hook (`~/.local/bin/prose-guard`) blocks writes that trip it.
Write clean the first time; the hook is a backstop. Code comments also follow their
stack's conventions (go-conventions for Go, file idiom for TS/Svelte, PEP 257 for Python).
```

- [ ] **Step 4: Verify the pointer passes the guard**

Run: `prose-guard ~/.dotfiles/claude/.claude/CLAUDE.md; echo "exit=$?"`
Expected: `exit=0`. (Fix any flagged line before continuing — this is the first real dogfood of the `docs` tier on a hand-written file.)

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add claude/.claude/output-styles/writing-voice.md claude/.claude/CLAUDE.md
git commit -m "Add writing-voice output style + CLAUDE.md pointer (prong 2)"
```

---

## Task 11: Wire the hook + activate the output style (global + workspace)

**Files:** Modify `~/.dotfiles/claude/.claude/settings.json`; create `~/Projects/cairn/.claude/settings.json`.

- [ ] **Step 1: Add the PreToolUse hook + outputStyle to global settings**

Edit `~/.dotfiles/claude/.claude/settings.json`. Inside the existing `"hooks"` object (keep `SessionStart` + `Notification`), add:

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [
      { "type": "command", "command": "prose-guard --hook", "timeout": 5 }
    ]
  }
]
```

And add a top-level key:

```json
"outputStyle": "writing-voice"
```

- [ ] **Step 2: Validate the JSON**

Run: `python3 -m json.tool ~/.claude/settings.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 3: Create the cairn-workspace settings**

Write `~/Projects/cairn/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "prose-guard --hook", "timeout": 5 }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Validate**

Run: `python3 -m json.tool ~/Projects/cairn/.claude/settings.json > /dev/null && echo OK`
Expected: `OK`. The hook and the output style take effect at the next session start (the context-clear at the end of this pass).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add claude/.claude/settings.json
git commit -m "Wire prose-guard hook + activate writing-voice output style"
```
(The cairn-workspace `.claude/settings.json` is in the non-git meta-workspace; note it in the Task 14 PLAN.md entry.)

---

## Task 12: Retire ecnordic's content-style-guard

**Files:** Modify `ecnordic-ski/.claude/settings.json`; delete `ecnordic-ski/.claude/hooks/content-style-guard.py`.

- [ ] **Step 1: Remove the hook entry**

Edit `ecnordic-ski/.claude/settings.json` and delete the `PreToolUse` entry that runs `content-style-guard.py`. If that empties `hooks`, reduce the file to `{}`. Verify:

Run: `python3 -m json.tool ~/Projects/cairn/ecnordic-ski/.claude/settings.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 2: Delete the script**

Run: `git -C ~/Projects/cairn/ecnordic-ski rm .claude/hooks/content-style-guard.py`
Expected: staged for deletion.

- [ ] **Step 3: Confirm the general tier covers its content**

Run: `cd ~/Projects/cairn && prose-guard ecnordic-ski/src/content/**/*.md > /tmp/pg-ec.txt 2>&1; echo "exit=$?"; head /tmp/pg-ec.txt`
Expected: it runs (exit 0 or 1). Do not fix hits now — that is Pass 2.

- [ ] **Step 4: Commit (ecnordic repo)**

```bash
cd ~/Projects/cairn/ecnordic-ski
git add .claude/settings.json && git commit -m "Retire content-style-guard; superseded by workstation prose-guard"
```

---

## Task 13: Clean all Claude-infrastructure prose

Use the live `prose-guard` to find tells, then fix each by hand (period/comma/colon for an appendage; reword openers/phrases/words and structural tells in a plain voice). The guard reports; you edit. Re-sweep each area until clean.

**Files:** the dotfiles `claude` package (`CLAUDE.md`, `instructions/*.md`, `docs/*.md`, `skills/*/*.md` — authored skills only, never plugin skills); each repo's `CLAUDE.md`; memory `~/.claude/projects/-home-glw907-Projects-cairn/memory/*.md`; the tool's own docstrings.

- [ ] **Step 1: Sweep the dotfiles claude package**

Run:
```bash
prose-guard ~/.dotfiles/claude/.claude/CLAUDE.md \
  ~/.dotfiles/claude/.claude/instructions/*.md \
  ~/.dotfiles/claude/.claude/docs/*.md \
  ~/.dotfiles/claude/.claude/skills/*/*.md
```

- [ ] **Step 2: Fix the dotfiles claude hits**

Edit each reported file; re-run Step 1 until it exits 0.

- [ ] **Step 3: Sweep + fix repo CLAUDE.md files and the tool's own docstrings**

Run:
```bash
prose-guard ~/Projects/cairn/CLAUDE.md ~/Projects/cairn/*/CLAUDE.md ~/.dotfiles/bin/.local/bin/prose-guard
```
Fix every hit; re-run until exit 0. `~/Projects/cairn/CLAUDE.md` is not in git (machine-local) — fix in place, no commit.

- [ ] **Step 4: Sweep + fix the memory files**

Run: `prose-guard ~/.claude/projects/-home-glw907-Projects-cairn/memory/*.md`
Fix each hit (docs tier); re-run until exit 0.

- [ ] **Step 5: Commit each git-tracked area**

```bash
cd ~/.dotfiles && git add claude/.claude bin/.local/bin/prose-guard && git commit -m "Clean AI-writing tells from Claude infrastructure prose"
for r in ecnordic-ski 907-life cairn-cms; do
  cd ~/Projects/cairn/$r && git add CLAUDE.md 2>/dev/null && git commit -m "Clean AI-writing tells from CLAUDE.md" 2>/dev/null || true
done
```
(The cairn root `CLAUDE.md` and memory files are untracked — fixed in place, no commit.)

---

## Task 14: Pass-end consolidation

**Files:** the tool (post-simplifier), `cairn-cms/docs/PLAN.md`, memory.

- [ ] **Step 1: code-simplifier over the tool**

Dispatch the `code-simplifier:code-simplifier` agent over `~/.dotfiles/bin/.local/bin/prose-guard` and `~/.dotfiles/tests/test_prose_guard.py`. Apply behavior-preserving refinements, then re-run:

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS.

- [ ] **Step 2: Commit refinements**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py && git commit -m "prose-guard: simplifier refinements" --allow-empty
```

- [ ] **Step 3: Append the Pass 1 entry to PLAN.md**

Add a progress-log entry to `cairn-cms/docs/PLAN.md`: both prongs built (the `prose-guard` tool with lexical/structural/stats layers + JSON deny hook; the `writing-voice` output style), wired global + cairn workspace, ecnordic's hook retired, thin CLAUDE.md pointer added, Claude-infra prose cleaned. Note the writing-cleanup gate is **half** cleared (infra done; repo cleanup is Pass 2) and the ≥0.5.0 release stays held until Pass 2. Note the cairn-workspace `.claude/settings.json` is in the non-git meta-workspace.

- [ ] **Step 4: Commit the PLAN note**

```bash
cd ~/Projects/cairn/cairn-cms && git add docs/PLAN.md
git commit -m "PLAN: log prose-guard Pass 1 (both prongs + Claude-infra cleanup)"
```

- [ ] **Step 5: Update memory and hand off**

Update `~/.claude/projects/-home-glw907-Projects-cairn/memory/cairn-ai-tell-guard-pass.md`: "planned" → "Pass 1 built." Record both prongs (tool at `~/.local/bin/prose-guard`, source in dotfiles; the `writing-voice` output style; hook + outputStyle in global settings), ecnordic's hook retired, Pass 2 (repo cleanup) pending. Then **clear context** before starting Pass 2 (`2026-05-26-prose-guard-cleanup.md`) — both the hook and the output style take effect at the new session start.

---

## Self-review

- **Spec coverage:** two modes (Tasks 7/8) ✓; three tiers + RULES (Task 4) ✓; lexical + structural blocking layer (Task 4) ✓; statistics + multi-sentence advisory layer (Task 5) ✓; Pygments extraction + svelte fallback (Task 6) ✓; JSON deny + timeout + fail-open (Tasks 7/11, Task 1 dispatcher) ✓; output style with keep-coding-instructions + outputStyle key (Tasks 10/11) ✓; thin CLAUDE.md pointer (Task 10) ✓; supersede ecnordic (Task 12) ✓; Claude-infra cleanup + self-guard (Task 13) ✓; tests per layer (Tasks 2–8) ✓. Release-surface + full-workspace cleanup deferred to Pass 2 by design.
- **Placeholders:** none — every code step has complete code.
- **Type/name consistency:** `classify`, `scan(text, tier)`, `analyze_document(text, tier)`, `extract_comments(path, text)`, `report`, `_reason`, `_scan_for_hook`, `main_hook`, `main_sweep`, `RULES`, `STRUCTURAL`, `EM_DASH` are used consistently across tasks.
