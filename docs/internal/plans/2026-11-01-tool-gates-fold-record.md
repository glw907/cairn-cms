# tool-gates fold record

Depth: a plan takes the mechanics lens and the fold. The planner folded inline, in the session that
read the source, and checked M1, M2, M3, M5, m1, and m4 against source first
(`bin.test.ts:121-126`, the four sites' `tokens.css`, `CHANGELOG.md:802`, `claude/CLAUDE.md:34-35`,
`pass-gate-tiers.md`, `check-version.mjs:79`).

| Finding | Disposition | Where |
|---|---|---|
| M1 | Folded | T3 Files, Test |
| M2 | Folded | T3 Mechanism, acceptance 3 and 4, Test |
| M3 | Folded | T1 Mechanism, `cases.json`, acceptance, Test; design |
| M4 | Folded | T1 failure text and `--update`; Standing answers; conductor prompt |
| M5 | Folded | T3 Files and Mechanism; T7 emit rerun |
| M6 | Folded | T6 steps 2 and 3, acceptance. T6 rises from 45 to 60 for the pushed probe, path 230 |
| m1 | Folded | T1 Files |
| m2 | Folded | T1 Test |
| m3 | Folded | T1 Mechanism |
| m4 | Folded | T1 reuses `unreleasedWindow`; absent and missing-baseline states named |
| m5 | Folded in part | Three rows added. Refused: swapping `\S` and CRLF handling. `CHANGELOG.md` holds neither character, and a gate rule for them answers no defect |
| m6 | Folded | T1, `["docs", "scripts"]` |
| m7 | Folded | `## Order` |
| m8 | Folded | T7 |
| m9 | Folded | T3 acceptance, T6 step 2. `CAIRN_GATE_LANE=heavy` matches `cairn-pass` |
| m10 | Folded | T4 |
| m11 | Folded | T5 Test |
| m12 | Folded | `## Pre-flight` row |
| m13 | Folded | Standing answers; conductor prompt |

No finding changes the design, and no owner fork arose. Path 230, under the ceiling of 300.
