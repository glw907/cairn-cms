# p1-p8 fold record

`standards:spec-plan-review` sets the mechanics lens and the fold for a plan, with no verification
read. The planner ran the fold in this session on `claude-opus-5-5` instead of a separate fold agent,
because it already held every source read. That departs from the skill's "one fold agent". It checked
findings 1, 3, 6, and 19 against source first.

The skill drops `optional` findings. Three were folded anyway: 18, because the slice prompt requires
every cited line to be current; 19, as below; and 21, because it closes a false negative.

| Finding | Disposition |
|---|---|
| 1 | Folded, T5 `forged`. |
| 2 | Folded: pre-flight, the task preamble, T5, T6, T8, T9. |
| 3 | Folded, T6 files and acceptance. |
| 4 | Folded, T6. |
| 5 | Folded, T7 acceptance. |
| 6 | Folded, T7 row. |
| 7 | Folded, T9. |
| 8 | Folded, T9. |
| 9, 10 | Folded, T10 order. |
| 11 | Folded, T8 acceptance. |
| 12 | Folded, T4 acceptance. |
| 13, 14 | Folded, T5 table. |
| 15 | Folded, T5 acceptance: local run deleted. |
| 16 | Folded, standing answers. |
| 17 | Folded, executor prompt. |
| 18 | Folded: cheap, and the prompt requires quoted citations. |
| 19 | Folded, not a fork. The string `This section is not available. Let your site developer know.` already ships at `content-routes-settings.ts:154`, so reusing it is the clearly correct answer, and the skill says such a question is no fork. Reversible, and listed in `## Decisions`. |
| 20 | Refused: optional, and a fold would break a clean pair for about 5 minutes. |
| 21 | Folded: two lines in T6 that remove a false negative. |

No finding changes the design. No owner fork remains.
