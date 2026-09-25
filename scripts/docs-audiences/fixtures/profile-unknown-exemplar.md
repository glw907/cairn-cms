---
id: profile-unknown-exemplar
persona: A profile fixture whose exemplars list carries an id with no manifest entry.
vocabulary:
  use:
    - term one
  avoid:
    - jargon one
ceiling: Knows how to open a saved draft.
arrivalStates:
  - arrived mid-task
success: Finishes the task without opening a support ticket.
exemplars:
  - editors/govuk-publishing-guidance-home
  - editors/no-such-capture
provisional: false
---

This fixture's `exemplars` list carries `editors/no-such-capture`, which the fixture manifest
(`manifest-fixture.md`) has no entry for, to prove the schema test fails an unknown exemplar id.
`profile.schema.json` itself passes this fixture (the shape is otherwise valid); the exemplar-id
check is the separate `unresolvedExemplarIds` pass over the same data.
