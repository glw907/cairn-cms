# prose-guard Infrastructure (Pass 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `prose-guard` workstation tool, wire it as a global + cairn-workspace PreToolUse hook, retire ecnordic's per-repo content guard, and clean all Claude-infrastructure prose. After this pass: clear context, then run Pass 2 (repo cleanup).

**Architecture:** One Python script at `~/.dotfiles/bin/.local/bin/prose-guard`, stowed to `~/.local/bin`. Two modes (hook via stdin JSON; sweep over file paths) share a core of `classify → extract → scan → report`. Three path-classified tiers (`general`/`docs`/`comments`) each toggle which checks run via a single `RULES` table. Pygments extracts comment tokens so the `comments` tier never matches identifiers or string literals. The hook fails open (exit 0 on any error); sweep surfaces errors.

**Tech Stack:** Python 3.12, Pygments 2.19.2 (installed), pytest, GNU Stow, Claude Code `settings.json` hooks.

**Spec:** `cairn-cms/docs/superpowers/specs/2026-05-26-prose-guard-design.md`

**Repos touched:** `~/.dotfiles` (tool + tests + global settings + CLAUDE.md/skills cleanup), `ecnordic-ski` (retire hook), `cairn-cms` (PLAN.md note), plus `~/.claude/projects/.../memory` (memory + cairn workspace `.claude/settings.json`).

---

## File structure

| Path | Responsibility |
|---|---|
| `~/.dotfiles/bin/.local/bin/prose-guard` | The tool (executable, no extension — matches the other bin scripts). |
| `~/.dotfiles/tests/test_prose_guard.py` | pytest suite. Lives **outside** the `bin` stow tree so it isn't symlinked into `~/`. Loads the tool by path via `SourceFileLoader`. |
| `~/.dotfiles/claude/.claude/settings.json` | Global hooks (symlinked to `~/.claude/settings.json`). Add a PreToolUse entry. |
| `~/Projects/cairn/.claude/settings.json` | New — cairn-workspace PreToolUse entry. |
| `ecnordic-ski/.claude/settings.json` + `.claude/hooks/content-style-guard.py` | Remove the hook entry; delete the script. |

---

## Task 1: Scaffold the tool and test harness

**Files:**
- Create: `~/.dotfiles/bin/.local/bin/prose-guard`
- Create: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing test (module loads + exposes a version marker)**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: FAIL — `FileNotFoundError` (tool doesn't exist) or `AttributeError`.

- [ ] **Step 3: Create the tool skeleton**

```python
#!/usr/bin/env python3
"""prose-guard — flag AI-flavored-writing tells in docs, code comments, and content.

Two modes:
  prose-guard --hook    PreToolUse guard. Reads the tool-call JSON on stdin,
                        classifies the target file, scans the content being
                        written, exits 2 with a report on a hit (blocks the
                        write), 0 otherwise. Exits 0 on any internal error too —
                        a hook bug must never block real work.
  prose-guard PATHS...  Sweep mode. Scans whole files, prints a grouped report,
  prose-guard --all     exits 1 if anything is flagged. Drives the cleanup pass.

Three tiers, chosen by path:
  general   src/content/**/*.md   marketing voice; the full word-list
  docs      other *.md            technical prose; trimmed slop list, no judgment words
  comments  code files            Pygments comment text only; no word-list

Rules seeded from ecnordic-ski/docs/content-guide.md (the marketing-voice authority).
"""
import json
import re
import sys

EM_DASH = "—"  # em dash. The en dash (–, ranges) is never flagged.
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def classify(path):
    """Return the tier for a path, or None to skip it."""
    return None  # filled in Task 2


def main():
    args = sys.argv[1:]
    if args and args[0] == "--hook":
        return 0  # filled in Task 6
    return 0  # filled in Task 7


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--hook":
        try:
            sys.exit(main())
        except Exception:
            sys.exit(0)  # fail open: a hook bug must never block work
    else:
        sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "Add prose-guard skeleton + test harness"
```

---

## Task 2: `classify()` — path to tier

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

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
Expected: FAIL — all return `None`.

- [ ] **Step 3: Implement `classify()`**

Replace the stub with:

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

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing tests**

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
    assert "real prose line" in lines
    assert "second prose line" in lines
    assert all("robust" not in ln for ln in lines)   # frontmatter + fence dropped
    assert all("PLACEHOLDER" not in ln for ln in lines)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py::test_scannable_skips_frontmatter_fence_placeholder -q`
Expected: FAIL — `AttributeError: module has no attribute '_scannable_lines'`.

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
git commit -m "prose-guard: text-prep helpers (frontmatter/fence/placeholder)"
```

---

## Task 4: `scan()` — detectors + per-tier `RULES`

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing tests**

```python
def _kinds(issues):
    return [k for k, _snip, _hint in issues]


def test_em_dash_appendage_flagged():
    issues = pg.scan("We tap the button — it then saves.", "comments")
    assert any("appendage" in k for k in _kinds(issues))


def test_em_dash_pair_allowed():
    issues = pg.scan("The camp — four days long — is the highlight of the week.", "docs")
    assert not any("appendage" in k or "spray" in k for k in _kinds(issues))


def test_em_dash_spray_flagged():
    issues = pg.scan("a — b — c — d here", "comments")
    assert any("spray" in k for k in _kinds(issues))


def test_en_dash_not_flagged():
    issues = pg.scan("Open 9–17 on weekdays only.", "docs")
    assert issues == []


def test_banned_phrase_all_tiers():
    for tier in ("general", "docs", "comments"):
        assert any("dive into" in k for k in _kinds(pg.scan("Let us dive into the code.", tier)))


def test_banned_opener_flagged():
    assert any("moreover" in k for k in _kinds(pg.scan("Moreover, the cache helps.", "docs")))


def test_word_tiering_robust():
    # 'robust' is a judgment word: caught only in general, allowed in docs + comments.
    assert any("robust" in k for k in _kinds(pg.scan("a robust system", "general")))
    assert not any("robust" in k for k in _kinds(pg.scan("a robust system", "docs")))
    assert not any("robust" in k for k in _kinds(pg.scan("a robust system", "comments")))


def test_word_tiering_slop():
    # 'tapestry' is slop: caught in general + docs, allowed in comments.
    assert any("tapestry" in k for k in _kinds(pg.scan("a rich tapestry of features", "general")))
    assert any("tapestry" in k for k in _kinds(pg.scan("a rich tapestry of features", "docs")))
    assert not any("tapestry" in k for k in _kinds(pg.scan("a rich tapestry of features", "comments")))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k "scan or dash or word_tiering or banned" -q`
Expected: FAIL — `scan` not defined.

- [ ] **Step 3: Implement the lists, `RULES`, and `scan()`**

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

# Per-tier toggles. Structural detectors and `not only … but also` run in every tier.
RULES = {
    "general":  {"words": SLOP_WORDS + JUDGMENT_WORDS},
    "docs":     {"words": SLOP_WORDS},
    "comments": {"words": []},
}


def scan(text, tier):
    """Return a list of (kind, snippet, hint) tells found in `text` at `tier`."""
    words = RULES[tier]["words"]
    issues = []
    for line in _scannable_lines(text):
        if line.count(EM_DASH) > 2:
            issues.append((
                "em-dash spray", line,
                "Three or more em dashes. Keep at most one interruption (a pair).",
            ))
        for sent in SENTENCE_SPLIT.split(line):
            if sent.count(EM_DASH) == 1:
                after = sent.split(EM_DASH, 1)[1]
                after = re.sub(r"[*_`)\]]+$", "", after).strip().rstrip(".!?").strip()
                if 1 <= len(after.split()) <= 6:
                    issues.append((
                        "em-dash appendage", sent.strip(),
                        "A clause + tacked-on fragment after a dash is an AI tell. "
                        "Use a period, comma, or colon, or fold it in.",
                    ))
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
    return issues
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: scan() with structural detectors and per-tier rules"
```

---

## Task 5: `extract_comments()` — Pygments comment tokens only

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_extract_ts_comment_vs_string():
    src = (
        '// it\'s worth noting this loop is slow\n'
        'const url = "https://example.com/dive-into";  // delve here\n'
        'const robust = 1;\n'
    )
    comments = pg.extract_comments("x.ts", src)
    assert "it's worth noting" in comments
    assert "delve here" in comments
    assert "https://example.com" not in comments   # string literal not extracted
    assert "const robust" not in comments           # code not extracted


def test_extract_python_comment():
    src = '# moreover this matters\nx = "moreover not this"\n'
    comments = pg.extract_comments("y.py", src)
    assert "moreover this matters" in comments
    assert "not this" not in comments


def test_extract_svelte_fallback():
    src = "<!-- it's worth noting the layout -->\n<div>plain</div>\n"
    comments = pg.extract_comments("App.svelte", src)
    assert "it's worth noting" in comments


def test_extract_handles_unknown_gracefully():
    assert pg.extract_comments("weird.xyz", "delve in") == ""


def test_comments_tier_via_extract():
    src = '// we should dive into this\nconst x = "dive into";\n'
    comments = pg.extract_comments("x.ts", src)
    assert any("dive into" in k for k, _s, _h in pg.scan(comments, "comments"))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k extract -q`
Expected: FAIL — `extract_comments` not defined.

- [ ] **Step 3: Implement `extract_comments()`**

```python
def _lexer_for(path):
    """Pick a Pygments lexer by filename, with a Svelte->HTML fallback. None if unknown."""
    from pygments.lexers import get_lexer_for_filename
    from pygments.util import ClassNotFound
    try:
        return get_lexer_for_filename(path)
    except ClassNotFound:
        if path.endswith(".svelte"):
            from pygments.lexers import HtmlLexer
            return HtmlLexer()  # handles <!-- --> plus embedded <script>/<style>
        return None


def extract_comments(path, text):
    """Return only the comment-token text from a code file (never identifiers/strings)."""
    try:
        from pygments.token import Comment
        lexer = _lexer_for(path)
        if lexer is None:
            return ""
        return "".join(val for tok, val in lexer.get_tokens(text) if tok in Comment)
    except Exception:
        return ""  # Pygments missing or lex error: scan nothing, never raise
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k extract -q && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: Pygments comment extraction"
```

---

## Task 6: `report()`, `_content_being_written()`, `main_hook()`

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing tests**

```python
import io, json as _json

def _run_hook(monkeypatch, payload):
    monkeypatch.setattr("sys.stdin", io.StringIO(_json.dumps(payload)))
    err = io.StringIO()
    monkeypatch.setattr("sys.stderr", err)
    code = pg.main_hook()
    return code, err.getvalue()


def test_hook_blocks_doc_with_tell(monkeypatch):
    code, err = _run_hook(monkeypatch, {
        "tool_name": "Write",
        "tool_input": {"file_path": "docs/X.md", "content": "Moreover, this matters."},
    })
    assert code == 2
    assert "banned opener" in err


def test_hook_passes_clean_doc(monkeypatch):
    code, _err = _run_hook(monkeypatch, {
        "tool_name": "Write",
        "tool_input": {"file_path": "docs/X.md", "content": "This matters because the cache is warm."},
    })
    assert code == 0


def test_hook_comments_tier_on_ts_edit(monkeypatch):
    code, err = _run_hook(monkeypatch, {
        "tool_name": "Edit",
        "tool_input": {"file_path": "a.ts", "new_string": "// let's dive into this\nconst x = 1;"},
    })
    assert code == 2
    assert "dive into" in err


def test_hook_skips_unknown_path(monkeypatch):
    code, _err = _run_hook(monkeypatch, {
        "tool_name": "Write",
        "tool_input": {"file_path": "img.png", "content": "delve delve delve"},
    })
    assert code == 0


def test_hook_multiedit(monkeypatch):
    code, err = _run_hook(monkeypatch, {
        "tool_name": "MultiEdit",
        "tool_input": {"file_path": "d.md", "edits": [
            {"new_string": "fine line"}, {"new_string": "Furthermore, no."}]},
    })
    assert code == 2 and "furthermore" in err.lower()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k hook -q`
Expected: FAIL — `main_hook` not defined.

- [ ] **Step 3: Implement report + content extraction + `main_hook()`**

```python
def report(issues, path, tier):
    """Render the hit list shared by hook (stderr) and sweep (stdout)."""
    out = [
        f"PROSE GUARD ({tier}) — {len(issues)} AI-writing tell(s) in {path}",
        "Fix before saving (see the prose-guard design spec / content-guide.md).",
        "",
    ]
    for kind, snippet, hint in issues:
        snippet = (snippet[:140] + "…") if len(snippet) > 140 else snippet
        out.append(f"  [{kind}]  {snippet}")
        out.append(f"      → {hint}")
    return "\n".join(out) + "\n"


def _content_being_written(tool_name, tool_input):
    if tool_name == "Write":
        return tool_input.get("content", "")
    if tool_name == "Edit":
        return tool_input.get("new_string", "")
    if tool_name == "MultiEdit":
        return "\n".join(e.get("new_string", "") for e in tool_input.get("edits", []))
    return ""


def _scan_path(path, text):
    """Classify, extract comments if code, scan. Returns (tier, issues) or (None, [])."""
    tier = classify(path)
    if tier is None:
        return None, []
    if tier == "comments":
        text = extract_comments(path, text)
    return tier, scan(text, tier)


def main_hook():
    data = json.loads(sys.stdin.read())
    path = data.get("tool_input", {}).get("file_path", "")
    text = _content_being_written(data.get("tool_name", ""), data.get("tool_input", {}))
    tier, issues = _scan_path(path, text)
    if not issues:
        return 0
    sys.stderr.write(report(issues, path, tier))
    return 2
```

Then update `main()` so `--hook` dispatches to it:

```python
def main():
    args = sys.argv[1:]
    if args and args[0] == "--hook":
        return main_hook()
    return main_sweep(args)  # defined in Task 7
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k hook -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py
git commit -m "prose-guard: hook mode (stdin protocol, report)"
```

---

## Task 7: `main_sweep()` + `--all` walk

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard`
- Test: `~/.dotfiles/tests/test_prose_guard.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_sweep_reports_and_exits_nonzero(tmp_path, monkeypatch, capsys):
    f = tmp_path / "doc.md"
    f.write_text("Moreover, this is a tell.\n")
    code = pg.main_sweep([str(f)])
    out = capsys.readouterr().out
    assert code == 1
    assert "banned opener" in out


def test_sweep_clean_exits_zero(tmp_path, capsys):
    f = tmp_path / "doc.md"
    f.write_text("This sentence is clean and direct.\n")
    assert pg.main_sweep([str(f)]) == 0


def test_sweep_skips_unreadable(tmp_path, capsys):
    missing = tmp_path / "nope.md"
    assert pg.main_sweep([str(missing)]) == 0  # skipped, not fatal


def test_sweep_all_walks_tree(tmp_path, monkeypatch, capsys):
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "x.md").write_text("Moreover bad.\n")  # must be skipped
    (tmp_path / "keep.md").write_text("Furthermore bad.\n")            # must be found
    monkeypatch.chdir(tmp_path)
    code = pg.main_sweep(["--all"])
    out = capsys.readouterr().out
    assert code == 1
    assert "keep.md" in out and "node_modules" not in out
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -k sweep -q`
Expected: FAIL — `main_sweep` not defined.

- [ ] **Step 3: Implement `main_sweep()` and the walk**

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
                text = fh.read()
        except (OSError, UnicodeDecodeError) as exc:
            sys.stderr.write(f"skip {path}: {exc}\n")
            continue
        if tier == "comments":
            text = extract_comments(path, text)
        issues = scan(text, tier)
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
git commit -m "prose-guard: sweep mode and --all walk"
```

---

## Task 8: Deploy (chmod + stow) and CLI smoke

**Files:**
- Modify: filesystem only (stow symlink).

- [ ] **Step 1: Make executable and re-stow**

Run:
```bash
chmod +x ~/.dotfiles/bin/.local/bin/prose-guard
cd ~/.dotfiles && stow -R bin
ls -l ~/.local/bin/prose-guard
```
Expected: `~/.local/bin/prose-guard` is a symlink into `~/.dotfiles/bin/.local/bin/prose-guard`.

- [ ] **Step 2: Smoke the hook mode (block path)**

Run:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"docs/x.md","content":"Moreover, this."}}' | prose-guard --hook; echo "exit=$?"
```
Expected: a `PROSE GUARD (docs)` report on stderr, `exit=2`.

- [ ] **Step 3: Smoke the hook mode (pass path)**

Run:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"img.png","content":"delve"}}' | prose-guard --hook; echo "exit=$?"
```
Expected: no output, `exit=0`.

- [ ] **Step 4: Smoke sweep mode**

Run:
```bash
printf 'Moreover, a tell.\n' > /tmp/pg-smoke.md && prose-guard /tmp/pg-smoke.md; echo "exit=$?"; rm /tmp/pg-smoke.md
```
Expected: a report, `exit=1`.

- [ ] **Step 5: Commit (executable bit)**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard && git commit -m "prose-guard: mark executable" --allow-empty
```

---

## Task 9: Wire the hook (global + cairn workspace)

**Files:**
- Modify: `~/.dotfiles/claude/.claude/settings.json` (symlinked to `~/.claude/settings.json`)
- Create: `~/Projects/cairn/.claude/settings.json`

- [ ] **Step 1: Add the PreToolUse block to global settings**

Edit `~/.dotfiles/claude/.claude/settings.json`. Inside the existing `"hooks"` object (which already has `SessionStart` and `Notification`), add a sibling key — keep the others intact:

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit",
    "hooks": [
      { "type": "command", "command": "prose-guard --hook" }
    ]
  }
]
```

- [ ] **Step 2: Verify global JSON is valid**

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
          { "type": "command", "command": "prose-guard --hook" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Verify and confirm the hook is recognized**

Run: `python3 -m json.tool ~/Projects/cairn/.claude/settings.json > /dev/null && echo OK`
Expected: `OK`. (The hook takes effect on the next session start; that is the context-clear boundary at the end of this pass.)

- [ ] **Step 5: Commit**

```bash
cd ~/.dotfiles && git add claude/.claude/settings.json && git commit -m "Wire prose-guard as a global PreToolUse hook"
```
The cairn-workspace `.claude/settings.json` is in the non-git meta-workspace; no commit there (note it in the Task 12 PLAN.md entry).

---

## Task 10: Retire ecnordic's content-style-guard

**Files:**
- Modify: `ecnordic-ski/.claude/settings.json`
- Delete: `ecnordic-ski/.claude/hooks/content-style-guard.py`

- [ ] **Step 1: Remove the hook entry**

Edit `ecnordic-ski/.claude/settings.json` and delete the `PreToolUse` entry that runs `content-style-guard.py`. If that leaves `"hooks": {}` or an empty file, reduce it to `{}` (valid empty settings). Verify:

Run: `python3 -m json.tool ecnordic-ski/.claude/settings.json > /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 2: Delete the script**

Run: `git -C ~/Projects/cairn/ecnordic-ski rm .claude/hooks/content-style-guard.py`
Expected: the file is staged for deletion.

- [ ] **Step 3: Confirm the general tier still covers its content**

Run: `cd ~/Projects/cairn && prose-guard ecnordic-ski/src/content/**/*.md > /tmp/pg-ec.txt 2>&1; echo "exit=$?"; head /tmp/pg-ec.txt`
Expected: it runs (exit 0 or 1 depending on existing tells) — proves the `general` tier scans ecnordic content. (Do not fix hits now; that is Pass 2.)

- [ ] **Step 4: Commit (in the ecnordic repo)**

```bash
cd ~/Projects/cairn/ecnordic-ski
git add .claude/settings.json && git commit -m "Retire content-style-guard; superseded by workstation prose-guard"
```

---

## Task 11: Clean all Claude-infrastructure prose

This is the "claude" half of Pass 1. Use the live `prose-guard` to find tells, then fix each with judgment (period/comma/colon for an appendage; reword a banned word/phrase/opener in a plain human voice). The guard reports; you edit. Re-sweep each area until clean.

**Files (the enumerated Claude-infra set):**
- `~/.dotfiles/claude/.claude/CLAUDE.md`, `~/.dotfiles/claude/.claude/instructions/*.md`, `~/.dotfiles/claude/.claude/docs/*.md`
- `~/.dotfiles/claude/.claude/skills/*/SKILL.md` and any other `.md` under those skills (authored skills only — never plugin skills)
- `~/.dotfiles/claude/.claude/skills/site-pass/plan-template.md`
- Each repo's `CLAUDE.md`: `~/Projects/cairn/CLAUDE.md`, `ecnordic-ski/CLAUDE.md`, `907-life/CLAUDE.md`, `cairn-cms/CLAUDE.md`
- Memory: `~/.claude/projects/-home-glw907-Projects-cairn/memory/*.md`
- `prose-guard`'s own docstrings (the `comments` tier guards the tool itself)

- [ ] **Step 1: Sweep the dotfiles claude package**

Run:
```bash
prose-guard ~/.dotfiles/claude/.claude/CLAUDE.md \
  ~/.dotfiles/claude/.claude/instructions/*.md \
  ~/.dotfiles/claude/.claude/docs/*.md \
  ~/.dotfiles/claude/.claude/skills/*/*.md
```
Expected: a grouped report of tells (or nothing). Review each hit.

- [ ] **Step 2: Fix the dotfiles claude hits**

For each reported line, edit the file: replace em-dash appendages with a period/comma/colon, reword banned openers to start with a subject, and reword banned phrases/words in a plain voice. Re-run Step 1's command until it exits 0.

- [ ] **Step 3: Sweep + fix the repo CLAUDE.md files and the tool's own docstrings**

Run:
```bash
prose-guard ~/Projects/cairn/CLAUDE.md ~/Projects/cairn/*/CLAUDE.md ~/.dotfiles/bin/.local/bin/prose-guard
```
Fix every hit (note: editing `prose-guard` itself triggers the live hook on the `comments` tier — keep the docstring clean). Re-run until exit 0. Note: `~/Projects/cairn/CLAUDE.md` is intentionally not in git (machine-local credentials); fix it in place, no commit.

- [ ] **Step 4: Sweep + fix the memory files**

Run:
```bash
prose-guard ~/.claude/projects/-home-glw907-Projects-cairn/memory/*.md
```
Fix each hit. These are `docs` tier. Re-run until exit 0.

- [ ] **Step 5: Commit each git-tracked area in its own repo**

```bash
cd ~/.dotfiles && git add claude/.claude bin/.local/bin/prose-guard && git commit -m "Clean AI-writing tells from Claude infrastructure prose"
cd ~/Projects/cairn/ecnordic-ski && git add CLAUDE.md 2>/dev/null && git commit -m "Clean AI-writing tells from CLAUDE.md" 2>/dev/null || true
cd ~/Projects/cairn/907-life   && git add CLAUDE.md 2>/dev/null && git commit -m "Clean AI-writing tells from CLAUDE.md" 2>/dev/null || true
cd ~/Projects/cairn/cairn-cms  && git add CLAUDE.md 2>/dev/null && git commit -m "Clean AI-writing tells from CLAUDE.md" 2>/dev/null || true
```
(The cairn root `CLAUDE.md` and the memory files are not git-tracked — fixed in place, no commit.)

---

## Task 12: Add reinforcing language to CLAUDE.md

The hook is a backstop; the standard belongs in instructions too. Add a "Writing Voice" section to the **global** `~/.dotfiles/claude/.claude/CLAUDE.md` (it applies workstation-wide, like the now-global hook). Keep the literal banned-token lists inside a fenced code block so the guard skips them (it skips ``` fences) — otherwise the section trips its own `docs`-tier scan.

**Files:**
- Modify: `~/.dotfiles/claude/.claude/CLAUDE.md`

- [ ] **Step 1: Add the section**

Append to `~/.dotfiles/claude/.claude/CLAUDE.md`:

```markdown
## Writing Voice (docs, code comments, content)

Write all prose in a plain human voice, free of AI-flavored-writing tells. The
`prose-guard` PreToolUse hook (`~/.local/bin/prose-guard`) blocks writes that trip
it, but the hook is a backstop — write clean the first time. It tunes rules by
register: lightest on code comments, then technical docs, strictest on marketing
content (`src/content/**`).

Avoid:
- **Em-dash appendage** — a clause followed by a short tacked-on fragment after a
  dash. Use a period, comma, or colon, or fold it in. Keep at most one em-dash
  interruption (a pair) per line.
- **Throat-clearing openers** and **filler phrases** and **slop words** (the
  guard's current lists):

​```
openers:  moreover, additionally, furthermore, in conclusion, needless to say, certainly
phrases:  it's worth noting, when it comes to, dive into, delve, let's explore,
          at the end of the day, game-changer, state-of-the-art
slop:     seamless, tapestry, multifaceted, testament
​```

Vary sentence and paragraph length; don't restate a paragraph's point at its end.
For technical prose, judgment words like "robust" or "comprehensive" are allowed
where they're the right word — the guard only bans those in marketing content.

Code comments must also follow the conventions of their stack: the go-conventions
skill (and `go-comment-voice.md`) for Go, the surrounding file's idiom for
TypeScript/Svelte, PEP 257 for Python. The guard removes AI tells; the stack
conventions govern comment form. When the two could conflict, satisfy both: a
convention-correct comment carries no tells.
```

(Note: the fenced block above uses zero-width-joiner-marked backticks in this plan only to keep this plan's own example intact. In `CLAUDE.md`, use plain triple backticks for the inner fence.)

- [ ] **Step 2: Verify it passes its own guard**

Run: `prose-guard ~/.dotfiles/claude/.claude/CLAUDE.md; echo "exit=$?"`
Expected: `exit=0` — the prose is clean and the literal token lists are inside a fence the guard skips. If anything is flagged, the fence is wrong or a sentence has a real tell; fix and re-run.

- [ ] **Step 3: Commit**

```bash
cd ~/.dotfiles && git add claude/.claude/CLAUDE.md && git commit -m "Reinforce the writing-voice standard in global CLAUDE.md"
```

---

## Task 13: Pass-end consolidation

**Files:**
- Modify: `~/.dotfiles/bin/.local/bin/prose-guard` (post-simplifier), `cairn-cms/docs/PLAN.md`, memory.

- [ ] **Step 1: Run code-simplifier over the tool**

Dispatch the `code-simplifier:code-simplifier` agent over `~/.dotfiles/bin/.local/bin/prose-guard` and `~/.dotfiles/tests/test_prose_guard.py`. Apply refinements that preserve behavior, then re-run the suite:

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS (still green).

- [ ] **Step 2: Commit any simplifier refinements**

```bash
cd ~/.dotfiles && git add bin/.local/bin/prose-guard tests/test_prose_guard.py && git commit -m "prose-guard: simplifier refinements" --allow-empty
```

- [ ] **Step 3: Append the Pass 1 entry to PLAN.md**

Add a progress-log entry to `cairn-cms/docs/PLAN.md` under "Notes / progress log": the tool is built + wired (global + cairn workspace), ecnordic's hook is retired, Claude-infra prose is cleaned. Record that the writing-cleanup gate is **half** cleared (infra done; repo cleanup is Pass 2) and the ≥0.5.0 release stays held until Pass 2. Note the cairn-workspace `.claude/settings.json` lives in the non-git meta-workspace.

- [ ] **Step 4: Commit the PLAN note**

```bash
cd ~/Projects/cairn/cairn-cms && git add docs/PLAN.md && git commit -m "PLAN: log prose-guard Pass 1 (infra + Claude-infra cleanup)"
```

- [ ] **Step 5: Update memory and hand off**

Update `~/.claude/projects/-home-glw907-Projects-cairn/memory/cairn-ai-tell-guard-pass.md`: change "planned" to "Pass 1 built" — `prose-guard` lives at `~/.local/bin/prose-guard` (source in `~/.dotfiles/bin/.local/bin/`), wired global + cairn-workspace, three tiers, ecnordic's hook retired. Note Pass 2 (repo cleanup) is pending. Then **clear context** before starting Pass 2 (`2026-05-26-prose-guard-cleanup.md`).

---

## Self-review

- **Spec coverage:** two modes (Tasks 6/7) ✓; three tiers + RULES (Task 4) ✓; structural detectors + en-dash exemption (Task 4) ✓; Pygments comment extraction + svelte fallback (Task 5) ✓; classify (Task 2) ✓; fail-open hook (Task 1 dispatcher) ✓; global + workspace wiring (Task 9) ✓; supersede ecnordic (Task 10) ✓; Claude-infra cleanup phase (Task 11) ✓; self-guard (Task 11 Step 3) ✓; reinforcing language in CLAUDE.md (Task 12) ✓; tests per tier + protocol (Tasks 2–7) ✓. Release-surface + full-workspace cleanup are deferred to Pass 2 by design.
- **Placeholders:** none — every code step has complete code.
- **Type/name consistency:** `classify`, `scan(text, tier)`, `extract_comments(path, text)`, `report(issues, path, tier)`, `_scan_path`, `main_hook`, `main_sweep`, `RULES`, `EM_DASH` are used consistently across tasks.
