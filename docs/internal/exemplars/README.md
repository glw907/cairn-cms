# Exemplars

Three captured pages that show the anatomy and rhythm the two base style guides ask for. A
drafter or register editor reads a page here whole and imitates its structure and pace, never its
wording. Each file opens with its source URL, capture date, and attribution, and each is
CC BY 4.0 (Google's code samples are Apache 2.0). Vale and `check:docs` skip this directory, so
the captures keep their original links and typography.

| File | Base guide | Role |
| --- | --- | --- |
| [`google-task-create-project.md`](google-task-create-project.md) | Google | Task page: a one-sentence purpose, then numbered steps, one action per step, with the UI label in bold and a short result line. |
| [`google-concept-auth-overview.md`](google-concept-auth-overview.md) | Google | Concept page: a definition up front, a worked analogy, a numbered overview, then a terminology list. |
| [`microsoft-procedure-blobs-portal.md`](microsoft-procedure-blobs-portal.md) | Microsoft | UI-only procedure page: "follow these steps" lead-ins, imperative steps that name the control, and one screenshot per procedure. |

## Sources and licenses

- Google pages: `https://developers.google.com/workspace/guides/create-project` and
  `https://developers.google.com/workspace/guides/auth-overview`, captured with `curl` and
  converted with `pandoc`. The generated "Page Summary" panel is omitted.
- Microsoft page: the Markdown source at
  `https://github.com/MicrosoftDocs/azure-docs/blob/cdf0d71d6878c96f2d38f3ff00f3df6f91bb82b2/articles/storage/blobs/storage-quickstart-blobs-portal.md`.
  The `MicrosoftDocs/azure-docs` license is Creative Commons Attribution 4.0 International:
  `https://github.com/MicrosoftDocs/azure-docs/blob/main/LICENSE`. A Microsoft Learn page is
  reusable only when its source repository's license says so.
