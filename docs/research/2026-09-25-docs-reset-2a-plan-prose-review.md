# Pass 2a plan and human-read sheets: prose review

Reviewer: `prose-voice-reviewer` (`claude-opus-5-5`), 2026-09-25, at `2c47bc92`. Saved by the
conductor from the agent's report (summary of every finding; locations are at that commit).

## Human-read sheets (`2026-09-25-docs-reset-2a-human-reads.md`)

`tellgrader --register editor`: 0 findings, cadence CV 0.68. Sheet 1's task is feasible at
`v0.95.0` and `v0.96.0` (History, Revert, Discard changes documented; `revertAction` commits to the
pending branch).

- Blocker, :50-51: "the point is to find where the help pages fall short" primes fault-finding.
  Rewrite: "Please don't ask anyone for help until you've finished or stopped. We're testing the
  help pages, not you, so every place you get stuck is useful to know."
- Warning, :60-61: the done-state gives away the answer (unpublished changes, Discard). Rewrite:
  "...you've read the older version's text in the editor, and the post or page is back to exactly
  how it was when you started."
- Warning, :56: "Bring back the version from before that one" hands over the page's search term.
  Rewrite: "Open the text as it was before that publish, so you can read it in the editor."
- Warning, :53, :60: "entry" is the product's word; use "post or page", then "it".
- Warning, :46: "your club's site editor" reads as a person. Rewrite: "You're signed in where you
  write your club website's posts (your site's address followed by /admin)."
- Warning, :47-48: explain that the link opens GitHub and only the page text matters.
- Warning, :57-58: add "If you publish something by mistake, stop and tell Geoff right away."
- Suggestions: one meaning of "stuck" (:63 vs :70); drop the setup colon at :63-64; split the
  nested parentheticals at :68-69; ":83-84" name cairn.pub and the pages it links to; add Sheet 1's
  "work on your own" and "rough notes are fine" lines to Sheet 2; cut the repeated persona sentence
  at :89-91; replace "If you're Geoff:" at :109 with "If you already know cairn well, ...".

## Plan (`2026-09-25-docs-reset-pass-2a.md`)

Every checked citation and figure matches source; no invented specifics.

1. Task 9's three-lens split and F2(a)'s deferral depart from spec §6 without being errata; the
   header's "spec wins; stop" would halt Task 9. Add E3 and E4; Task 11 files E1 to E4.
2. The single-task overrun stop is presented as B4's, but nothing sets it; B4 sets only the flag.
3. `session-ledger.ts` has no per-agent split and the lane's spend mixes with Tasks 1 to 5, so a
   per-task overrun and an observed mean build cost cannot be measured as written.
4. F1's fallback "reruns that batch whole" cannot work, since the check precedes the batch; R-h
   calls the fallback a hold, which it is not.
5. F1 omits the pause's likely length (one or two sessions, idle gaps included) and the risk of
   declining (reader batches on different CLI versions).
6. The version gate contradicts itself (pinned set only vs re-pin allowed before the first batch).
7. The close's dry-run listing is listed as attended but needs no owner read (no deletion).
8. The Budget line names one conditional chain; Cost lines name two.
9. The conductor's no-logs rule conflicts with copying the human stall logs; name a `sonnet`
   `medium` copier. The sheets doc's relative paths should be the plan's absolute paths.
10. Task 7 step 3's test edit names no agent.
