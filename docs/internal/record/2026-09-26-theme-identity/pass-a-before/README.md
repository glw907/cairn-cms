# Theme identity pass A, before-state (task 0, item 9)

Captured at commit `30d2372b5cc2910b371613a9f180e22f6e8d2152` (this worktree's head at
capture time; item 6's dispatch had touched only test and gate wiring, so this still renders
`main`'s admin). `npm run package` built the engine, `VITE_CAIRN_E2E=1 npm --prefix
examples/showcase run build` built the showcase, and `CAIRN_DEV_BACKEND=1 npm --prefix
examples/showcase run preview -- --port 4391` served it. The capturing script (a scratch
Playwright program, not committed) drove headless Chromium via Playwright 1.63.0.

## Page set

Every page `examples/showcase/e2e/admin-visual.spec.ts` captures, by distinct
route/interaction state (its own width-bar duplicates collapse to the two widths below), plus
three item-9 additions: the signups delete dialog, `/admin/help`, and the media library's
bottom sheet at 390.

| File prefix | Route | State |
| --- | --- | --- |
| `admin-office` | `/admin/posts` | resting office shell |
| `admin-vocabulary` | `/admin/vocabulary` | resting |
| `admin-login` | `/admin/login` | resting (public) |
| `admin-confirm` | `/admin/auth/confirm?token=preview-token` | resting (public) |
| `admin-editors` | `/admin/editors` | resting |
| `admin-edit-page` | `/admin/posts/2026-06-hello` | resting, `.cm-content` masked |
| `admin-media-library` | `/admin/media` | resting grid |
| `admin-media-detail` | `/admin/media` | detail panel open (slide-over at 1440, bottom sheet at 390) |
| `admin-signups` | `/admin/signups` | resting (dev seed carries no rows; empty table) |
| `admin-edit-zen` | `/admin/posts/2026-06-hello` | zen mode toggled on |
| `admin-drawer-overlay` | `/admin/posts` | nav drawer opened as overlay where the opener is visible |
| `admin-sidebar-persistent` | `/admin/posts` | resting, `.drawer-side` presence check |
| `admin-delete-dialog` | `/admin/posts/2026-06-hello` | More actions -> Delete -> alertdialog open |
| `admin-command-palette` | `/admin/posts` | command palette dialog open |
| `admin-media-selected` | `/admin/media` | one tile's checkbox checked, Selection actions bar open |
| `admin-signups-delete-dialog` | `/admin/signups` | delete dialog open (item 9) |
| `admin-help` | `/admin/help` | resting (item 9) |
| `admin-media-bottom-sheet` | `/admin/media` | detail panel open at 390, the mobile bottom-sheet treatment (item 9, 390 only) |

## Widths and themes

1440 and 390, light and dark, for every page above except `admin-media-bottom-sheet`, which is
390 only (the plan names it as the bottom-sheet capture, a state that only exists below the
narrow breakpoint). 70 PNGs total: 17 pages x 2 widths x 2 themes, minus the 2 (1440 light/dark)
`admin-media-bottom-sheet` never captures, since its own row is 390-only. File names:
`<page>-<theme>-<width>.png`.

## Failure and its resolution

The dev backend seeds no `signups` row, so `admin-signups-delete-dialog` initially had no
Delete button to open. The capturing script filled and submitted the page's own "Add" form
(name "Before-state capture", email `before-state-capture@example.invalid`) through the same
public `?/create` action a real submission would use, then opened the delete dialog on that
seeded row. This is data seeding through the page's own documented action, not a code change.
No other capture failed.

## `cairn-audit --rendered`, two runs

Run from `examples/showcase` with `BASE_URL=http://127.0.0.1:4391`. Both runs exit 1 (findings
present, as expected for an unmodified baseline).

| Run | files scanned | rules run | errors | advisories | suppressed |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 | 17 | 144 | 204 | 135 |
| 2 | 6 | 17 | 129 | 204 | 135 |

The error-count variance (144 vs. 129) is `viewport-overflow` alone (confirmed by diffing the
two runs' sorted output); the STATUS-carried watch already notes this rule's own run-to-run
variance. The seven rules item 9 asks to track are identical in finding count, and identical by
finding identity, across both runs:

| Rule | Findings (both runs) |
| --- | --- |
| `weight-budget` | 4 |
| `norms-bands` | 0 |
| `touch-targets` | 0 |
| `focus-renders` | 0 |
| `interactive-contrast` | 0 |
| `border-contrast` | 238 |
| `chip-ground-collision` | 50 |

`border-contrast`'s two runs differ in one finding's *reported contrast value* (1.11 vs. 1.15 on
the same `/admin/media` drawer-nav right border), not in which findings exist; every other
`border-contrast` line matches by page, theme, state, and selector across both runs.

`weight-budget`'s four findings: `/admin/login` (both themes) reports "renders no `<main>`
landmark and no open dialog layer" (advisory, no content region to measure), and
`/admin/media` (both themes) reports 3 distinct font-weights against the rule's 2-weight budget
(400, 600, 500) on the page heading region.

`chip-ground-collision`'s 50 findings are all the advisory "could not measure this element's
ground" shape (a chip painting its own background-image over no solid color), spread across the
office, vocabulary, editors, media, and signups pages in both themes.

## Server

Started with `CAIRN_DEV_BACKEND=1 npm --prefix examples/showcase run preview -- --port 4391
--host 127.0.0.1`; its listener's cwd resolved to this worktree's `examples/showcase`, confirming
it served this worktree's build, not another checkout's. Stopped after both audit runs and all
captures; `ss -ltnp 'sport = :4391'` confirmed nothing listening afterward.
