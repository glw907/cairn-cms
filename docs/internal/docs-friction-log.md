# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting
cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and the backlog. A finding here does not block the doc
that found it.

Record each finding with its perspective, the doc that surfaced it, and a short note. The
perspective is `developer` (the integrator building and deploying a site) or `editor` (the
non-technical author working in `/admin`).

## Findings

Phase 1 seeds this file. Later phases append as they write.

- **developer** (npm packaging, from `cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`): the
  published tarball shipped no `CHANGELOG.md` and no `homepage`, so an npm consumer could not
  reach the upgrade record from the registry page. Addressed in this phase's metadata task.
