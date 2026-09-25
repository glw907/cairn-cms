---
id: not-the-file-name
persona: A profile fixture whose id does not match its file name.
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
---

This fixture's `id` (`not-the-file-name`) does not match its file name (`profile-id-mismatch`), to
prove `checkProfileFile` fails a mismatch, naming the file.
