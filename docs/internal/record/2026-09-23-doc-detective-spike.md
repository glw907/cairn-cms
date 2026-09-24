# Doc Detective spike

Time-boxed spike for docs reset pass 1, Task 10 (docs-as-tests). Decision: **build**, not adopt.

## What was tried

Installed `doc-detective@4.38.1` into a scratch directory outside the repository (never as a
dependency here), then ran it against a copy of `docs/admin/is-it-working.md`:

```sh
npm install doc-detective@4.38.1
npx doc-detective -i is-it-working.md --dry-run
npx doc-detective --help
```

`npm install` pulled 104 packages with no Playwright or other browser package as a direct
dependency; the tool lazy-installs browsers through its own `install` subcommand only when a
test actually needs one. `--help` confirmed the shape: a default run scans input files for
markup it recognizes, or a separate test-spec file written in its own JSON or YAML schema
(`config_v3`, `step_v3`), and reports through pluggable reporters (terminal, JSON, JUnit,
markdown).

## What the dry run showed

Run with no test-spec file, against the plain markdown page, `--dry-run` resolved a full test
plan with no configuration beyond the input path. Doc Detective's default markup rules turned:

- Every **bold** phrase (`**title**`, `**Act:**`, and so on) into a `find` assertion, checking
  that the phrase's literal text is present at that location.
- Every Markdown link into a `checkLink` assertion (an HTTP reachability check).

It emitted zero `runShell` (or any executing) steps from the page's own fenced code blocks. The
fenced ```` ```\ncairn doctor\n``` ```` block, and the real transcript block right after it
(prefixed with the `<!-- transcript: ... -->` comment this repo's own pages use), produced no
step at all: plain triple-backtick code fences carry no markup Doc Detective's defaults
recognize as a runnable command by themselves. Getting `cairn doctor` to run for real, checked
against a live scratch site, needs one of:

- A test-spec file written in Doc Detective's own JSON or YAML schema (`config_v3`), naming a
  `runShell` step, separate from the page.
- Or annotating the page itself with Doc Detective's own HTML-comment markup
  (`<!-- test action="runShell" ... -->`) around the block.

Both routes mean authoring content in Doc Detective's own DSL, either inside the published page
or in a companion file that has to be kept in sync with it by hand. Pass 1's global constraint
bars changing a published page at all, and a companion spec file duplicates the same maintenance
problem this pass is trying to avoid: a second place, in a foreign schema, that has to track
every future edit to the command block.

## Why build, not adopt

1. **Ruling 10's tiers need one thing Doc Detective does not do out of the box: classify a
   command as read-only or state-changing and check the state-changing ones as a dry run
   against `cairn`'s own command tree (`cairn <cmd> --help`), never execute them.** `runShell`
   is a single, undifferentiated action; nothing in its schema tells it a command changes state
   without a hand-written `--dry-run`-style step per command, and cairn's actual dry-run
   surface is its own `--help`, not a flag Doc Detective would know to reach for.
2. **This repository already has the exact confinement primitives Doc Detective would need to
   duplicate**: a podman image with `cairn` baked in and verified against its release
   `SHA256SUMS` (`scripts/docs-readers/Containerfile`), a scratch-site registry record
   (`lib/prepare-class.ts`'s `prepareDocsAndBinary`), and an egress-controlled network. Adopting
   Doc Detective would mean running it *inside* that same container (to get the confinement),
   passing it a hand-authored spec file (to get the read-only/state-changing split it has no
   native concept of), and still writing the title-check enumeration this task also needs,
   which is nothing in Doc Detective's own vocabulary either.
3. **No page needs authoring in a foreign syntax.** Extracting a fenced `cairn ...` command line
   with a plain regular expression, and classifying it against the docs-and-binary class's own
   `bashAllowlist` (already the single source of truth for what is read-only), is a few dozen
   lines that stay entirely inside this pass's own idiom (TSDoc, `check-comments`, unit tests
   under `src/tests/unit/`), rather than a second, parallel test-authoring surface a future
   editor would need to learn.
4. **Doc Detective's UI-testing machinery (screenshots, browser actions, `startSurface`) is
   entirely unused here** and adds a dependency surface and a lazy-installed-browser step that
   this text-only, CLI-only harness has no use for.

The harness therefore extends `scripts/docs-readers/` with its own small, purpose-built
extraction and classification module, described in Task 10's own acceptance.
