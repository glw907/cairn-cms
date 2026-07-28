# Grammar-token deviations ledger (design infrastructure Pass 1)

**What this is.** Every admin call site whose current type or spacing value matches no grammar role,
recorded as measured. It is a catalog, not a to-do list. Pass 1's contract is pixel identity, so
nothing here was changed: where a value did not match a role, the value stayed and the call site
stayed unmigrated. An entry leaves this file only when a ratified design decision resolves it, which
means either the scale grows to admit the value or the call site moves onto an existing role
deliberately, with the visual baselines regenerated to match.

Pass 2 calibrates its audit rules against this ledger, and the Pass 3 standard reads it for what the
ruled scale does not yet cover. Counts are from `src/lib/components` and `src/lib/admin-toolkit` at
commit `ddf0afbd`, matched as class tokens with word boundaries rather than as raw substrings. That
distinction is load-bearing: a naive grep for `text-base` also catches DaisyUI's `text-base-content`
and `text-base-100` color utilities and overstates that row roughly fourfold, which a first draft of
this file did.

## The ruled scale, for reference

Type, after Pass 2 admitted the heading role: title 24px, heading 18px, subtitle 15px, body 14px,
meta 13px, label 11px, chip 10px. Each carries a paired leading token.
Spacing: label 4px, control 8px, group 16px, section 24px.

## Ratified rulings (2026-07-27, Pass 2 brainstorm)

Recorded canonically in the design spec's Amendments section
(`docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`, section 13).
Each type entry below now has a destination; the entries retire from this file when Pass 2's
normalization migration lands and the baselines regenerate.

- **Section 1 (12px):** no seventh step. The 120 sites resolve onto meta or label by
  relationship, per-site.
- **Section 2 (named steps):** the type roles gain a ruled leading (body 20px, title 32px,
  small roles measured in-pass) behind a `--tw-leading` override, so `text-sm` and
  `text-2xl` migrate pixel-identically. 16px and 18px resolve onto the new heading role
  below; 20px resolves or joins the exception list; 30px is a ratified exception.
- **Section 3 (one-offs):** the wordmark 22px sites and the EditPage 30px document title are
  ratified named exceptions. The 11.2px and 9.6px slips resolve onto label and chip. The
  17px and 18px one-offs resolve onto the heading role or subtitle at migration judgment.
- **New heading role:** the scale admits a seventh role between subtitle and title for
  dialog/panel headings, unifying the 16px-semibold and 18px-display-bold families. **Settled
  2026-07-28: 18px, weight 700, `--font-display` (Bricolage Grotesque), leading 28px.** The
  display-bold family wins, so its thirteen sites do not move; the 16px-semibold dialog family
  migrates onto the role and changes appearance by ruling. Evidence and reasoning are in the spec's
  section 13. `type-heading` carries size and leading only; the weight and the face stay a component
  recipe.
- **Section 4 (spacing) is not blocked and not ruled:** the audit's `gap-scale` rule targets
  off-scale literals, and named Tailwind steps resolve to the spacing scale, so these
  entries stay open vocabulary questions for Pass 3.

## Type sections 1 through 3: RESOLVED, retired 2026-07-28

Pass 2's normalization applied the ratified rulings and every type entry this file catalogued now
has a role or a ratified exception. The sections are collapsed to this note rather than kept as a
to-do list that reads as open.

What the ledger held, and where each entry went:

- **The 12px step, 119 sites** (recorded here as 120; one was prose inside a code comment). No
  seventh step was admitted. The sites resolved per-site onto `type-meta` (109) and `type-label`
  (10) by the relationship each expressed. Two rulings settled the cases a first pass split
  inconsistently: a control's own caption is meta, following `ListToolbar`, the toolkit's canonical
  segmented control; and a list-row value beside an action is meta, because a URL, slug, branch
  name, or file key is content rather than a label naming something else.
- **The named Tailwind steps, blocked on a line-height ruling.** The ruling landed: every role
  carries a paired leading token. `text-sm` (127 sites) and `text-2xl` (2) moved pixel-identically
  onto body and title, proven by comparing a full local render against a reference captured right
  after the leading landed. `text-base`, `text-lg`, `text-xl`, and `text-3xl` resolved onto the new
  heading role, onto subtitle, or onto the exception list.
- **The one-off literals.** The 11.2px and 9.6px slips resolved onto label and chip, as suspected.
  The 17px panel title joined the heading role. The three wordmark sites and the editor's document
  title became ratified exceptions with counted directives. The 18px editor prose surface became a
  fifth exception, newly ratified: the ledger had filed it as resolving onto subtitle, but reading
  the markup showed it is the editor's own canvas wrapper, whose 18px merely coincides with the
  heading role's.

Two lessons this file earned, both worth carrying:

**Counting is where this initiative keeps slipping.** Three separate miscounts, none in the row
data and all in a hand-tallied summary: the fourfold `text-base` overstatement this file's first
draft carried, the 120-versus-119 comment site, and a 19-versus-16 label tally during the
migration. The row-level work has been right every time. Trust the rows, recount the summary.

**A migration can break a surface it never touches.** Removing the last scanned `text-sm` stopped
Tailwind compiling that rule, and `src/lib/admin-fields`, a public export subpath, still used it
and had never been in the stylesheet's scan roots. It had ridden along on another directory's scan.
The fix was structural, not local: the directory joined both the scan roots and
`check:admin-css-classes`.

## 4. Spacing values with no role

The four spacing roles took the dominant value for each named relationship. The rest of the gap
distribution has no role, and unlike the type deviations these cannot be resolved by measurement
alone, because the same pixel value serves different relationships at different sites.

| Utility | Value | Count |
|---|---|---|
| `gap-3` | 12px | 72 |
| `gap-2.5` | 10px | 69 |
| `gap-1.5` | 6px | 60 |
| `gap-0.5` | 2px | 14 |

`gap-3` is the F3 scale's documented "an element that belongs to its neighbor", a fifth relationship
the ruled four do not name. The others are mostly inline icon-to-text pairs, which may be a
relationship worth naming rather than a set of deviations.

A related constraint, worth stating plainly: `gap-2` at 8px and `gap-1` at 4px carry both their role
relationship AND unrelated inline spacing. Only the sites that genuinely express the named
relationship were migrated. A blanket substitution would have been pixel-identical and semantically
wrong, and would have poisoned the vocabulary Pass 2's audit rule reads.

## 5. Structural findings

**Section rhythm is a margin, not a gap.** `--cairn-gap-section` was measured at 24px from the three
`gap-6` flex stacks, but the admin mostly expresses section separation as a margin: `mb-6` at 7
sites, `mb-10` at 3, `mb-8` at 1. The `gap-section` utility therefore has three real call sites. A
margin-role utility family, or a ruling that sections are always flex parents, would close this.

**The F3 comment's 32px zone separator has one call site.** The scale documented at the top of
`cairn-admin.css` calls 32px (`mb-8`) the separator between two zones. Measured, `mb-6` at 24px is
what the admin actually uses, 7 sites to 1. Either the doc or the surface is wrong.

**No indentation role exists.** The plan called for measured `--cairn-indent-*` roles. The only real
indent in the admin is `NavTree.svelte:139`, `margin-left: depth * 1.5rem`. ExpandableRow's panel
uses `padding: 1rem` on a full-width cell, which is padding, not indentation. One call site is below
the plan's two-site floor, so no indentation token was defined. It stays a candidate: a second
indented surface makes the role real.

**PageHeader's `meta` prop renders at 14px, one step off the meta role.** `PageHeader.svelte:60`
now writes `type-body text-muted` for the line the component itself calls meta, while the meta role
is 13px. Pass 2's normalization moved the class but deliberately did not rule the collision: the
swap was size-preserving, and whether the header's secondary line is body-sized on purpose or should
join the meta role is a relationship question, not a mechanical one. Still open, and still worth
ruling explicitly because of the name collision.
