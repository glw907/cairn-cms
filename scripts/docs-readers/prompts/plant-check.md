# Plant check

You check synthetic defects, called plants, that a planter wrote into documentation pages for a
pre-registered test of a documentation reader. For each plant you decide two things. First, does
its proof hold against the code? Second, does it share a subject with any development item? A
plant that fails either check is replaced before the test runs, so a wrong pass here corrupts the
test. Be skeptical. Verify every claim yourself instead of trusting the planter's proof.

## Blindness

Read only inside your input directory, the `<dir>` the dispatch names. Do not read, list, search,
or open any path outside it: no repository, no home directory, no cache, no other transcript. Your
transcript is audited, and one read outside `<dir>` invalidates your work. Write only
`<dir>/out/check.json`.

## Inputs

All paths are relative to `<dir>`.

- `export/`: the repository at the pinned commit, holding the code and the published
  documentation pages, with no history. Pages here are the original, unplanted pages. A plant's
  `page` is relative to `export/`.
- `plants.json`: an array of plants, each
  `{ id, job, page, line, type, semantic, subject, original, planted, proof, criterion, nearMiss }`.
  `line` is the 1-based first line of the plant's edited span. `original` is the span's text in
  the original page, and `planted` is its replacement, with lines joined by `\n`. `type` is one of
  the seven types under "Plant types" below, and `semantic` is true for the first three.
- `dev-items.json`: the development items, the defects and plants the reader was tuned on. Read
  its structure as you find it. Each item carries an id and a description of its subject: a page,
  a fact, or both.

You do not rule on placement, spacing, or the path map. A script checks those.

## Check 1: does the proof hold?

For each plant, work through these steps in order. `proofHolds` is `true` only when every step
passes.

1. **The original is real.** Open `export/<page>` and confirm that the text starting at `line`
   equals `original`. If it does not, the check fails.
2. **The original agrees with the code.** Find the code that decides the point, starting from
   the proof's citations and then searching on your own. The original must state the code's
   actual behavior, name, path, order, or steps. If the original is already wrong or the code
   does not decide the point, the check fails.
3. **The planted text is really defective.** Depending on the type, it must be false against the
   code, contradict an unchanged counterpart statement the proof cites that agrees with the code, or leave out a step the code needs. Search for anything that would make the planted text
   true after all: an alias, a fallback, a second code path, a configuration option the page
   covers. If any makes it true, the check fails.
4. **The citations are real.** Every `export/<path>:<line>` the proof cites exists and says what
   the proof claims. A proof that rests on a citation that does not exist, or does not say that,
   fails even when the plant might be defensible some other way.
5. **The type fits.** The plant matches its type's definition below and is none of what that type
   excludes, and `semantic` matches the type. For `removed-step` and `undefined-term`, search the
   whole published docs tree in `export/`, and fail the plant if any published page supplies the
   removed step or defines the term. For `contradiction`, confirm the counterpart the proof cites
   exists in `export/`, is not inside the plant's span, and agrees with the code. You do not have
   the job's page list, so accept a counterpart on the same page or on a page the proof names. For `stale-path`, confirm the planted path does not exist
   in `export/` or points somewhere else.

A plant that passes but looks weak can be noted in `reason`. Weak here means implausible,
trivially visible, or of little consequence to someone following the page. Such a note does not
change `proofHolds`.

## Check 2: does it share a subject with a development item?

A plant shares a subject with a development item when both concern the same fact. It shares on
the same page with the same fact, and it shares with the same fact on any other page. The same
fact means the same claim about the same behavior, name, path, precondition, order, or step. A
plant does not share a subject with an item merely because both sit on the same page, in the same
section, or in the same feature area, when the facts differ.

Apply this test: if a judge reading a report item about the plant could reasonably count it as a
report of the development item's fact, or the reverse, the two share a subject. When in doubt,
rule that they share.

Set `sharesSubjectWith` to the id of the matching item, or `null` when none matches. If more than
one matches, give the closest and name the others in `reason`.

## Output

Write `<dir>/out/check.json`: one JSON array with one element per plant, in `plants.json` order,
each with exactly these fields:

```json
{ "plantId": "…", "proofHolds": true, "sharesSubjectWith": null, "reason": "…" }
```

- `plantId`: the plant's `id`.
- `proofHolds`: `true` or `false`, from Check 1.
- `sharesSubjectWith`: a development item id, or `null`, from Check 2.
- `reason`: one to four sentences. For a failure, name the step that failed and the evidence,
  citing `export/<path>:<line>`. For a pass, cite the code that confirms the plant is defective.
  Add the subject ruling when it is not `null`, and any weakness note.

The file must be valid JSON. Write nothing else.

## Plant types

These definitions are shared by the planter and the plant check. Both prompts embed this text
unchanged.

A plant is one synthesized defect in a documentation page. It changes the page so that a person
following it is misled, blocked, or left without something they need, and the code decides the
question. Every plant has exactly one type. Pick the type by what a reader would have to notice
to catch it.

There are seven types. The first three are **semantic** (`semantic: true`). The last four are
**token** types (`semantic: false`).

No type covers these edits, so none of them is a plant: a typo, a grammar slip, a formatting or
markup change, a style or tone change, a vaguer sentence, a deleted example or aside the task
does not need, or any change whose truth the code cannot decide.

### `false-behavior` (semantic)

**Definition.** The page makes a false claim about behavior: what the software does, returns,
writes, accepts, rejects, defaults to, or how it responds to an action or an error. The code does
something else. The identifiers on the line stay correct. The error is in the claim.

**Example.** A page says a resize call clamps an upscale factor above the limit to the limit.
The code throws a range error and returns no image.

**Does not count.**
- A correct claim with a swapped identifier, such as the wrong option name. That is `wrong-name`.
- A false claim that clashes with a true statement elsewhere on the job's pages, planted so the
  two collide. That is `contradiction`.
- An unfalsifiable or hedged claim ("usually fast", "may take a while").
- A claim about behavior the code does not decide, such as a third-party service's limits.

### `contradiction` (semantic)

**Definition.** The planted text conflicts with another statement on the job's pages, so both
cannot be true. The other statement is left unchanged and agrees with the code. A reader who
meets both cannot act without guessing which one holds. The counterpart statement sits on the
same page or on another page in the job's page list, and preferably inside the plantable region,
so a reader on the job's path meets both.

**Example.** A page's overview says cropping keeps the source image's color profile. A later
step, planted, tells the reader that cropping strips the color profile from the output. The code
copies the profile to every cropped image.

**Does not count.**
- A false claim with no true counterpart on the job's pages. That is `false-behavior`.
- Two statements that differ in scope or wording but can both be true.
- A conflict between the page and a page outside the job's page list.

### `precondition-or-ordering` (semantic)

**Definition.** The page states a wrong precondition or a wrong order. It names a prerequisite
the code does not need, omits the fact that one is needed while claiming the action stands
alone, or puts steps in an order the code does not support. Following the page as written fails
or has a different effect.

**Example.** A page says to call the thumbnail function and then register the custom resampling
filter it uses. The library looks up the filter when the call starts, so it must be registered
first.

**Does not count.**
- A needed step deleted outright, with no false claim about order or need. That is
  `removed-step`.
- Steps swapped when either order works.
- A preference about order ("it is tidier to do this first") with no effect on the outcome.

### `removed-step` (token)

**Definition.** A step, command, or required action the task needs is deleted, and no published
page supplies it elsewhere. The surrounding text still reads naturally. Following the page as
written fails or leaves the task incomplete.

**Example.** A usage list goes from "load the source image" to "run the batch resize", having
dropped the step that sets the target size the batch resize reads.

**Does not count.**
- A deleted optional tip, example, note, or explanation.
- A deleted step that the job's pages or any other published page still state.
- A step replaced with a wrong one. That is `false-behavior`, `wrong-name`, or `stale-path`.

### `undefined-term` (token)

**Definition.** The page uses a term the reader needs in order to act, and neither the page,
the job's other pages, nor any published page defines it. The usual form replaces a plain or
defined phrase with an unexplained name for the same thing. The reader cannot tell what the term
refers to from the page.

**Example.** A step that said "pass the box the output image must fit inside" now says "pass
the frame envelope". Nothing in the docs says what the frame envelope is.

**Does not count.**
- A standard term that a competent member of the page's audience knows, such as "environment
  variable" or "HTTP status".
- A term defined anywhere in the published docs.
- A real identifier from the code used for the wrong thing. That is `wrong-name`.

### `wrong-name` (token)

**Definition.** An identifier the reader must type, set, match, or find is replaced with a wrong
one: a command or subcommand, a flag, an option or configuration key, an environment variable, a
field, a function or export, a setting name, or an interface label. The planted name does not
exist in the code, or names a different thing.

**Example.** A page tells the reader to pass `keepAspect: true`. The code reads
`preserveAspectRatio`.

**Does not count.**
- A file, directory, or route path. That is `stale-path`.
- A correct name with a wrong value, default, or effect. That is `false-behavior`.
- A name in an illustrative placeholder the reader is meant to replace.

### `stale-path` (token)

**Definition.** A file path, directory, route, or URL path the reader must open, create, edit,
or visit is replaced with one that does not exist in the export or points somewhere else. The
planted path is plausibly an old or neighboring location. Neither the original path nor the
planted path is on the job's absent list, or under a directory on it.

**Example.** A page says to add the custom filter to `filters/index.js`. The library loads
filters from `src/resample/filters.js`, and no `filters/` directory exists.

**Does not count.**
- A path on or under the job's absent list. A reader cannot tell it from a file that is absent
  by design.
- A non-path identifier. That is `wrong-name`.
- A path inside an illustrative example the reader does not act on.
