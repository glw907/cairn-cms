# Engine rulings ledger

One entry per ruled item. This ledger records rulings the charter has produced and the
evidence that would reopen each. Read it before re-arguing a settled item, never in place
of the charter's own test: the charter adjudicates, the ledger records. An entry here is
evidence for an argument, never a substitute for one.

Entry format: a heading plus labeled lines.

```markdown
## <slug>: <one-line item>  (verdict, YYYY-MM-DD, source)
- **Verdict:** accept | decline | defer | keep | reshape | retire. One-sentence reason.
- **Reopens on:** the named evidence that would qualify (or "closed" for executed accepts).
- **Record:** link to the consultation, triage, or audit document holding the full argument.
- **Any-site case:** (audit entries; required on every keep) the concrete anonymous-consumer scenario.
- **Verified:** (audit entries; required on every family-originated export and every non-keep) the verifier pass that checked it.
```

## copy-to-clipboard-control: public-side copy-to-clipboard widget  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. A generic web widget on the design-agnostic public side; a chassis
  recipe at most, never an engine export.
- **Reopens on:** evidence it is an admin-surface mechanic rather than a public-side widget.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 4).

## site-today-export: `siteToday(timeZone)` date helper export  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. A few lines of `Intl`; the same repo failed to reuse its own first
  copy, so the failure is discoverability, which an npm export solves no better than the
  chassis carrying it once.
- **Reopens on:** evidence an export fixes the discoverability failure better than the
  chassis copy does.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 5).

## dead-body-declaration: per-entry dead-body declaration  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. One entry on one site; the proper site fix is deleting the husk
  page and holding the title in site config.
- **Reopens on:** recurrence (a second entry, or a second site needing it).
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-redesign 3).

## d1-test-tier: SQLite-backed D1 test tier  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. Real family pain, but a second test harness is large surface for a
  lean package; "out of scope" is the charter's sanctioned answer, and the sites can share
  a harness module.
- **Reopens on:** evidence the shared site-side harness module fails across sites.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (events-admin 8).

## expandablerow-colspan: ExpandableRow `colspan` incident-row variant  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. One consumer, and structurally a different widget from the shipped
  ExpandableRow.
- **Reopens on:** a second consumer.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 25).

## warning-button-tier: warning button tier in the admin palette  (defer, 2026-08-26, ASC harvest triage)

- **Verdict:** defer. A family-register design question held for Geoff; neither the site
  nor the engine invents it unilaterally.
- **Reopens on:** Geoff's ruling on the family register.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 2).

## blanket-admin-list-reset: blanket admin list-style reset  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. As filed it fails the standing a11y ruling at `cairn-admin.css:468`;
  superseded by the scoped form (triage survivor 8).
- **Reopens on:** nothing; the scoped form supersedes it.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 35).

## below-bar-toolkit-idioms: labeled-group switcher and static count-line idioms  (decline, 2026-08-26, ASC harvest triage)

- **Verdict:** decline. Two small toolkit idiom notes below the absorption bar (a
  labeled-group switcher idiom and a static variant of the `computeCountLine` live-region
  idiom); they ride along only if a task already touches those surfaces.
- **Reopens on:** an engine task already touching those surfaces, as ride-alongs, never as
  standalone items.
- **Record:** [2026-08-26 ASC harvest triage](record/2026-08-26-asc-harvest-triage.md), Ruled out (email-announce 32 and 33).

## ical-builder: iCal feed builder  (decline, 2026-08-05, ASC consumer-brief scope check)

- **Verdict:** decline. Events are site domain, and the engine has no events concept.
- **Reopens on:** a deliberate reopening only: the ASC events-redesign decision making any
  part of events content-shaped, pressing the fixed-concepts model and date-aware public
  listing ("that standing ruling should be reopened deliberately or not at all").
- **Record:** [engine-harvest-candidates.md](engine-harvest-candidates.md) section 3
  (events-redesign), recording the ASC consumer-brief scope check.

## xcathletes-multi-team-isolation: per-team scoping of content visibility  (defer, 2026-08-05, xcathletes requirements)

- **Verdict:** defer. Deferred at the site's own request: Gate 3 of the requirements'
  governance model is "direction, not v1", and "a third team is its own future initiative".
- **Reopens on:** a third team, or the site reopening Gate 3.
- **Record:** [engine-harvest-candidates.md](engine-harvest-candidates.md) section 3
  (xcathletes multi-team isolation).
