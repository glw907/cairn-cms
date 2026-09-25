---
id: profile-provisional-reason-not-allowed
persona: A profile fixture marked provisional false but carrying a provisionalReason anyway.
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
provisional: false
provisionalReason: this should not be here
---

This fixture sets `provisional: false` and still carries `provisionalReason`, to prove the schema
test fails that combination.
