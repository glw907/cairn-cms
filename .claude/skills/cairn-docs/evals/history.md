# Eval history

One entry per monthly cycle, newest first. The cycle writes the entry after it acts on Geoff's
ruling. Scores are `passed/graded` per suite on `main`, with pass^k beside them.

## Entry format

```markdown
## YYYY-MM

- **Models:** the session model, the judge model, and the cycle's own model.
- **Sample:** sessions read, and how many were skipped as eval sessions.
- **Scores on `main`:** regression `p/g` (pass^k), capability `p/g` (pass^k).
- **Rows:**
  - `<failure mode or change>`: the call (now, defer, drop) and the outcome (the PR, the BACKLOG
    number, or why it was dropped).
```
