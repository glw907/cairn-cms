# Why the design language is enforced

Cairn's admin has a design language, and the engine enforces it rather than documenting it
and hoping. The reason is something I kept observing while building admin screens with AI
coding agents. On a member-organization site I build for, three separate agent sessions
built admin screens, none of them aware of the others.

Where the design language existed as written contract, the screens came back matching.
Color roles, an 11px label recipe, and a shared header-cell token were all written down
somewhere a session could read them, so labels agreed and tables looked related. Where the
language existed only as rendered precedent, every session invented its own answer. The
same screens arrived with seven unrelated type sizes, a primary action buried mid-page,
and sibling screens that disagreed about their own anatomy.

An agent composes from what is legible at build time. Component defaults, tokens, written
rules, and checkable gates are all things it can read while it works. A rendered screen is
not. A human designer absorbs a design language by looking at finished work; an agent
mostly cannot, and it fills the gap with invention that looks reasonable in isolation and
wrong next to its neighbors. If the coherence of your admin depends on information that
only exists in pixels, every new screen is a fresh guess.

So cairn moves the language into forms an agent, or a developer in a hurry, can actually
consume. The type scale and spacing rhythm are tokens with named roles. The toolkit
components carry measured norms, generated from the components themselves into a manifest
you can query. The standard itself ships in the package as a loadable skill, short enough
to hold in working memory. Its reference material carries what does not need to load every
time: two annotated exemplar screens, a form-anatomy contract, a chapter on the craft
details that resist tokenization, and a ladder for deriving a component the toolkit does
not have. `cairn-audit` sits under all of it, checking markup statically and rendered
screens in both themes, and cairn's own admin passes the audit's error tier, the findings
that fail a build, on the same terms it asks of yours.

There are limits. Composition cannot be linted. Whether a screen hangs together is a
judgment, and cairn's compositional rules ship advisory for that reason: they report and
never fail a build. The mechanical rules are not automatically safer. One of them, a
contrast check on chips, turned out to measure lightness with no term for hue, and on the
first consumer admin it ran against it raised 24 false errors out of 40; I demoted it to
advisory until the formula is repaired. So the mechanical layer polices vocabulary, and
coherence gets graded by reading the screen. The skill ships the grader prompt cairn uses
for that read, calibrated against screenshots whose verdicts were already known. And the
larger claim is still a bet. The first controlled trial of building a real feature against
the finished design language hasn't run yet; until then, treat the efficacy claim as
untested.

Enforcement does not free you from design. The next admin screen you build starts inside
the language rather than beside it, and the audit tells you when it drifts. The judgment
about what the screen should do for your organization is still yours to make.
