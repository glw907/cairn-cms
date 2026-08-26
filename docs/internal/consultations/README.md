# Consultations

Pre-pass engine consultation briefs, one document per consulting pass, filed here by the
site session that authors the pass plan. The brief and the engine's verdicts are one
document: the triage appends its verdicts to the brief rather than answering somewhere
else. The canonical protocol lives in the `engine-consult` skill; rulings accumulate in
[`../engine-rulings.md`](../engine-rulings.md).

## The filing rule

`YYYY-MM-DD-<site>-<pass>.md`, one document per consulting pass. Entries are never edited
after the pass, matching `record/`'s convention; a later correction is a new document, and
durable outcomes live in the rulings ledger.

This directory is prospective per-item consultation, asked before a pass builds;
[`../feedback/`](../feedback/README.md) is retrospective DX measurement after a migration
or incident.

## The item schema

Per item, four fields:

1. **What the pass builds** (the site feature, one paragraph).
2. **The engine edge it presses** (surface, `file:line` where known).
3. **Evidence for the any-site case** (recurrence, measurements, prior instances).
4. **The site's fallback if declined**, with its rough size. This field prices the
   decline for the triage, and on a decline it becomes the sanctioned end state.
