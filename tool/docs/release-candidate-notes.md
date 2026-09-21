# Try the 1.0 release candidate

This is a one-page note for Geoff, before the `tool/v1.0.0` tag. Build it, point it at your own
sites, and look at six things.

## Build it

From this commit, in `tool/`:

```sh
make install
```

That builds `cairn`, generates its man pages, and installs both to `~/.local/bin/cairn` and
`~/.local/share/man/man1/`. `cairn --version` should print a `-dirty` suffix if your tree has
uncommitted changes, and none if it doesn't.

## Point it at your own registry

```sh
source ~/.local/secrets
cairn adopt list
```

Adopt the four production sites (`cairn adopt --worker <name>` for each one `adopt list` shows
you), then confirm the registry holds them:

```sh
cairn sites list --json
```

## Six things to look at

1. **The single-site body, at your own terminal width.** Run `cairn health <one site>` in your
   own terminal, not a captured frame. Does it read cleanly at the width your terminal actually
   is?
2. **The sweep's strip.** Run bare `cairn health` and read the summary strip and fix list across
   all four sites. Does the worst verdict jump out at a glance?
3. **The ASCII tier, through a pipe.** Run `cairn health | cat`. Does the fallback still read,
   with no broken glyphs?
4. **The JSON contract.** Run `cairn health --json | jq`. Does the shape make sense as something
   a script would consume?
5. **An error message.** Trigger one on purpose, for example `cairn health does-not-exist`. Does
   it say what's wrong and what to do next, without a Go stack trace or an internal identifier?
6. **`cairn help agents`.** Read it as if you were a program with no other documentation. Does it
   cover what you'd need to know before running a command?

Three offscreen frames from the overnight run may still be sitting in the session scratchpad
from before this candidate was built (a single-site body, the sweep's strip, and the log body).
They're a quick before-you-build preview, never a substitute for items 1 and 2 above: those two
ask for your own terminal, at your own width, because a captured frame can't show you that.

## What a "no" would mean

- **Item 1 or 2 reads badly**: the render needs another pass before the tag. Say so and it holds.
- **Item 3 breaks**: the ASCII fallback has a real bug; the tag waits on a fix.
- **Item 4 doesn't make sense as JSON**: the contract needs a rewrite before it's published and
  frozen; once tagged, this is a breaking change to fix.
- **Item 5 leaks something internal**: the error boundary has a gap; the tag waits on a fix.
- **Item 6 is missing something you'd need**: the agents page gets one more edit before the tag.

A "yes" on all six is what "go" for `tool/v1.0.0` means.
