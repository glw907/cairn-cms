# Style-guide sync re-scope: fold record

Date: 2026-09-28. Targets at `e0d5f954`: `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
and `docs/superpowers/plans/2026-09-28-style-guide-sync.md`. Four lenses, all read in full:
contract (`C`), mechanics (`X`), consistency (`K`), leanness (`L`), each under
`docs/superpowers/research/2026-09-28-style-guide-sync-rescope-review-*.md`. Governing rulings:
15 (proven, nothing invented) and 16 (the register preserved in full).

The fold verified these facts before acting on them:

- `vale test --help` prints "Run the test cases kept beside a configuration's rules" on 3.23.0.
- `docs-gate.mjs:61` and `check:vale` filter at `--minAlertLevel=error`, while `.vale.ini` sets
  `MinAlertLevel = suggestion`.
- `docs-links.mjs:49` walks all of `docs/` except `superpowers`.
- The register holds four Google deviation rows, each with an Evidence column (register 814-825).
- Dotfiles at `4461c1f`: `cairn-docs-drafter.md:10-18,28` carries the trimmed-excerpt, role-tag,
  and "dispatch extracted" lines. `cairn-register-editor.md:35` names the dispatch-handed
  Provenance, tightening-test, and exceptions sections. `retired-phrases.txt:6` names the R8 twin.
- The infra audit routes DC-28 and AW-24 to W4 (`2026-09-28-claude-infra-audit.md:123,244-245`).
- The GitLab and Grafana style-guide URLs resolve, and Grafana's page defers to Google's guide.

## Conductor decisions (settled before the fold)

| # | Decision | Findings | Where folded |
|---|---|---|---|
| 1 | `vale test` replaces `vale-rule-examples.mjs`. Test files sit beside the rules and run under a fixture config in the docs gate's tree mode. The false Sources claim is corrected. | C-m3 (moot), X-M1, K-1, L-M1 | Spec Sources, R2, criterion 3, walked-back list; plan R2 |
| 2 | `Cairn.Headings` checks a leading -ing word and `?` only (about 49). The register editor judges wh-teasers. Counts are 49 and 31, and R2 records its own. | X-M3, X-m2, L-m3 (counts half) | Spec R2; plan R2 outcome and acceptance |
| 3 | markdownlint is deferred, with one ROADMAP line at the close. | L-M2, C-c2 (moot), C-m4 (moot), X-m4 (moot) | Spec Sources bullet cut, R3, criterion 4 removed, walked-back list; plan P3 and R3 removed, close step 3 |
| 4 | The 1,000-word cap is dropped. Each brief carries a one-line-per-rule structure checklist. | C-m1, K-3; contrary to L's "cap reachable" note | Spec R1t bullet 1, criterion 1, walked-back list; plan R1t |
| 5 | The W7 infra read (J5) stays as a read. | L-M6 refused | Unchanged |
| 6 | The ceiling stays 6M. The leanness lens estimates about 3.6M to 4.2M after its cuts. With M4, M5, and M6 partly declined here, expect the upper part of that range. | L-m5 refused | Unchanged |
| 7 | An independent grader enumerates the ratified rules at `feca3348` itself and checks "reworded" for meaning, as R1t's review right after R1t. The register editor's read of the register is dropped. | C-M1, L-M5 | Spec R1t acceptance, criterion 2, join, walked-back list; plan R1t acceptance, review focus 1, J4 removed |
| 8 | W3r needs a row only for an override, never a tightening. | C-M2, K-4 | Spec W3r; plan W3r acceptance |
| 9 | The Microsoft Learn capture comes from a CC BY 4.0 MicrosoftDocs repository, citing its `LICENSE`. The Google claim stands with its footer. `docs/internal/exemplars/` is excluded from `check:docs`. | K-5, X-m3, X-m1 | Spec Sources license note, R9; plan R9 (Files gain `docs-links.mjs` skip set) |
| 10 | J2 passes on the docs gate plus Geoff's read. The register editor's findings are reported, not a zero bar. | L-M4, C-m5 (superseded) | Spec criterion 7; plan J2 |

## Dispositions on the merits

| Findings | Disposition | Where, or why |
|---|---|---|
| C-M3 | Folded | The spec's R2 names plain `vale <path>` as the warning-visible command, and criteria 3 and 6, R5, J1, and W1r's editor use it. |
| C-M4, X-m5, X-M2, K-6 | Folded (root fix) | W1r names every section by exact heading, drops the "universal contract" line, keeps the unknown-track throw, and tests six tracks plus one unknown. W2r and W3r drop the extraction-era sentences. Review focus 3 greps the stale names. R1t removes the register's own references to removed sections and the R1b promise. |
| C-M5 | Folded | Criterion 1 names all four rows. The row shape keeps the Evidence column, which the tightening test requires. |
| X-m6 | Folded | R1t merges the Provenance voice table into Deviations and moves the specimen notes into the developer brief. |
| C-m2 | Folded | Criterion 2 checks the posture paragraph against `8bbe78f5`, and R1t's report shows the grep. |
| K-2, L-M3 | Folded | Only remaining quotations stay byte-identical (the Names text and the voice specimens), and verbatim guide quotations go. Every `Killed:` specimen stays. |
| X-M4 | Folded, option (b) | J2 names `worktree`, `gate`, `gateLane`, `track`, `job`, `inputs`, and `exemplarSources`. W1r has the drafter read exemplar sources whole, which removes the trim step and needs no new machinery. Option (a) would breach ruling 17 in the one measurement run. |
| X-m7 | Folded | J2 runs `npm ci` in the new worktree. |
| K-7 | Folded | The plan had silently moved Geoff's R5 read after J2. It now conforms to ruling 14: the sitting opens when J1 lands, and J2 runs meanwhile. |
| C-m6, K-8 | Folded | J2 branches after J1 and imitates the page as J1 leaves it. A rejected J1 voids J2, which reruns. |
| L-m4 | Folded | A rejected J2 reopens R1t once. A second rejection stops the pass and writes STATUS. |
| K-10 | Folded | J2 cherry-picks `docs/internal/facts/` changes to `style-guide-sync`. |
| K-9 | Folded | Ruling 18 states the one-exemplar gap, which closes at the editors stage. |
| K-11 | Folded | The GitLab and Grafana URLs were added and verified. |
| L-m3 (Elastic tiers, license label) | Folded | The Elastic tiers bullet is cut, since no kept mechanism uses tiers and the fetched page does not say it. The CC BY bullet is relabeled a license note. |
| C-m7 | Folded | R6's grep covers all five phrases. |
| C-m8 | Folded | W6 deletes the R8-twin header sentence. W4's evals deltas each get the conductor's ruling. |
| L-m2 | Folded | W6 rides W5's task, which saves one chain turn. |
| C-c1, L-M1 knock-on | Folded | R2 still edits `docs-gate.mjs`, so it keeps `engine-logic`, but its gate narrows to `check:docs-gate` plus the docs-gate unit test on the light lane. The close's full gate covers the rest. |
| L-m1 | Refused | The infra audit routes DC-28 and AW-24 to this pass's W4 (audit lines 123, 244-245). Moving them only relocates the cost. |

**Counts:** 48 finding IDs in all. The 10 conductor decisions cover 23 of them: 21 folded or
superseded, and 2 refused (L-M6, L-m5). On the merits, 24 are folded and 1 is refused (L-m1).
The total is 45 folded and 3 refused. **Owner forks:** none new. X-M3's and L-M2's forks were settled
by conductor decisions 2 and 3, and L-m5's by decision 6.

## Size

The spec grew from 2,702 to 3,071 words and the plan from 2,212 to 2,407. Almost all of the growth
is the exact section headings and args that W1r, W2r, W3r, and J2 lacked, which the mechanics lens
showed an implementer could not infer.

## Errata owed (ratified documents not edited)

1. **Leanness record, verdict table** (`2026-09-28-style-guide-sync-leanness.md`, the
   per-mechanism ruling under ruling 15):
   - The table's "77 measured hits" and "52 measured hits" are the audit's uncalibrated heuristic
     counts. The prototype measured about 49 (the -ing and `?` scope) and about 31.
   - The markdownlint row ("Stock config") is deferred out of this pass by conductor decision 3.
   - The Headings row's merged rule no longer carries the wh-teaser token (decision 2).
2. **Leanness record, ruling-16 constraint paragraph:** it says the shrinking prose is what "Vale's
   stock packages already enforce". The fold also removes verbatim quotations of base-guide rules
   Vale does not enforce. Each such rule survives as a linked checklist line, so no rule is lost,
   but the stated boundary changed. The same record's "Vale 3.x ships `vale test`" was right, and
   the spec's contrary sentence is removed.

## Measures (fold-rule trial, review 1 of 3)

Added by the conductor; the fold was dispatched before the measures rule landed (dotfiles `c9fdfd5`).

- **New-mechanism findings:** 0 folded, 0 refused; no lens proposed new machinery. The fold removed
  three: `vale-rule-examples.mjs` (replaced by Vale's own `vale test`), markdownlint in this pass
  (deferred), and the Elastic tiers bullet.
- **Target growth:** spec 276 to 299 lines (+8%), plan 269 to 274 lines (+2%); by words, spec +14%,
  plan +9%. Under the 25% signal.
- **Ceiling change:** none; 6M stands (the leanness lens's lower estimate refused).
- **Refused findings that prove real:** scored at this pass's close.
