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

## 2026-10

- **Models:** sessions on Sonnet 5.5 (`claude-sonnet-5-5`, medium effort), the judge on Opus 5.5
  (`claude-opus-5-5`), and the cycle on Opus 5.5. This is the first entry, so there is no model
  change to compare.
- **Sample:** 3 real sessions since 2026-10-26 (92480ff1, 7187f1f6, 44708705), plus Geoff's docs
  decisions since that date (all approvals) and one `#docs-process` item (#90). 342 eval and
  trigger-test transcripts were skipped. Only 92480ff1 had a failure. The six sources in
  `sources.md` were read the same day the list was written, so nothing had changed.
- **Scores on `main`:** regression 36/36 (pass^3 on 12 of 12 cases), capability 5/11 (pass^3 on 1
  of 4 cases; one harness fault), run 20261027-025209. No case graduates: there is no earlier entry
  to hold pass^3 across.
- **Rows:**
  - `A behavior fix with no API change never loads cairn-docs, so a page stays stale`: now.
    `code-and-docs` failed 3/3 on main because the docs-with-code rule listed only API changes.
    #150 widens the rule to any behavior a page could describe and asks for the search, every hit
    read, and the fact-check. `code-and-docs` went from 0/3 to 2/3, and regression held at 36/36 on
    both arms (run 20261027-042904).
  - `A real session ran the docs gate without cairn-run-gate` (92480ff1): defer. The evidence is
    added to #90 instead of a new item.
  - `The rename-item-label final-search assertion fails every trial` (#87): now. Two skill wordings,
    in step A.3 and then in Checks step 1, moved it 0 of 6 while every deterministic check passed,
    so they were reverted. #151 grades the search after the repoint edits instead. The case went
    from 0 of 8 to 3 of 9, and regression held on identical overlays (run 20261027-054302). #87 is
    closed.
  - `One rename-export trial skipped the fresh fact-check`: now, folded into #150. It reproduced in
    2 of 6 trials on main, not every trial, so it got no case of its own. #150's rule names the
    `docs-fact-checker` run, and that probe dispatched it 3 of 3.
