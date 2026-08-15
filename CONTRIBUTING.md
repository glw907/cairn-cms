# Contributing to cairn

cairn is the embedded, git-backed CMS this repository publishes to npm as
[`@glw907/cairn-cms`](https://www.npmjs.com/package/@glw907/cairn-cms). This guide orients you
in the repository and describes what a change needs before it can land. For what cairn is and
why it works the way it does, start with the [docs](./docs/README.md) and
[Why cairn](./docs/why-cairn.md).

## Set up and run the suite

```sh
npm install       # needs Node 22 or newer, the version CI runs
npm test          # vitest: the unit, integration, and component projects
npm run check     # svelte-check
```

`npm install` also builds the package, because `npm run package` runs as the `prepare` script.
To see a change in a running admin, use the showcase: `npm install` in `examples/showcase`,
then `npm run dev` there. The showcase consumes the library through a relative `file:../..`
dependency, so it runs your checkout rather than the published package. Its imports resolve
into `dist/`, so run `npm run package` at the root after changing `src/lib` for the showcase
to pick the change up.

## Proposing a change

Open an issue before starting anything large, so the design question settles before the code
does. A small fix can go straight to a pull request against `main`. CI runs the full gate set
on every pull request.

## The gates

CI is the authority on what must pass. The workflows in `.github/workflows/` run the gates,
and `test.yml` carries most of them; derive the list from those files rather than from prose.
Locally, `npm test` and `npm run check` catch most failures, and each `check:*` target in
`package.json` runs a gate script from `scripts/checks/`.

## Conventions a change is held to

- Write the failing test first. Tests live under `src/tests/{unit,integration,component}/`,
  with `src/tests/lab/` for engine apparatus and co-located tests inside
  `packages/cairn-cms-dev/src/`. `vitest.config.ts` names each of those globs explicitly, so
  check it before putting a test anywhere else: a path it does not glob runs zero tests and
  still exits 0, which looks exactly like success.
- Code comments follow [TSDoc](https://tsdoc.org/), enforced by `npm run check:comments` over
  `src/lib`. Write the contract and the why, never a paraphrase of the code. The em dash is
  banned in comments.
- Pages under `docs/reference/`, `docs/admin/`, and `docs/extend/` follow the
  [Google Developer Documentation Style Guide](https://developers.google.com/style);
  `docs/editors/` follows the
  [Microsoft Writing Style Guide](https://learn.microsoft.com/style-guide/welcome/) instead,
  because its reader is a non-technical writer. All four directories ship inside the npm
  package, so a docs edit is a product change, and a public-API change is not done until its
  reference page matches. `npm run check:reference` enforces the coverage.
- Commit subjects are imperative, in the
  [Conventional Commits](https://www.conventionalcommits.org/) shape:
  `fix(auth): reject expired tokens`.
- A consumer-visible change gets a `CHANGELOG.md` entry under `## Unreleased`, with a
  `Consumers must:` line when upgrading requires action. Releases are cut separately.
- Work on the `/admin` interface (the admin components in `src/lib/components/` or
  `cairn-admin.css`) follows the design system at
  [`docs/internal/admin-design-system.md`](./docs/internal/admin-design-system.md); read it
  first.

## Repository map

Each entry gives the rule for what belongs in a directory. Individual files move too often to
list here, so when the map and the tree disagree, trust the tree and fix the map.

- `src/lib/`: the shipped library. Public entry points are package subpaths, each with a
  matching page in `docs/reference/`; a directory without a reference page is internal.
  `npm run check:surface` gates the public surface.
- `src/tests/`: the vitest projects (`unit/`, `integration/`, `component/`) plus `fixtures/`.
  `lab/` holds engine apparatus that supports development and must never ship in the package.
- `scripts/`: helpers shared by the three groups below sit at the root.
- `scripts/checks/`: the gate scripts the `check:*` npm targets run.
- `scripts/build/`: the build steps behind `npm run package` and the design-system builds.
- `scripts/lab/`: development apparatus outside the `check:*` set, most of it run by hand
  against a live server. Two exceptions run in CI: `test:reskin` from `design.yml` and
  `norms:check` from `norms.yml`.
- `examples/showcase/`: a complete consumer site and the library's proving ground. The e2e
  and visual suites run against it.
- `examples/cairn-theme/`: the optional identity layer for
  [Waymark](./docs/extend/design-your-site.md), the starter template, and the skin
  [cairn.pub](https://cairn.pub) runs. The ported example themes (AstroPaper, Foxi, the
  gallery) live in their own repository,
  [glw907/cairn-themes](https://github.com/glw907/cairn-themes).
- `docs/`: `reference/`, `guides/`, `explanation/`, and `tutorial/` ship in the npm package,
  along with `docs/README.md`. `internal/` is maintainer-facing, `superpowers/` holds the
  dated specs and plans as history, and `STATUS.md` is the rolling project status.
- `packages/cairn-cms-dev/`: the companion package `@glw907/cairn-cms-dev`, a
  local-development fake backend. Install it as a `devDependency` only, never in production.
- `migrations/`: the D1 schema migrations for the auth store. They ship with the package.
- `skills/`: the packaged design-language skill an AI coding agent can load. It ships with
  the package, under a size budget `npm run check:package` enforces.

## Security and license

Report vulnerabilities through the [security policy](./SECURITY.md), never in a public issue.
The license is [MIT](./LICENSE).
