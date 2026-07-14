# Save-500 and honest-errors pass (2026-07-13)

The P0 from the STATUS queue plus its riders: the live ecxc save 500, the raw-500 hardening,
the missing `required` attributes, the tidy error voice, tidy key truthful visibility, and the
preview-formatting diagnosis. Executes on a worktree off `main` (`save-500-hardening`), each
task dispatched to `cairn-implementer`, test-first, full gate per task. Geoff authorized a
workflow for the review gate and a release + three-site rollout after verification.

## Diagnosis (banked, 2026-07-13 evening)

Workers Logs holds the P0's exception (ray `a1ad4af02a3277a3`, 03:03 UTC 07-14):
`resolvePermalink` threw `concept "posts" permalink pattern uses :year, but entry
"2026-07-talkeetna-camp-registration-is-open" has no valid date`, escaping from
`manifestEntryFromFile` inside `saveToBranch` before any branch or commit existed. The chain:

1. ecxc posts declare permalink `/:year/:month/:slug`, `datePrefix: 'month'`, and
   `date: fields.date({ label: 'Date' })` — not required, no default.
2. `createAction` requires a date, composes the id from it, then drops it: the redirect
   carries only `?new=1&title=`.
3. `editLoad` seeds a new doc from `initialValues(schema)`; with no `default: 'today'`
   the Date field opens empty.
4. The date input arm in `FieldInput.svelte` renders no `required` attribute (neither does
   the textarea arm — queue item 5), so nothing catches it client-side.
5. `concept.validate` passes (field not required); `manifestEntryFromFile` recomputes
   identity from the markdown frontmatter; `resolvePermalink` throws; nothing catches it;
   SvelteKit renders the raw 500.

Not an 0.84.3 regression: the redirect never carried the date. The required-Summary
validation used to fail these saves earlier in the flow; its fix unmasked this. The showcase
never reproduces it because its posts permalink has no date tokens.

Preview (queue item 4) negative evidence, also banked: ecxc's built server chunk carries the
correct hashed stylesheet URLs and `containerClass: "site-main"`; both stylesheets serve 200
in production; `render` is wired into the admin mount. The break is not the preview knob's
config, so it needs a live reproduction (Task 6).

## Tasks

### Task 1: seed and enforce the date for date-token permalinks (the P0)

Three layers, one dispatch:

- `createAction` threads the collected date through the `?new=1` redirect (a `date` query
  param beside `title`), and `editLoad` layers it into the seeded frontmatter for a new
  entry: over the schema defaults, under any parsed frontmatter, exactly the title seed's
  contract. The new-entry form opens with the date the editor already picked.
- `normalizeConcepts` (and `defineConcept`'s declaration-time validation where it fits):
  a concept whose permalink uses a date token must declare a `date` field of type `date`;
  a missing one is a declaration-time error naming the concept and the pattern. The declared
  descriptor is normalized to `required: true` (structurally required: the permalink cannot
  resolve without it), so the validator and the form's native `required` both enforce it.
  A dated concept whose permalink carries no date token keeps its optional date.
- Belt and braces in `saveToBranch`: after validation, when the concept's permalink uses a
  date token and the decoded frontmatter still has no valid `YYYY-MM-DD` date, bounce with
  the standard editor-voiced redirect error ("Pick a date for this entry.") instead of
  letting `manifestEntryFromFile` throw.

Acceptance: a failing test first for each layer (the redirect carries the date; the seeded
form frontmatter has it; normalization errors on the missing field and forces required; the
save bounces, never throws, on a dateless form for a date-token concept). Docs riders: the
concepts/fields reference pages for the normalization rule, changelog entry (behavior change,
no consumer action required — sites with a date-token permalink get the field enforced).

### Task 2: no raw 500 from an admin action (queue item 2)

An unexpected exception in an admin action must reach the editor as the error strip, never
SvelteKit's raw 500 page. Wrap at the action chokepoint (the `cairn-admin.ts` action map is
the natural seam) so save, publish, create, delete, rename, and the rest all share it:
control-flow throws (redirect, HttpError, ActionFailure) pass through untouched; anything
else logs a new `admin.action.failed` event (action, concept, id, editor, error message —
never a token) and returns a `fail(500)` whose copy is calm and honest in the admin voice,
telling the editor their writing is still in the editor and to try again or tell their site
developer. Confirm EditPage's existing failure summary renders it; extend if a view lacks a
strip. Acceptance: a test that a throwing action yields the strip payload and the log event,
not a thrown 500. Docs riders: `docs/reference/log-events.md` row, changelog.

### Task 3: the missing `required` attributes in FieldInput (queue item 5)

The textarea arm (`FieldInput.svelte:117`) and the date arm (`:163`) both omit `required`;
every arm should carry it (`required={f.required}`, and for the date arm also the Task-1
normalized requiredness). Audit all arms; fix each gap; component test that a required
textarea and a required date render the attribute so the capture-phase invalid handler can
open the Details panel. Changelog entry.

### Task 4: tidy error voice (queue item 3, rider A)

In the tidy action's model-call catch: an auth/permission failure from the API (401/403,
the Anthropic SDK error status) is not retryable and must not say "Try again." Branch it to
a distinct `fail(503)` with editor-voiced copy ("Tidy isn't available right now. Your site's
AI access needs attention; let your site developer know.") and a `tidy.error` log carrying a
`reason` field (`auth`); rate limits, overloads, timeouts, and aborts keep the retryable 502
framing, with their own `reason` values (`timeout`, `abort`, `model`). Acceptance: tests per
branch using the injected TidyClient. Docs riders: log-events reference (reason field),
changelog.

### Task 5: tidy key truthful visibility (queue item 3, rider B — design call made)

Presence checks alone are no longer the bar. The lean design, weighed per the queue entry
(lazy degrade over an inline edit-load probe, so edit loads pay zero latency):

- A per-isolate key-health cache (module or context level, TTL on the order of 10 minutes):
  a tidy call failing with the auth reason marks the key unhealthy; a success clears it.
- `editLoad`'s tidy projection consults the cache only (never probes inline): an unhealthy
  key projects tidy as disabled, so the button is absent, not disabled — the
  truthful-visibility principle.
- The settings screen and `cairn-doctor` upgrade from presence to an active minimal probe
  (a key-validating API call that spends no tokens), reporting missing / invalid / valid
  distinctly; the settings probe populates the same cache.

Acceptance: tests for the cache transitions, the editLoad projection, and the doctor/settings
distinction. Docs riders: tidy guide + doctor reference, changelog.

### Task 6: preview-formatting diagnosis (queue item 4)

Reproduce first: the showcase preview tab under `vite dev` and a production build, then ecxc
locally. The banked negative evidence (above) rules out the preview knob's config, the served
assets, and the render wiring. Suspects left: the `ResolvedPreview` projection `editLoad`
ships, the srcdoc iframe's behavior in the live admin, or something specific to a brand-new
entry (Geoff hit it on the same session as the P0). Deliverable: the diagnosis with evidence,
plus the fix when it is engine-side (or a filed site issue when it is ecxc's). If it is the
new-entry path breaking preview via the same dateless identity, verify Task 1 clears it and
pin a regression test.

### Pass end

The cairn-pass ritual: code-simplifier over the changed code; `npm run check` 0/0;
`npm test` exit 0; `check:comments`; the four doc gates plus `check:surface` (log-events and
reference pages changed); the review gate as a WORKFLOW (Geoff's opt-in): an adversarial
find-and-verify sweep over the pass diff (finders per dimension — correctness, security,
Svelte/runes, a11y — each finding adversarially verified before it reaches triage), folding
`web-auth-security-reviewer` coverage since actions changed. CHANGELOG under `## Unreleased`.
Post-mortem appended here; STATUS updated on main.

### Release and rollout (Geoff-authorized this session)

When every fix is verified: `cairn-release` cuts the window (verify the free number via
`npm view`; patch vs minor sized at the cut). Then the rollout, ecxc first: bump + gate +
deploy + live verification per site (ecxc.ski, 907.life, aksailingclub-org main — respect
any live WIP in the ASC tree). The human step stays Geoff's magic-link click; the smoke
session covers the rest, including a real dated new-entry save on ecxc reproducing the P0
flow end to end.
