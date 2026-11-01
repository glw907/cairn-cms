# DaisyUI v5 patterns for the hard admin components (research, 2026-07-06)

Sourced research for the Club admin build; the battle-tested-patterns principle's
concrete shapes. Full markup in the phase-2 suite's companion; the load-bearing rules:

- **Timeline** (payments/memberships history): native `timeline timeline-vertical`;
  state rides the COLORED `<hr>` spine + the middle icon (`bg-success`/`bg-warning`) —
  always PAIRED WITH TEXT (never color alone). Display-only: actions live inside the
  `timeline-box`. Pin `timeline-vertical` explicitly.
- **Detail two-pane**: no native primitive exists; the idiom is `grid grid-cols-1
  lg:grid-cols-3` with identity as a 1-col `card` and activity as 2-col (the ratio the
  official Store dashboard and community templates converge on).
- **Approve/deny queue**: v5's `list`/`list-row` over `table` whenever rows carry a
  decision (mind the default second-child-grows: mark the text block `list-col-grow`);
  actions as a `join` of `btn join-item`. Table only for read-only ledgers. (This exact
  pairing is synthesized, not found — first-of-its-kind here.)
- **Destructive confirm**: the `<dialog class="modal">` form with `method="dialog"` +
  `formaction` on the destructive button. TWO GOTCHAS: `preventDefault()` the dialog's
  `cancel` event so ESC/backdrop can't dismiss a forced choice; `autofocus` the CANCEL
  button (accidental Enter must not confirm) — v5 had a showModal focus bug (#3440).
- **Stats**: `stats stats-vertical lg:stats-horizontal` atop queues, `stat-value`
  colored by state, matching the timeline's color language.
- v5-only vocabulary: `join` replaced `btn-group`/`input-group`; never `form-control`/
  `label-text`/`-bordered`.
