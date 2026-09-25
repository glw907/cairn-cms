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
