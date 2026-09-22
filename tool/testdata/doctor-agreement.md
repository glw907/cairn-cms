# `cairn doctor` against `cairn-doctor`: the agreement study

**This file is a record, not a fixture. No Go test reads it.** It is the evidence for the
retire-1 acceptance bullet that asks the two doctor implementations to agree, per check and per
site tree, under a status mapping table. A later reader looking for the gate that holds this file
will not find one: the agreement it records was measured once, by hand, on the date below, and the
gates that hold the Go behaviour are the package's own tests.

Measured 2026-09-22 on branch `doctor-go` at `2fe66d1e`.

- **`cairn doctor`** is `go build ./cmd/cairn` from `tool/` at that SHA, run as `cairn doctor` in
  each tree.
- **`cairn-doctor`** is `dist/doctor/bin.js` built from the same checkout's `src/lib/doctor/`,
  which is byte-identical to `origin/main` (`git diff origin/main..HEAD -- src/` is empty), run
  with the tree as the working directory.

## The status vocabularies

`cairn doctor` carries five words, `cairn-doctor` carries five words, and they are the same five:
`PASS`, `FAIL`, `SKIP`, `INFO`, `UNCHECKED`. The mapping is the identity. Under `--json` the Go
command reports spine's three-word `state` instead, with `UNCHECKED` becoming
`"state": "unknown"` plus `"reason": "reason.not-observable"`; the plain-text word is what this
table records.

## Part 1: the eight file-only checks, four production trees

Each tree was read as it stood, with no modification. None of the four carried a
`src/content/.cairn/site-facts.json`, and none carried an installed `node_modules`.

| Check | Tree | `cairn doctor` | `cairn-doctor` | Verdict |
| --- | --- | --- | --- | --- |
| `config.bindings` | ecxc-ski | FAIL | FAIL | agree |
| `config.bindings` | 907-life | PASS | PASS | agree |
| `config.bindings` | aksailingclub-org | PASS | PASS | agree |
| `config.bindings` | xcathletes-org | PASS | PASS | agree |
| `config.observability` | ecxc-ski | PASS | PASS | agree |
| `config.observability` | 907-life | PASS | PASS | agree |
| `config.observability` | aksailingclub-org | PASS | PASS | agree |
| `config.observability` | xcathletes-org | PASS | PASS | agree |
| `config.csrf-disable` | ecxc-ski | PASS | PASS | agree |
| `config.csrf-disable` | 907-life | PASS | PASS | agree |
| `config.csrf-disable` | aksailingclub-org | PASS | PASS | agree |
| `config.csrf-disable` | xcathletes-org | FAIL | FAIL | agree |
| `config.site-config` | ecxc-ski | PASS | PASS | agree (found and parses) |
| `config.site-config` | 907-life | PASS | PASS | agree (found and parses) |
| `config.site-config` | aksailingclub-org | PASS | PASS | agree (found and parses) |
| `config.site-config` | xcathletes-org | PASS | PASS | agree (found and parses) |
| `config.public-origin` | ecxc-ski | PASS | PASS | agree |
| `config.public-origin` | 907-life | PASS | PASS | agree |
| `config.public-origin` | aksailingclub-org | PASS | PASS | agree |
| `config.public-origin` | xcathletes-org | PASS | PASS | agree |
| `config.no-referrer-blanket` | ecxc-ski | PASS | PASS | agree |
| `config.no-referrer-blanket` | 907-life | PASS | PASS | agree |
| `config.no-referrer-blanket` | aksailingclub-org | PASS | PASS | agree |
| `config.no-referrer-blanket` | xcathletes-org | PASS | PASS | agree |
| `admin.mount-shape` | ecxc-ski | PASS | PASS | agree |
| `admin.mount-shape` | 907-life | PASS | PASS | agree |
| `admin.mount-shape` | aksailingclub-org | PASS | PASS | agree |
| `admin.mount-shape` | xcathletes-org | PASS | PASS | agree |
| `config.dependency-floors` | ecxc-ski | UNCHECKED | FAIL | **disagree, expected: D1** |
| `config.dependency-floors` | 907-life | UNCHECKED | FAIL | **disagree, expected: D1** |
| `config.dependency-floors` | aksailingclub-org | UNCHECKED | PASS | **disagree, expected: D1** |
| `config.dependency-floors` | xcathletes-org | UNCHECKED | PASS | **disagree, expected: D1** |

On every agreeing row the two implementations printed the same detail string, not merely the same
status word. `config.site-config` is compared on found-and-parses only, which is the whole of what
the Go check claims; a Contract v2 shape disagreement is out of this comparison's scope by design.

## Part 2: the three facts checks, three trees

| Check | Tree | `cairn doctor` | `cairn-doctor` | Verdict |
| --- | --- | --- | --- | --- |
| `config.media-bucket` | showcase | PASS | PASS | agree |
| `config.media-bucket` | xcathletes-org copy, linked | PASS | PASS | agree |
| `config.media-bucket` | 907-life, no facts file | UNCHECKED | SKIP | **disagree, expected: D2** |
| `auth.role-wiring` | showcase | SKIP | SKIP | agree |
| `auth.role-wiring` | xcathletes-org copy, linked | PASS | PASS | agree |
| `auth.role-wiring` | 907-life, no facts file | UNCHECKED | SKIP | **disagree, expected: D2** |
| `ai.posture-effective` | showcase | UNCHECKED | SKIP | **disagree, expected: D3** |
| `ai.posture-effective` | xcathletes-org copy, linked | FAIL | FAIL | agree |
| `ai.posture-effective` | 907-life, no facts file | UNCHECKED | PASS | **disagree, expected: D2** |

The three trees:

- **showcase** is `examples/showcase` in this worktree, carrying the committed
  `src/content/.cairn/site-facts.json` (`{"version": 1, "mediaBucketBinding": "MEDIA_BUCKET"}`).
  Its origin is `http://localhost:4173`, which nothing was serving, so both implementations failed
  to fetch `/robots.txt`. It was measured after an `npm install` in `examples/showcase`: without
  one, `cairn-doctor` cannot resolve the site's Vite plugins, its adapter read returns null, and
  its three facts checks answer from their absent-input branches rather than from the adapter.
  The install repointed the worktree's `file:` engine deps and left `package-lock.json` unchanged
  after a `git checkout`.
- **xcathletes-org copy, linked** stands for the one production site declaring all three facts: a
  media bucket (`media: { bucketBinding: 'MEDIA_BUCKET' }`), a custom role vocabulary (`coach`,
  beside the reserved `owner`), and an AI posture (`aiPosture: 'decline'`). The real checkout was
  pointed at this worktree's engine with `link:consumer` and then restored. `cairn-manifest` failed
  there, so the measurement ran on a scratch copy of that checkout, taken at its HEAD as of
  2026-09-22 with the four renamed call sites edited in the copy alone and deleted after the run.
  See "The linked-site run" below for the deviation in full and for what the restore left.
- **907-life, no facts file** is the third arm: a tree with no `src/content/.cairn/site-facts.json`
  at all. Any of the four production trees serves; 907-life is the one recorded. All three checks
  report `UNCHECKED` under `cairn doctor`, which is what the acceptance bullet asks for.

## The disagreement ledger

Every disagreement above is one of these three, and each is expected with a stated reason. No row
is unclassified, and no defect was found.

### D1: `config.dependency-floors` reports `UNCHECKED` without an installed engine

`cairn doctor` reads the engine's declared peer ranges from
`node_modules/@glw907/cairn-cms/package.json` **as a plain file under the site directory**, which
is the specified design: an external binary cannot resolve a Node module, and an absent file is
`UNCHECKED` by construction. `cairn-doctor` reads the same ranges from its own installed
package through `createRequire`, so it always has them, whatever the site tree holds.

None of the four production trees had `node_modules` at measurement time, so the Go check could
not observe the floors and the Node check could. The input that shows it is the Go detail string:
`node_modules/@glw907/cairn-cms/package.json not found`.

The two agree once an install exists. With `node_modules` present in xcathletes-org (installed at
`^0.96.0` from the registry), both implementations printed the same line:

```
PASS  @cloudflare/workers-types 5.20260822.1 and @sveltejs/kit 2.70.3 and svelte 5.56.10 satisfy the engine peer ranges
```

A related case, recorded so it is not mistaken for this one: in `examples/showcase` the Go check
reports `UNCHECKED  doctor: refusing to read outside the directory:
node_modules/@glw907/cairn-cms/package.json`. That is the containment refusal on the showcase's
symlinked engine, also by design, and also not a defect.

### D2: no facts file is `UNCHECKED` for the Go command and a fallback for the Node one

The two implementations take the three facts from different places. `cairn doctor` reads the
committed `src/content/.cairn/site-facts.json`, which the engine writes at build time.
`cairn-doctor` evaluates the site's adapter live, through the consumer's own Vite resolution.

A tree with no facts file therefore gives `cairn doctor` nothing to read, and it reports
`UNCHECKED  needs engine 0.97.0 or later, and one build` for all three. The Node doctor still
evaluates the adapter, or, where that evaluation returns nothing, falls through to each check's own
absent-input branch: `SKIP` for the media bucket and the role wiring, and, for the posture, a
`PASS` that means "the site states no posture and the served `robots.txt` carries no AI
directives, consistent with stating nothing".

This is the intended shape of the retire-1 acceptance bullet, not a defect: the criterion asks
precisely that the three checks report unknown against a site with no `site-facts.json`.

### D3: an unreachable `/robots.txt` is `UNCHECKED`, narrowing the engine's `SKIP`

`ai.posture-effective` makes the one network request either implementation makes. When the origin
cannot be reached, `cairn-doctor` returns `SKIP`, which never gates, and `cairn doctor` returns
`UNCHECKED`, which drives exit 3. The narrowing is deliberate and planned: an offline run's exit
code should say the check did not look, rather than passing the run silently.

The input that shows it is the showcase, whose declared origin `http://localhost:4173` had nothing
listening:

```
cairn doctor    UNCHECKED  The stated AI posture is not the served one: could not reach the resolved origin's /robots.txt
cairn-doctor    SKIP       AI posture, effective: could not reach http://localhost:4173/robots.txt: fetch failed
```

## Exit codes

The pre-declared disagreement, observed once, on ecxc-ski: a blocker-severity failure
(`config.bindings-missing`) exits **2** under `cairn doctor` and **1** under `cairn-doctor`.
`run.ts`'s `exitCodeFor` gives every failure 1, while the Go command takes the severity from the
condition. Expected, never a defect.

| Tree | `cairn doctor` | `cairn-doctor` |
| --- | --- | --- |
| ecxc-ski | 2 (CRITICAL) | 1 |
| 907-life | 3 (UNKNOWN) | 1 |
| aksailingclub-org | 3 (UNKNOWN) | 1 |
| xcathletes-org | 3 (UNKNOWN) | 1 |
| showcase | 3 (UNKNOWN) | 1 |
| xcathletes-org copy, linked | 1 (WARNING) | 1 |

The two columns are not comparable beyond that one rule. `cairn-doctor` runs seven checks this
port does not carry (the Cloudflare chain, the GitHub App, the tidy key), and on these trees those
checks failed, so its 1 is frequently decided by a check outside the eleven.

## What could not be measured, and why

**The linked-site run.** The three ordered steps ran against the real
`/var/home/glw907/Projects/xcathletes-org`: `link:consumer`, then `npx cairn-manifest`, then
`link:consumer --restore`. **Step 2 failed**, with
`(0 , __vite_ssr_import_0__.extractMenu) is not a function`, and wrote no facts file.

The cause is not the doctor. `main`'s unreleased window renames a batch of exports
(`extractMenu` to `readMenu`, `buildMediaResolver` to `createMediaResolver`, `fieldset` to
`defineFieldset`, `githubApp` to `createGithubApp`, among others). Every one of the four
production sites is pinned to a released version and calls the old names, so no production site's
adapter evaluates against this worktree's engine, and `cairn-manifest` cannot reach the facts it
would write. This is a standing consequence of the unreleased rename, worth knowing before the
next pass points a site at unreleased engine work.

The measurement was completed on a copy of the site in the session scratchpad: a copy of the
`/var/home/glw907/Projects/xcathletes-org` checkout as it stood at its HEAD on 2026-09-22, with the
copy's `.git` removed, the copy linked the same way, and the four renamed call sites edited in the
copy alone. The copy was deleted after the run. `npx cairn-manifest` then wrote:

```json
{
  "version": 1,
  "mediaBucketBinding": "MEDIA_BUCKET",
  "roles": {
    "owner": "owner",
    "coach": "editor"
  },
  "aiPosture": "decline"
}
```

Both implementations were run against that copy, and all eleven checks agreed, including the three
facts checks. The copy's content is otherwise the production site's, so the rows in Part 2 stand;
what a reader should not read into them is that the production checkout itself carried a facts
file. It did not, and does not.

**What the real site was left holding.** `link:consumer --restore` put both cairn dependencies
back on `^0.96.0` and reported `OK, every cairn dependency resolves from the registry and the
branch can merge`. Restoring re-resolved a few unrelated transitive versions in
`package-lock.json`, which was returned to its committed state with `git checkout`, so
`git status --porcelain` in xcathletes-org is empty. No `site-facts.json` was ever generated
there, so none needed removing. The install left a `node_modules` directory the tree did not have
before; it is gitignored, and the one thing it changes for a later reader is `config.dependency-floors`,
which now has an engine to read and so reports `PASS` rather than the `UNCHECKED` Part 1 records.

**What this worktree was left holding.** `examples/showcase` now carries a real `node_modules`
install rather than the symlink back to the main checkout that a fresh worktree starts with. It is
gitignored, like the `node_modules` left in xcathletes-org, and a later reader should expect the
showcase here to resolve the worktree's own engine build.
