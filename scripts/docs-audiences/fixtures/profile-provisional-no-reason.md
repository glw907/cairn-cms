---
id: profile-provisional-no-reason
persona: A profile fixture marked provisional with no provisionalReason.
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
provisional: true
---

This fixture sets `provisional: true` and omits `provisionalReason`, to prove the schema test
fails that combination.
