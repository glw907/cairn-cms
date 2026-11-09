# Terminal view captures

The goldens beside this file pin each screen's text. The captures are photographs of the same
screens painted by a real kitty, so a reader can check the grounds, inks, and glyphs the text
cannot show. The PNG files are not committed; regenerate them with the command below.

## Regenerate

From `tool/`:

```sh
scripts/replay-shots.sh [OUTDIR]
SCREENS="welcome summary done" scripts/replay-shots.sh [OUTDIR]
```

The script compiles this package's test binary and runs its `TestReplay` once per capture under
`kitty-headless-shot`, with `CAIRN_REPLAY` naming the screen and `CAIRN_REPLAY_THEME` the ground.
It writes `NAME-COLS-THEME.png` and `.ansi` for each capture and `manifest.md`, one row per
capture with what it shows, into OUTDIR (a new temp dir when none is given). It exits non-zero
if any capture fails. Run `kitty-headless-shot setup` once on a new machine.

To put one screen on your own terminal, run the test binary directly, not `go test`, which pipes
its output:

```sh
go test -c -o /tmp/newview.test ./internal/ui/newview
CAIRN_REPLAY=list /tmp/newview.test -test.run '^TestReplay$' -test.count=1
CAIRN_REPLAY=summary CAIRN_REPLAY_THEME=light /tmp/newview.test -test.run '^TestReplay$' -test.count=1
```

The screen holds, frozen, until Ctrl+C. No spinner, clock, or countdown ticks, and keys and
resizes do not reach it.

## Screens, sizes, and themes

Every screen is captured on the dark and the light ground. `CAIRN_REPLAY=list` prints the same
table from the code, which is the source of truth.

| Screen | Sizes | Shows |
| --- | --- | --- |
| welcome | 80x24, 60x24 | The welcome screen with its Start and Quit footer. |
| welcome-ssh | 80x24, 60x24 | The stop a remote SSH session gets instead of the welcome screen. |
| questions-theme | 80x24, 60x24 | The theme question on a two-theme catalog. |
| questions-name | 80x24, 60x24 | The site name question with Field Notes typed. |
| questions-name-after-theme | 80x24, 60x24 | The site name question after the second theme was chosen. |
| questions-crawlers | 80x24, 60x24 | The AI-crawler question after the theme and the name. |
| browser-start | 80x24, 60x24 | The browser screen before the owner gives the go-ahead to open the tab. |
| browser-allow | 80x24, 60x24 | The browser screen waiting on the Cloudflare approval. |
| browser | 80x24, 60x24 | The browser screen waiting on the GitHub App, with Cloudflare marked done. |
| browser-no-launcher | 80x24, 60x24 | The browser screen after the launcher failed, beside the fallback link. |
| browser-late | 80x24, 60x24 | The browser screen on the install approval with the countdown at 4:12. |
| prereq-no-domain | 80x24, 60x24 | The prerequisite stop for a Cloudflare account with no domains. |
| choose-account | 80x24, 60x24 | The choice between two Cloudflare accounts. |
| choose-domain | 80x24, 60x24 | The choice between five domains. |
| choose-resume | 80x24, 60x24 | The choice to resume one of two unfinished setups or start a new site. |
| prereq-node-old | 80x24, 60x24 | The prerequisite stop for a Node.js older than 24. |
| summary | 80x24, 60x30 | The closed summary for Field Notes on a one-theme catalog. |
| summary-chosen | 80x30, 60x30 | The closed summary with a chosen domain, the second theme, and suffixed names. |
| summary-edit-email | 80x24, 60x24 | The summary with the sign-in email edit open. |
| summary-edit-address | 80x24, 60x24 | The summary with the address edit open. |
| summary-address-taken | 80x24, 60x24 | The summary reopened on the address with setup's refusal under it. |
| watch-start | 80x24, 60x24 | The watch with its first step running. |
| watch-mid | 80x24, 60x24 | The watch with five steps done and the sixth running, the clock at 5:12. |
| watch-sign-in | 80x24, 60x24 | The watch on its last step, the sign-in. |
| failure-deploy | 80x24, 60x24 | The four-part failure for the Workers Paid plan at the first deploy, under the watch. |
| failure-declined | 80x24, 60x24 | The failure for a declined Cloudflare approval, with no watch. |
| done | 80x24, 60x24 | The done screen after a used sign-in link and an emailed one. |
| done-open | 80x24, 60x24 | The done screen when the sign-in link was not used. |
| done-scripts-skipped | 80x24, 60x24 | The done screen with the skipped install scripts notice. |
| done-revoke-failed | 80x24, 60x24 | The done screen with the failed Cloudflare revoke notice. |
| done-both-notices | 80x24, 60x24 | The done screen with both notices. |
| stop-nothing | 80x24, 60x24 | The Ctrl+C line when nothing was created. |
| stop-kept | 80x24, 60x24 | The Ctrl+C line when the run kept what it made for a rerun. |
| summary-chosen-edit-email | 80x24, 60x24 | The suffixed summary with the sign-in email edit open, fitting 24 rows. |
| summary-chosen-edit-address | 80x24, 60x24 | The suffixed summary with the address edit open, fitting 24 rows. |
| summary-chosen-address-taken | 80x24, 60x24 | The suffixed summary reopened on a refused address, fitting 24 rows. |
| too-small | 49x24, 44x14 | The too-small screen in place of the summary in a window under 50 columns. |

The 30-row sizes are the heights the summary goldens render at, since the closed summary is
taller than 24 rows there. A capture at 60x24 would show the too-small screen instead.
