# Carbon as a reference for cairn's borrowable patterns

Research survey, 2026-09-13, read-only against `main` at `a24bf4bb` and against carbondesignsystem.com. Nothing here is a
decision; Part 5b marks every default-change item as a recommendation for Geoff. Two scope notes. polish-11b-ii is in flight
on its own worktree and rewrites `examples/showcase/src/routes/admin/signups/`, so every citation of that file is `main`'s
pre-11b-ii state, the state the admin sweep graded. And Carbon's content track is three pages, not six:
`guidelines/content/general-guidelines/`, `.../error-messages/`, and `.../glossary/` all 404, so error-copy rules come from
the notification usage and common-actions pages.

## Parts 1 and 2: case by case

Carbon's rules with a URL, then cairn's answer with `file:line` and a verdict.

### Empty states
Carbon, https://carbondesignsystem.com/patterns/empty-states-pattern/

- Anatomy in order: optional image, title, body, optional primary action, optional secondary link. The title frames
  positively ("Start by adding data assets", not "You don't have any").
- A no-data empty state replaces the whole container, column headers and footer included, so a screen reader does not read
  header cells before the "no content" message.

cairn splits the two states explicitly. `EmptyState.svelte`'s doc comment forbids using it for filtered-to-zero, and
`ConceptList.svelte:363` renders it in place of the table entirely, Carbon's replace-the-container rule. Filtered-to-zero is
`AdminTable`'s `empty` snippet (`AdminTable.svelte:46-51`), rendered at `ConceptList.svelte:455-458` as "No posts match
"{query}"" beside a Clear search control. **Matches, and exceeds on the two-state split**, which Carbon describes without
enforcing. cairn has no error-management empty state.

### Notifications
Carbon, https://carbondesignsystem.com/patterns/notification-pattern/ and
https://carbondesignsystem.com/components/notification/usage/

- Toast slides in top right. With no action it may auto-dismiss after **5 seconds**; with an action it persists until
  dismissed. Never auto-dismiss a critical message (WCAG 2.2.4).
- Inline persists until dismissed or resolved, sits near the item it concerns or just above a form's submit row, and caps at
  2 lines. An actionable notification carries exactly one action in two words or fewer. A callout cannot be dismissed and
  carries no success or error status.
- One banner at a time; one modal at a time, only for something needing immediate attention. No jargon or status codes in
  the body ("503 Service Unavailable" is the named counterexample).

cairn ships no toast, no banner, and no panel. Every message is an inline `alert alert-*` block at the top of the content
column (`ConceptList.svelte:312-325`, `EditPage.svelte:1643-1703`, `CairnMediaLibrary.svelte:645-651`), with `role="alert"`
on the error faces; the `toast` family is safelisted for a consumer (`admin-css-safelist.ts:44-50`) with no guidance.
**Matches Carbon's own preference**, which reserves toast for time-sensitive messages and warns that an actionable
notification's focus trap is disruptive. **Falls short** on one thing: the success faces (`ConceptList.svelte:312`,
`CairnTidySettings.svelte:351`, `NavTree.svelte:138`) carry no role, so a successful save announces nothing.

### Dialogs and modals
Carbon, https://carbondesignsystem.com/patterns/dialog-pattern/ and
https://carbondesignsystem.com/components/modal/usage/

- Button order is universal: **Cancel is the outermost left button, the primary action the outermost right.** One primary
  action per dialog.
- Five variants: passive, transactional, danger (the primary swapped for a danger button), acknowledgment (one button),
  progress (Cancel, Previous, Next). If a button opened the modal, the title reuses that button's exact label.
- **Focus opens on the first input, or on the primary button when there is no input**, is trapped, and returns to the
  trigger on close.
- Dismissal by variant: passive allows the close X, an outside click, and Esc. Transactional and progress allow the primary
  action, Cancel, the X, and Esc, with **no outside click**.
- Validate on field blur; an invalid entry keeps the dialog open with inline error text. Never nest a modal, never
  substitute one for a page, and avoid accordions, tabs, and batch actions inside.

cairn builds every dialog on a native `<dialog>` opened with `showModal()`, so the trap, Esc, and inert background come from
the platform. Button order matches (`DeleteDialog.svelte:107-108` is Cancel then a filled `btn-error`, and
`form-anatomy.md`'s submission row states the pair normatively), and the media safe- delete **exceeds** Carbon with
`role="alertdialog"`, no light dismiss, and a type-the-slug confirmation. **Falls short in two places.**
`DeleteDialog.svelte:112-114` keeps a `method="dialog"` backdrop, so a stray backdrop click dismisses a destructive confirm,
which the design system's own safe-delete recipe forbids. And no cairn dialog sets initial focus deliberately: `showModal()`
focuses the first focusable descendant, the close X at `:75`, clearing Carbon's never-the-danger-button rule by accident
while putting a transactional dialog's focus on its X rather than its first field.

### Forms
Carbon, https://carbondesignsystem.com/patterns/forms-pattern/

- Anatomy order: labels, text inputs, data inputs, help, buttons. Labels are sentence case, one to three words, no trailing
  colon, top-aligned.
- **Mark the minority.** If most fields are required, tag only the optional ones "(optional)". If most are optional, tag
  only the required ones. Never mark both.
- Buttons go at the bottom, after the last input, labeled verb plus noun. Move from radio buttons or checkboxes to a select
  past five options. Single column by default.
- **Client-side validation fires on field blur**, and the message states what happened plus the fix. Server errors render as
  an inline notification plus per-field inline errors.
- Disable the primary button on submit to prevent a duplicate. Disable it until valid only on a short form. A dialog form
  holds fewer than five inputs; more moves to a side panel.

`form-anatomy.md` covers the three-level label register, the four gap roles, the composition-width rule, and the submission
row. It covers none of Carbon's validation, required-marking, or error-placement rules. In code,
`ComponentForm.svelte:226-234` gets timing right and better than Carbon states it: a required-empty error shows only after
the field is touched, pattern and validate errors surface on submit, and the marker is an asterisk plus `aria-required`
(`:277`, `:296`). The frontmatter fields in `FieldInput.svelte` do the opposite: native `required` with no visible marker
(`:218,237,247,264,324,376`), help text below via `aria- describedby`, and no inline error line, leaving the browser's
native bubble as the whole error surface. **Falls short on two counts.** The admin runs two required-field and validation
idioms, and neither follows mark-the-minority. cairn's always-right button alignment diverges from Carbon's in-page rule,
but that is a ratified design choice.

### Loading and skeletons
Carbon, https://carbondesignsystem.com/patterns/loading-pattern/ and
https://carbondesignsystem.com/components/loading/usage/

- Show a loading indicator only when the expected wait exceeds **3 seconds**, never two at once.
- Progressive loading: structure first, data later; "Load more" extends a list in batches.
- Skeletons are for container and data components (tiles, lists, tables, cards). Never for a toast, an overflow menu, a
  dropdown item, a modal shell, or a loader itself.

cairn is server-rendered, so a list arrives complete and there is nothing to skeleton. The in-flight idiom is a spinner
inside the button with a present-participle label (`EditPage.svelte:1601,1606`, `ConceptList.svelte:510`,
`ShareLinkPanel.svelte:194`), Carbon's small inline indicator exactly, with native `disabled` as the ratified busy idiom
recorded by polish-11b-i. The media library uses a managed "Load more" with a persistent `role="status"` region reading
"Showing N of M" (`CairnMediaLibrary.svelte:941-945`), never infinite scroll. **Matches, and exceeds on the announced Load
more.** The 3-second threshold is a rule cairn has never written.

### Data tables
Carbon, https://carbondesignsystem.com/components/data-table/usage/

- Sorting has three states; unsorted shows its icon on hover only. Row selection is checkbox multi-select, with a
  three-state header box.
- **Selecting a row opens a batch action bar at the top of the table.** While it is open, per-row action icons and overflow
  menus are disabled. The user exits through a Cancel at the bar's far right, or by deselecting everything.
- The toolbar holds global actions and **caps at five**. Pagination sits at the bottom, stacked directly below with no
  padding gap, never above.
- Per-row actions use an overflow menu, but **fewer than three actions means inline icon buttons instead**. The expand icon
  sits left of the selection checkbox. Use skeletons, not spinners.

`AdminTable.svelte` is a shell: density tiers, optional zebra, an empty slot, caller-authored header and body snippets.
Sorting is caller-side and correct (`ConceptList.svelte:370,383`: real buttons in `<th>` with live `aria-sort` and
`scope="col"`), `Pagination` mounts below the table (`ConceptList.svelte:465`), and `ExpandableRow` handles expansion on a
real button. **Falls short on three things.** `AdminTable.svelte:60` renders a bare `<table>` with no accessible-name prop.
The toolkit ships no row selection and no batch- action bar: the doc comment calls a leading checkbox column "a reserved
convention, not a built feature," while `CairnMediaLibrary` has already built the whole pattern (a multi-select set, a
sticky bar with a live count, Select all in view, Clear, and a reversible bulk Delete,
`CairnMediaLibrary.svelte:10-16,909-929`). And no rule states when row actions should be a menu versus inline icon buttons.

### Disclosure and accordion
Carbon, https://carbondesignsystem.com/patterns/disclosures-pattern/ and
https://carbondesignsystem.com/components/accordion/usage/

- **Only one disclosure open at a time** on a page, and never nested; a sideways submenu is the one exception. Never put
  critical information or required input behind one; use a modal.
- A filter menu includes a Cancel and Apply pair when live filtering is not feasible.
- Accordion panels all start collapsed and expand independently. The chevron sits at the end of the header by default; a
  start-side icon must stay consistent page-wide.

`ToolbarDisclosure.svelte` owns the trigger's `aria-expanded` and `aria-controls`, focus-into-panel, Esc plus focus return,
outside pointerdown, and focus-leaves-the-boundary. `ListToolbar` enforces single-open through `openFacetId`, Carbon's rule
implemented as a mechanism rather than a guideline, and `ExpandableRow.svelte:117-128` is a real button with no bespoke
keydown handler. **Matches, and exceeds on single-open enforcement.** Chevron placement is the one rule cairn has no
position on, and every cairn facet applies instantly with no Apply.

### Status indicators
Carbon, https://carbondesignsystem.com/patterns/status-indicator-pattern/

- **At least three of {symbol, shape, color, type}.** Never color alone. Minimum 3:1 contrast against the background and
  between different statuses.
- Consolidating several statuses into one uses the highest-attention color.
- **Avoid more than five or six status indicators on one interface**; past that, use plain text.

`StatusChip.svelte` carries three registers (`quiet`, `warning`, `outline`), each measured against its own row ground, with
the label text as the distinguishing signal (`ConceptList.svelte:423-430`). That is type plus color plus shape, so Carbon's
three-of-four floor is met without an icon. The tinted fill sits in a deliberate 1.16 to 1.47:1 band, below Carbon's 3:1,
which cairn ratified and measured; Carbon's 3:1 governs the indicator's own legibility, and cairn's chip carries legibility
in the label, which clears 4.5:1. The second chip vocabulary at `EditPage.svelte:836-840` (sweep finding 8) was converged by
polish-11b-i Task 7. **Matches.** The six-indicator cap and the consolidated-status rule are numbers cairn has never written
down.

### Search
Carbon, https://carbondesignsystem.com/patterns/search-pattern/ and
https://carbondesignsystem.com/components/search/usage/

- Three types: basic (routes to a results page), active (runs per keystroke, results inline, no Search button), focused
  (active search scoped to the session).
- **Never add a label to a search field.** The magnifying glass plus placeholder is enough.
- **Always show the result count**, zero included, and per-scope counts when a scope selector exists. A zero-result state
  always suggests a follow-up. Never a dead end.
- Enter runs the search. **Esc clears the field.** The close X appears once text is entered and becomes the next tab stop.
  Default size is medium, 40px.

cairn's search sits in `ListToolbar.svelte:271-280`: a `type="search"` input with a leading icon, an `aria- label`, and a
`role="status" aria-live="polite"` count line at `:416` naming the applied filter scope; the zero-result state names the
query and offers Clear search (`ConceptList.svelte:455-456`). **Exceeds on the count line**, which is live-announced and
scope-aware. **Falls short on three small things.** `:275-276` uses one string as both `aria-label` and `placeholder`, so a
screen reader hears the name twice. `:453` strips the browser's native clear button with no replacement, so Carbon's close-X
tab stop and its Esc clear have no counterpart. The wrapper carries no `role="search"`.

### Filtering
Carbon, https://carbondesignsystem.com/patterns/filtering/

- **Multiple filter categories must never live inside a menu or dropdown.** Put them down the left side or across the top.
- If filters live behind a hidden drawer, the closed state must show the count of active filters and a way to clear them
  without reopening.
- **Every category needs its own clear-all, and a multi-category screen needs one control that clears everything at once.**

`ListToolbar` promotes filters into the band by default with an overflow disclosure for the rest. An applied `'menu'` facet
shows its value in-control ("Standing: Overdue") with its own sibling clear affordance (`ListToolbar.svelte:320-330`), each
option list is a real `role="menu"` of `role="menuitemradio"` options, and the count line always states its filter scope
(`list-toolbar.ts:106-108`). **Matches on the closed-state indicator and the per-category clear. Falls short on the
cross-category clear:** there is none in `ListToolbar` or `list-toolbar.ts`, so three applied facets take three clicks to
reset. Carbon's never-in-a- dropdown rule sits in tension with the overflow disclosure, though promoting by default keeps
the common case open.

### Overflow menus
Carbon, https://carbondesignsystem.com/components/overflow-menu/usage/

- Use one when actions exist but space is constrained, such as per-row table actions.
- **A destructive action goes below a divider**, separated from the primary set.
- **Fewer than three options means inline icon buttons instead.**

cairn's one overflow menu is EditPage's "More actions" (`EditPage.svelte:1487-1517`), built on the Popover API with a
mirrored `aria-expanded`, the ratified recipe over DaisyUI's focus-driven `.dropdown`. It holds History, Discard changes,
and Delete; Delete is last but carries no divider. `ConceptList`'s rows use a single inline Delete, the fewer-than-three
rule applied. **Matches on placement and on the fewer-than-three rule. Falls short on the destructive divider**, which cairn
has never stated and the one menu that would use it does not have.

### Page headers

Carbon publishes no page-header or dashboard pattern; `patterns/dashboard-pattern/` 404s. The nearest rules come from
data-table usage and the 2x grid: give the primary data block the most horizontal width, and prefer progressive loading for
a multi-source dashboard. `PageHeader.svelte` is already a full contract: an optional eyebrow, exactly one display-face
`h1`, an optional `type-meta` count line, and one action snippet top right, with `text-wrap: balance` on the title.
`cairn-audit`'s `screen-anatomy` checks the negative half mechanically, and `skills/cairn-admin-screens/SKILL.md` states the
affirmative half. **cairn's own answer stands. There is nothing to reference.**

## Part 3: content guidance

Carbon, https://carbondesignsystem.com/guidelines/content/writing-style/ and
https://carbondesignsystem.com/guidelines/content/action-labels/

- Sentence case is the default for every UI text element. Title case is banned outright ("Do not use title case
  capitalization"); all caps is banned. `OK` is always two uppercase letters.
- Second person as often as possible. Contractions encouraged. Simple present tense. Active voice unless the true subject is
  the system.
- **Avoid "please" and "thank you" in a UI.** Use "please" only when the user is genuinely inconvenienced. One exclamation
  mark per context, positive only.
- "Can" is ability, "may" is permission, "might" is possibility. Prefer "might".
- Action labels are verb plus noun, except the common actions that stand alone: Done, Close, Cancel, Add, Delete. Prefer a
  specific label over OK whenever one exists.
- The verb glossary is closed and each verb has one meaning: Log in and Log out never Sign in and Sign out, Sign up never
  Register, Start never Launch, Back never Previous, Move to trash for a recoverable delete and Delete only for a permanent
  one, Apply saves without closing, Reset reverts to the last Apply.

Error copy, https://carbondesignsystem.com/components/notification/usage/ and
https://carbondesignsystem.com/patterns/common-actions/

- The title states what stopped or cannot be done, with no terminal period.
- The body is one or two sentences, never paraphrases the title, and carries the user action, which IBM Style makes
  mandatory for an error. An action label inside it is one or two words.
- Length caps: three paragraph lines on a page or large modal, two lines on a form error, two lines in a toast or inline
  notification. Past that, link out with "View more".
- Carbon publishes no empty-state copy page and no confirmation-wording page.

**cairn today.** The admin's UI copy is governed by `admin-design-system.md:1168-1195` ("Voice") and gated by `check:prose`,
not by the docs-register editor arm. The Microsoft standard in `docs-register.md:224-247` grades `docs/editors/**` prose, a
different surface, so a Carbon versus Microsoft conflict lands on two documents, never on one string. `node
scripts/checks/check-admin-prose.mjs --list` confirms the practice: sentence case throughout, verb plus noun where the noun
disambiguates ("Publish site", "Delete this post", "Clear search", "Revoke all links") and bare where Carbon allows it,
contractions in use ("This didn't work"), second person, no "please" anywhere, no exclamation marks, error titles with no
terminal period, and bodies carrying the user action. cairn's bar is stricter than Carbon's on two counts Carbon does not
address: no em dash, and no tacked-on closer.

**The three conflicts.** First, **sign in versus log in**. Carbon mandates "Log in" and "Log out" and names the reason
(visual confusion with "Sign up"). cairn ships "Sign out" (`CairnAdminShell.svelte:1094`), "Sign in to {site}"
(`LoginPage.svelte:139`), and "sign-in link" throughout. Microsoft prescribes the opposite of Carbon: "sign in" is
preferred, "log in" deprecated. cairn's editor docs grade under Microsoft, so taking Carbon's verb would split the admin's
buttons from the editor docs. **Keep cairn's "sign in,"** a genuine standards split rather than a cairn defect. Second,
**Move to trash**: every cairn delete is recoverable in git, and the media safe-delete says so, but there is no trash an
editor can open, so the label would promise a surface cairn does not ship. **cairn's own answer stands.** Third, **the
closed verb glossary**: Publish, Tidy, Stack, Include, and Revert are cairn's domain vocabulary, and Carbon's own
writing-style page asks each product to build its own terminology list, which cairn has.

Carbon adds three rules cairn's voice section does not state and could adopt verbatim: the no-"please" rule, the
can/may/might distinction, and the one-exclamation-mark rule. All three already hold in practice, so adopting them is a docs
change, not a copy change.

## Part 4: accessibility annotations against the sweep

The sweep is `docs/internal/record/2026-09-08-polish-inputs/admin-sweep.md` against `f3f24b9f`; polish-11b-i merged its
fixes at `0e833332`. Carbon's Accessibility tabs, one row each.

| Carbon component | Carbon's rule | cairn | Verdict |
| --- | --- | --- | --- |
| Data table | Sortable headers are Tab stops sorted with Space or Enter; `aria-sort`; the table carries `aria-label` | `ConceptList.svelte:370,383` real buttons in `<th>` with live `aria-sort` and `scope="col"` (sweep 22, closed by 11b-i); `AdminTable.svelte:60` has no name | Matches on sort, falls short on the table name |
| Modal | Focus: passive on the close X, confirmation on the primary, **destructive on Cancel**, transactional on the first input; never focus a link; Esc; trap; return | Native `showModal()`, so trap and Esc are free; no dialog sets initial focus deliberately | Matches by platform, falls short on deliberate focus |
| Notification | `alert`, `log`, or `status` when no action is needed, `alertdialog` when one is; a callout is not announced | `role="alert"` on every error face; no role on the success faces | Falls short on success |
| Tabs | One tab stop, Left/Right wrapping, `aria-selected` and roving `tabindex`, `aria-controls`; a manual tablist selects on Enter or Space | `EditorToolbar.svelte:429,283-289,222,226-233` implements the manual model exactly, plus a check glyph as a non-color cue | Exceeds |
| Combobox | `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` to a listbox; Space cannot select | `MediaPicker` is a full ARIA 1.2 combobox with two live regions; the command palette was the family's defector (sweep 4) and 11b-i Task 4 rebuilt it | Matches after 11b-i |
| Accordion | Real button with `aria-expanded` and `aria-controls`, Space or Enter, collapsed by default, grouped accordions in a `<ul>` | `ExpandableRow.svelte:117-128`; `ToolbarDisclosure` owns the disclosure mechanics | Matches |
| Toggle | `role="switch"` with `aria-checked`, on/off text `aria-hidden`, the label never changes with state, tick mark not color | cairn ships no switch on purpose; `CairnTidySettings` uses check-and-tint `aria-pressed` buttons and radiogroups, honoring both content rules | cairn's own answer stands |
| Tooltip | Appears on focus, dismissed with Esc, `role="tooltip"`, trigger named by `aria-labelledby` | Native `title` plus `aria-label` (`EditPage.svelte:1581,1848`, `StatusChip.svelte:101`); `cairn-btn-guarded` exists only to keep `title` alive under DaisyUI's `pointer-events: none` | Falls short (WCAG 1.4.13) |
| Pagination | Left-to-right tab order, Space or Enter, disabled at each end, names "Page", "Previous", "Next" | `Pagination.svelte:96-112` matches all of it, plus an `aria-live` range line at `:66` Carbon does not require | Exceeds, except the selected page |
| Search | `role="search"`, a non-visible label, Enter submits, Esc clears, the close X becomes the next tab stop | `ListToolbar.svelte:271-280,416`; no `role="search"`, label duplicated as placeholder, no clear control | Exceeds on the count, falls short on the rest |

The one sweep finding Carbon independently confirms is **finding 23**, still live in the tree: `Pagination.svelte:104-112`
conveys the current page through `aria-current="page"` and DaisyUI's `btn- active` fill alone, with no glyph. Carbon's
status-indicator floor and its selectable-tag state rules both say the same thing. Everything else the sweep called a
blocker or a warning is closed by polish-11b-i, except the signups exemplar's findings 9 through 13, which polish-11b-ii is
shipping now.

## Where cairn has no convention

Carbon publishes a rule and cairn has none. Carbon's rule is the default answer.

| Case | Carbon's rule as the default | Home |
| --- | --- | --- |
| When a wait earns an indicator | More than 3 seconds | Design system (busy section) |
| Batch actions on a table | Selection opens a bar at the top; per-row actions disable while it is open; Cancel at the far right | Toolkit contract (`AdminTable`) |
| Destructive item in an overflow menu | Below a divider, separated from the primary set | Design system (Popover recipe) |
| Toolbar action cap | Five, then an overflow menu | Toolkit contract (`ListToolbar`) |
| Row actions: menu or inline | Fewer than three actions means inline icon buttons | Toolkit contract (`AdminTable`) |
| Status indicators per screen | Five or six, then plain text; a consolidated status takes the highest-attention color | Design system (chip registers) |
| Required and optional marking | Mark the minority only, never both | Design system and `form-anatomy.md` |
| Validation timing | Client-side on blur; server errors as an inline notification plus per-field errors | `form-anatomy.md` |
| Disabling the submit | Disable on submit always; disable until valid only on a short form | Design system (busy section) |
| Cross-category clear | One control clearing every applied filter | Toolkit contract (`ListToolbar`) |
| Notification action label, error body length | One or two words; two lines inline, three on a page or large modal | Design system (Voice) |
| Toast, if a consumer builds one | 5 seconds with no action, persistent with one, never for a critical message | Extend recipe (classes are safelisted with no guidance) |
| Dialog size threshold | Fewer than five inputs in a dialog, more in a side panel | Extend recipe |
| Accordion chevron placement | End of the header by default, consistent page-wide | Design system |

## Component inventory

Carbon's component set against cairn's. "DaisyUI supplies it" means the class family is in cairn's admin CSS safelist and a
consumer composes it directly.

| Carbon | Status |
| --- | --- |
| Data table, Pagination, Tag, Search, Content switcher, Breadcrumb, UI shell, Form, Tile | **cairn ships it.** `AdminTable`, `ExpandableRow`, `Pagination`, `StatusChip`, `ListToolbar`'s search and segmented filter, the shell's breadcrumb (`CairnAdminShell.svelte:742`), `CairnAdminShell`, `FieldLabel` plus `form-anatomy.md`, the `card-shell card-shadow` recipe |
| Accordion, Button, Checkbox, Contained list, Date picker, Dropdown, Link, List, Loading, Menu, Number input, Popover, Progress bar, Radio button, Select, Slider, Structured list, Tabs, Text input, Toggle | **DaisyUI supplies it.** cairn adds the disclosure mechanics (`ToolbarDisclosure`) and the ratified Popover-API recipe on top, and deliberately declines the `.toggle` |
| Modal | **DaisyUI plus a gap.** Native `<dialog class="modal">` is the recipe, but the only shipped dialog is `DeleteDialog`, bound to cairn's own concept delete. A consumer writing a confirm has a recipe, no component |
| Overflow menu, Menu buttons | **Nothing supplies it.** The Popover-API recipe lives in `EditPage` and is not extracted. Common on any row-action screen |
| Inline loading | **Nothing supplies it.** The spinner-in-button idiom is copied by hand at five call sites |
| Notification (inline, toast, actionable, callout) | **DaisyUI supplies the class, nothing supplies the behavior.** `alert` is composed by hand at 20-plus sites; `toast` is safelisted with no guidance |
| Multiselect | **Nothing supplies it.** `FieldInput`'s closed-taxonomy checkbox group is engine-internal |
| Tooltip, Toggletip | **Nothing supplies it.** Native `title` is the whole answer today |
| File uploader | **Outside cairn's remit**, except for media, where `MediaPicker` and the media dialogs cover it |
| Tree view | **Outside cairn's remit** as a general component. `NavTree` exists and is nav-bound |
| Code snippet, Progress indicator (stepper), AI label | **Outside cairn's remit.** A stepper belongs to a site's own multi-step flow |

Toolkit-growth candidates, against the charter's leanness test (does it serve the admin frame, which is cairn's job).
**Batch actions on `AdminTable`: yes**, because the engine already built it in `CairnMediaLibrary`, the doc comment already
reserves the column, and reinvention is the failure the borrow work targets; this is graduation, not new design. **An
overflow-menu primitive: yes**, on the test the toolkit used for `ToolbarDisclosure`, since it is disclosure mechanics
rather than domain logic and a row- actions menu is the second real consumer. **A confirm-dialog primitive: probably**,
since it is the admin frame's own recipe and sweep finding 11 shows the exemplar teaching the opposite, with the risk that a
general confirm grows into a general modal DaisyUI already owns. **An accessible tooltip: only if** the WCAG 1.4.13 gap is
closed at the engine, which makes it a mechanic. **Inline loading, notifications, multiselect: no**, since each is a few
lines of DaisyUI plus one rule, so a recipe naming the class and the convention beats a component.

## Data visualization

cairn ships no charts and will not; a chart is site data in a site's domain. The question is only whether Carbon's guidance
is worth citing in a recipe. Carbon's portable rules (https://carbondesignsystem.com/data- visualization/chart-types/,
https://v10.carbondesignsystem.com/data-visualization/color-palettes/):

- The categorical palette is 14 colors **applied in the given sequence**, because the sequence is what guarantees contrast
  between neighboring categories. Picking freely destroys the property the palette was built for.
- **A sequential palette's direction flips with the theme.** On light, darkest is the largest value; on dark, lightest is.
  cairn's admin ships two themes, so this one bites directly.
- **A chart owes a tabular alternative** in its own overflow menu, as the accessible fallback.
- 3:1 contrast is the implied baseline; heat maps are explicitly exempted from it.

Chart keyboard interaction is still open upstream (carbon-charts#1534), and the legend, axis, tick, and zero-baseline
specifics live on JS-rendered pages that did not return retrievable text this pass.

**Carbon Charts itself is a non-adoption**, for three structural reasons. `@carbon/charts` renders only with its own
required stylesheet (carbon-charts#1460), and that stylesheet embeds `@font-face` rules force- loading IBM Plex Sans from
`fonts.gstatic.com` (carbon-charts#1168), so typography is not a seam. The palette overrides exist (`color.scale`,
`color.pairing`, `getFillColor`) but nothing reads DaisyUI's tokens and nothing reacts to a runtime `data-theme` swap, which
cairn's admin does. And it costs roughly 8.6 MB installed with D3 as an unpinned peer dependency (carbon-charts#1123), while
`@carbon/charts-svelte`'s Svelte 5 support is still behind the `@next` tag and needs Svelte 5.33 or later. It fails exactly
as the convention rule predicts: it is a competing design system shipped as a dependency, not a published standard a cairn
component conforms to. Alternatives for a Svelte 5, Tailwind 4, DaisyUI 5 admin screen: **LayerChart** (Svelte-native, D3
underneath, unstyled by default, so DaisyUI tokens go straight in; younger, fewer presets), **Unovis** (framework-agnostic
with a Svelte adapter, no bundled design system and no forced fonts; the developer owns more visual decisions), or
**Chart.js** through a thin wrapper (canvas, so colors and fonts are plain JS config with no stylesheet at all; lightest,
but canvas costs DOM inspectability and accessibility).

Against the workstation's own `dataviz` skill (a form heuristic, a color formula with a runnable validator, a brand-neutral
placeholder palette meant to be swapped for the host's, mark specs, interaction rules): that method fits cairn better,
because swapping the palette for DaisyUI's tokens is its intended use rather than a fight with a dependency. Carbon adds
three rules the method does not obviously carry, all worth folding in: apply a categorical palette in sequence, flip a
sequential palette's direction with the theme, and give every chart a tabular alternative.

## Part 5: verdicts

### 5a. The borrow inputs

| Case | Verdict | Why |
| --- | --- | --- |
| Empty states | cairn's own answer stands | The two-state split is sharper than Carbon's and already stated in `EmptyState`'s doc comment |
| Notifications, inline | Reference Carbon | cairn has behavior and no stated rules; the status matrix, length caps, and one-action rule are all missing |
| Notifications, toast | Reference Carbon | The classes ship with zero guidance; the 5-second and persist-with-action rules are the whole convention |
| Dialogs, button order | cairn's own answer stands | `form-anatomy.md`'s submission row already says Cancel then filled primary, right-aligned |
| Dialogs, focus and dismissal | Reference Carbon | The variant-by-variant focus table and the no-outside-click rule are rules cairn does not have |
| Forms, labels and spacing | cairn's own answer stands | The three-level register and four gap roles are cairn's own ratified ruling |
| Forms, required and validation | Reference Carbon | Mark-the-minority and validate-on-blur close a real gap, and cairn runs two idioms today |
| Loading and skeletons | cairn's own answer stands | SSR removes the skeleton case; take only the 3-second threshold |
| Data tables, sorting | cairn's own answer stands | `aria-sort` on real header buttons is already correct |
| Data tables, batch actions | Reference Carbon | The toolkit ships none, and Carbon's model is the shape `CairnMediaLibrary` already built |
| Data tables, pagination | cairn's own answer stands | `Pagination` exceeds Carbon except the selected-page cue, which is a defect not a convention |
| Disclosure and accordion | cairn's own answer stands | `ToolbarDisclosure` plus `openFacetId` enforces Carbon's rules as mechanism |
| Status indicators | cairn's stands, reference Carbon for two numbers | The register system is measured and ratified; take the six-indicator cap and the consolidated-status rule |
| Search | Reference Carbon | Never label, always count, Esc clears, close X as a tab stop; cairn has the count and none of the rest |
| Filtering | Reference Carbon | The cross-category clear and the closed-state count are both unbuilt |
| Overflow menus | Reference Carbon | Two cheap rules: the destructive divider and the fewer-than-three inline rule |
| Page headers | No convention needed | `PageHeader` plus `screen-anatomy` is stricter than anything Carbon publishes |
| Data visualization | Reference the guidance, not the library | Three portable rules; the library is a non-adoption |

### 5b. Recommendations for the admin's defaults

Ranked by user-facing cost. Recommendations for Geoff, not decisions.

1. **The current page is signalled by color alone.** Carbon: at least three of symbol, shape, color, and type, never color
   alone. cairn: `Pagination.svelte:104-112` uses `aria-current` plus DaisyUI's `btn-active` fill. Consequence: a low-vision
   or colorblind user cannot see which page they are on. Cost: a component change (one glyph). Already ROADMAP "Next", sweep
   finding 23.
2. **A destructive confirm can be dismissed by a stray backdrop click.** Carbon: a transactional or danger modal has no
   outside-click dismissal. cairn: `DeleteDialog.svelte:112-114` keeps a `method="dialog"` backdrop while the media
   safe-delete deliberately does not. Consequence: an accidental click loses a half-read confirm, and the family contradicts
   its own recipe. Cost: a component change (delete the backdrop form).
3. **Tooltips are native `title`.** Carbon: the tooltip appears on focus and dismisses on Esc. cairn: `title` everywhere,
   which never appears on keyboard focus in most browsers, cannot be dismissed, and never appears on touch. Consequence: a
   sighted keyboard user and every touch user lose the reason an action is unavailable. WCAG 1.4.13. Cost: a component
   change plus a design-system recipe, and it retires the `cairn-btn-guarded` workaround.
4. **Batch actions exist in one screen and nowhere else.** Carbon: selection opens a bar at the top and disables per-row
   actions. cairn: `CairnMediaLibrary` has the full pattern; `AdminTable` reserves the column and ships nothing.
   Consequence: every consumer screen needing multi-select reinvents it, the failure the borrow work exists to stop. Cost: a
   toolkit component change, graduating a built pattern.
5. **The table has no accessible name.** Carbon: the table carries `aria-label`, `aria-labelledby`, or `title`. cairn:
   `AdminTable.svelte:60` is a bare `<table>` on every screen. Consequence: a screen-reader user landing in the list hears
   "table" with no subject. Cost: one optional prop.

Below the top five, worth recording in the same shape: no cross-category clear in `ListToolbar`; the search `aria-label`
duplicated as its `placeholder`, with no clear control and no `role="search"`; success alerts with no `role="status"`; two
different required-field idioms between `ComponentForm` and `FieldInput`, neither following mark-the-minority; and the
missing destructive divider in the "More actions" menu.

### 5c. Explicit non-adoptions

- **Every visual decision.** Carbon's color, type (IBM Plex as a mandate), spacing scale, elevation, border, and radius stay
  out. cairn's Warm Stone tokens and the Bricolage plus Figtree pairing are ratified, measured, and Geoff's. DaisyUI owns
  the component look.
- **Carbon's components in every framework.** React, Web Components, and Carbon Components Svelte. DaisyUI 5 is the admin's
  component layer and the convention rule says leave it alone.
- **Carbon's grid** (the 2x grid, its gutter modes, its column counts). cairn composes with Tailwind 4. **Carbon's icon
  library.** cairn uses Lucide, recorded in the design system.
- **`@carbon/charts` and `@carbon/charts-svelte`**, for the three structural reasons above. Carbon's chart guidance is
  adoptable; its chart library is not.
- **The closed action-verb glossary as a whole.** Take the verb-plus-noun formula; leave the IBM-specific verb rulings (Log
  in, Move to trash, Start over Launch), which conflict with Microsoft and with cairn's domain vocabulary.
- **Carbon's in-page button alignment** (primary left on a full page). cairn's right-aligned submission row is ratified, and
  `one-filled-action` already enforces the part that matters.
