---
id: extra-key-profile
persona: A profile fixture carrying one key the schema does not declare.
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
unexpected-extra-key: true
---

This fixture carries `unexpected-extra-key`, to prove the schema test fails an unknown key.
