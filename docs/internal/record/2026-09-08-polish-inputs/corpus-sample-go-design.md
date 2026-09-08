The main design question is whether to overload `time.Time` or to provide a separate API for
accessing the monotonic clock.

Most other systems provide separate APIs to read the wall clock and the monotonic clock, leaving
the developer to decide between them at each use, hopefully by applying the rule stated above:
"The wall clock is for telling time. The monotonic clock is for measuring time."

if a developer uses a wall clock to measure time, that program will work correctly, almost
always, except in the rare event of a clock reset. Providing two APIs that behave the same 99% of
the time makes it very easy (and likely) for a developer to write a program that fails only rarely
and not notice.

It gets worse. The program failures aren't random, like a race condition: they're caused by
external events, namely clock resets. The most common clock reset in a well-run production setting
is the leap second, which occurs simultaneously on all systems. When it does, all the copies of
the program across the entire distributed system fail simultaneously, defeating any redundancy the
system might have had.

So providing two APIs makes it very easy (and likely) for a developer to write programs that fail
only rarely, but typically all at the same time.

This proposal instead treats the monotonic clock not as a new concept for developers to learn but
instead as an implementation detail that can improve the accuracy of measuring time with the
existing API. Developers don't need to learn anything new, and the obvious code just works. The
implementation applies the rule; the developer doesn't have to think about it.

As noted earlier, a survey of existing Go usage (see Appendix below) suggests that about 30% of
calls to `time.Now` are used for measuring elapsed time and should use a monotonic clock. The same
survey shows that all of those calls are fixed by this proposal, with no change in the programs
themselves.

It is certainly simpler, in terms of implementation, to provide separate routines to read the wall
clock and the monotonic clock and leave proper usage to developers. The API in this proposal is a
bit more complex to specify and to implement but much simpler for developers to use.

## Source

Russ Cox, "Proposal: Monotonic Elapsed Time Measurements in Go", Go design document 12914, last
updated January 26, 2017. https://go.googlesource.com/proposal/+/master/design/12914-monotonic.md,
fetched 2026-09-08 from the golang/proposal mirror at
https://raw.githubusercontent.com/golang/proposal/master/design/12914-monotonic.md. The Go
project's documents carry the BSD 3-clause license with the Google copyright; this excerpt is
quoted for comparison and is unedited apart from rewrapping and the removal of one heading.

The excerpt is the document's "Rationale" section, its "Design" subsection in full followed by the
opening of its "Simplicity" subsection. The document's own heading spine, which the docs-standard
design spec derives its section order from, is: Abstract, Background, Proposal, Rationale,
Compatibility, Implementation, then an appendix.

A proposed corpus entry for the internal design-spec page type, not yet approved. Measure it with
`--until "## Source"`.
