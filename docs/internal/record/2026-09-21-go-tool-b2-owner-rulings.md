# Owner rulings, Go tool Pass B2 (Geoff, 2026-09-21)

The rulings Geoff gave during the Go tool's 1.0 pass, taken one at a time across the day. This
is the record the plan's post-mortem and the ROADMAP refer to; the conductor ledgers and the
pass duties that carried them are done and are not reproduced here. The working file the
rulings were taken in was `~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md`.

## The owner list: twelve items the pass surfaced

The plan's "Outside the amendment, for the owner" section carries each item's full text. The
rulings:

1. **An engine condition registry carrying `actor` and `outward`: declined.** The tool's 1.0
   holds both fields in its own messages table. A second renderer needing the same vocabulary
   reopens it.
2. **A shipped `cairn-health` skill fragment in the npm package: deferred.** It would duplicate
   `cairn help agents` and need a drift test between them. The trigger that settles it: an agent
   harness that reads the npm package but cannot run the binary.
3. **`--cairn-cli-rule` in `cairn-admin.css`: declined.** No admin consumer of the token exists.
4. **The local e2e Chromium pin: already a ROADMAP chore.** Nothing new filed.
5. **A fifth per-check wire word ships**, reversing the 2026-09-20 four-word ruling. `skip` means
   not attempted, by configuration; `unknown` means attempted with nothing observed.
6. **A rate-limited run is UNKNOWN.** The copy catalogue's `WARNING, never CRITICAL` row stays
   overruled.
7. **A held failing check contributes WARNING**, and an expired hold returns the check to its own
   severity rather than a flat CRITICAL. The scheduler docs present the alert threshold as the
   operator's choice: exit 2 and above pages, any non-zero notifies.
8. **`--theme dark|light` ships in 1.0**, a pure flag. OSC 11 detection arrives later as
   `--theme auto` in a minor.
9. **`--quiet` prints nothing at all on a fully OK sweep**, and the normal strip otherwise.
   Single-site `--quiet` follows the same rule.
10. **The Windows CI leg suffices for the tag.** The release notes say Windows is CI-tested and
    not yet verified by a human in a terminal.
11. **The runner's gate-string comparison fix: landed** in the dotfiles at `75caf88`.
12. **The collective head word `tokens` is approved as it stands**, with the corrected fix line
    for more than one missing token.

## Custom Domains only (about 15:20)

cairn provisions Workers Custom Domains and never Workers Routes, so the tool's 1.0 discovers
Custom Domains only. `cairn adopt list` names each Worker with no Custom Domain in its own group
and says how to adopt it with explicit values. No route discovery unless a second real case
appears. Geoff: "We'll bring all the old sites into compliance as we upgrade." aksailingclub.org,
served by a route from before cairn, moves to a Custom Domain in its site-round upgrade. A model
cairn site is attached by a Custom Domain, and the upgrade checks it.

## The errors check counts cairn's own records (about 16:00)

The `errors` check counts only cairn's structured error records, identified by the log envelope's
`event` field, never every error line a Worker emits. A count the query truncated reads "at
least N".

## Copy

The 1.0 editorial gate had the owner's read, and nothing on copy is owed. The collective head
word `tokens` is ruled above. The two carried strings from segments 2 and 3 were read at the
same gate.

## Where the tool's docs live (about 12:15)

The cairn CLI is an assumed part of the system; it is packaged separately only because its
installation targets vary. All docs live on cairn.pub from a single source, so the tool's public
pages live under `docs/` with every other page: the exit-code and JSON contracts in
`docs/reference/`, credentials with `cairn auth check` and the scheduled run in `docs/admin/`.
1.0 ships with `tool/docs/` as the one interim copy. The draft-docs pass after the cut writes
the pages into `docs/` from the facts container and deletes the four public `tool/docs/`
originals; the ADRs and design inputs stay in `tool/`. A small `tool/v1.1.0` then repoints the
README, `cairn help`, and the fix-line links at cairn.pub. This supersedes the conductor's
earlier recommendation that `tool/docs/` stay as the binary's own reference.

## The go on the tag, the release, the timer, and the close (about 12:20)

Geoff gave the go for Task 22b (push `tool/v1.0.0`) and extended it to Task 23 (the release),
Task 24b (install and fire his systemd user timer), and Task 25 (close and merge B2 to `main`).
He ruled that release-candidate verification is the conductor's work, not his. The go granted no
scope and no ceiling beyond what he raised separately.

## 2.0 is provisioning, and the second site is the credential design test

The Go tool's 2.0 goal is provisioning. The second site a tool creates is the design test for
its credentials: a credential scheme that makes a second site easy is the requirement, which is
why the read tokens are account-scoped rather than confined to one zone or one repository. The
site template's home follows "easiest, most idiomatic, architecturally correct". The full
framing is
[`docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md`](../../superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md).

## The ceiling, raised six times

14M at launch, then 18, 20, 23, 25, 27, and 28.5M, each raise Geoff's own ("You can run over if
needed" at the 27M raise). Spend at the close was about 27.3M.
