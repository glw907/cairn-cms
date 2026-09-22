## Charm-stack lens: adversarial review of the three mockup directions

All lipgloss symbols below verified with `go doc` against poplar's module cache (lipgloss v2.0.6); behavioural claims measured by running `cairnmock`.

### Findings, ranked

**1. SERIOUS — No row-level style; padding lives outside every styled span.**
`dir_board.go:64-81`, `dir_ledger.go:74-78`, `dir_brief.go:81-82`: rows are built as `Style.Render(pad(x, n))` fragments concatenated, so the pad characters carry no style. A selected row in the HUD needs a background or `Reverse(true)` spanning the full width (`bubbles/table.Styles.Selected`, and the spec's ruled selection channel); today it would paint striped gaps. **Change:** cell = `Style.Width(n).MaxWidth(n).Render(text)` (verified: `Style.Width` pads *inside* the block), row = `lipgloss.JoinHorizontal(lipgloss.Top, cells...)`, wrapped in one row style. This is the change that makes the 1.0 painter reusable as a HUD table cell renderer.

**2. SERIOUS — board has no wide-rung cap.** `dir_board.go:127` takes `w := in.Width` raw and never calls `place()`; ledger caps at 110 (`dir_ledger.go:16`) and brief at 96 (`dir_brief.go:103`). Measured: `-direction board -width 220` emits a 220-cell line. That is "stretched, not composed", against the family five-viewport standard and spec:492. **Change:** every direction ends in `place()` / `lipgloss.PlaceHorizontal(width, lipgloss.Center, body)` against a named max content width.

**3. SERIOUS — width rungs are magic numbers and two rungs are untested.** 110/96/19/15/45 inline across all three files; `width_test.go:47` sweeps 80/100/120/160 only — never the floor (60) or the wide rung (220) the addendum added. **Change (Task 20):** exported rung constants, a five-rung sweep, and a defined floor behaviour (one-line summary rather than a truncated board).

**4. SERIOUS — primitives hand-rolled where the library owns them.** `ledgerSites` (`dir_ledger.go:194-225`) and `boardSites` (`dir_board.go:273-306`) are exactly `lipgloss/v2/table` with `StyleFunc(row,col)` (verified) + `Headers` + `Width` + `Wrap(false)` + `BorderRow(false)`, which is the survey's own B.3 recommendation; `briefLogs`' `├─/└─` field lists (`dir_brief.go:297-304`) are `lipgloss/v2/tree` with a custom `Enumerator` (verified); brief's "4 healthy · …" (`dir_brief.go:148`) and the board legend's hand-written wrap loop (`dir_board.go:106-123`) are `lipgloss/v2/list`. `rule()` (`layout.go:30`) is a top-only `Border` + `Width`. Keeping `pad`/`clip` for the fixed status cells is correct — the column budget must stay cairn's — but the free-flowing surfaces should not hand-maintain wrapping the library already does.

**5. SERIOUS (HUD) — the frame is one flat `[]string` with header, body and footer fused.** `dir_ledger.go:87-111`, `dir_board.go:175-255`. The HUD scrolls the body in a `viewport` with a pinned header and a `bubbles/help` footer; with a flat frame the board's legend and remedy foot scroll away, and the HUD re-layers what `render` already laid out. **Change:** `render` returns sections (`Header/Body/Footer []string`), with `Frame.Lines` as the CLI join. Biggest inheritance item, and invisible in the PNGs.

**6. POLISH→SERIOUS — light/dark and profile re-invented.** `palette.go:39-92` uses two maps plus a `switch` where `lipgloss.LightDark(dark)` and `lipgloss.Complete(profile)` are the documented seams (both verified). The three-value enum names no ANSI256 rung, so a 256-colour terminal receives 24-bit SGR; `main.go:77-85` maps TrueColor→TrueColor, so the `colorprofile.Writer` safety net converts nothing. Keep the named ANSI-16 slots (correct, poplar-measured) but express them through `Complete` so ANSI256 is nameable. Verified good: `-profile none` piped emits **zero** escape bytes.

**7. POLISH — OSC 8 entirely unused.** Remedy anchors are literal text (`dir_brief.go:90`, `dir_ledger.go:126`) and the build id `(3f0ba18)` is inert. `Style.Hyperlink(link, params...)` verified.

**8. POLISH — `UnderlineStyle(UnderlineCurly)` + `UnderlineColor` unused** (verified). Zero columns, degrades to plain underline then nothing; the failing check's reason is the place.

**9. POLISH — the ASCII spark ramp collapses 8 levels to 5** (`palette.go:143`: `.` `.` `-` `-` `=` `=`); the parity test checks width only (`width_test.go:79`). Worse, **no sparkline appears in any of the 27 PNGs** — the device is unreviewed. Fixture it or cut it.

**10. POLISH — hue budget.** `RoleStale` shares `#f7ac4d` with `RoleUnknown` (`palette.go:42`), spending the alarm hue on freshness, against the skill's two-hue rule. `lipgloss.Blend1D` from muted→stale fixes it with no new hue.

### Verdict

**Hybrid, board-led.** Board's site row × fixed nine-cell strip *is* a `bubbles/table`: rows, fixed `Column.Width`, `SelectedRow()` → detail, the stacked two-letter header as `Headers`, the "do these, worst first" foot as the detail pane's seed. Brief is the **detail screen** unchanged — its gutter groups are the per-severity sections and its inline remedy is the action, and the gutter survives ANSI-16 and no-colour intact (confirmed in the nocolor-ascii capture). Ledger contributes one device, the `insetRule` section header, which should be the section grammar everywhere. Ledger's whole-screen form is the part thrown away: at fleet scale it is board's foot with more scrolling, and it has no cursor affordance to become.

### Five most valuable unused capabilities

1. **`Style.Hyperlink` (OSC 8)** on remedy anchors and build ids — cost: one call site. Degradation: inert text; stripped at NoTTY.
2. **`lipgloss/v2/table` + `StyleFunc`** for the two registry surfaces — cost: one refactor each, widths stay cairn's via fixed `Width`. Degradation: none (string out).
3. **`tea.View.ProgressBar` (OSC 9;4) + `WindowTitle`**, with `ansi.SetProgressBar` for the 1.0 sweep — cost: two frame fields. Degradation: silently ignored.
4. **`viewport.SetHighlights`/`HighlightNext`/`EnsureVisible`** for find-in-log, with `lipgloss.StyleRanges` as the 1.0 precursor — cost: a keymap plus a matcher. Degradation: 1.0 prints unhighlighted.
5. **`UnderlineCurly` + `UnderlineColor`** — cost: one style. Degradation: plain underline → nothing.

### Task 20 should ship
`render/palette.go` with the existing `Theme{Dark, Profile, Glyphs}` shape plus `Style(role)`, `Sized(role,w)` and a row constructor so no caller chains raw setters; the `GlyphSet` + parity test as written, extended to assert ramp *distinctness* not just width; named five-rung constants with the sweep; a sectioned `Frame`; per-profile colour through `Complete`; and `colorprofile.Writer` confined to the command layer.

*Unverified:* I did not build against `bubbles/v2` to confirm `table.Styles.Selected` field naming, and `lipgloss/v2/tree`'s degradation under a custom ASCII enumerator is asserted from the API, not run.
