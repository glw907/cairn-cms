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

Type: title 24px, subtitle 15px, body 14px, meta 13px, label 11px, chip 10px.
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
  dialog/panel headings, unifying the 16px-semibold and 18px-display-bold families; size and
  recipe settled in-pass from side-by-side rendered candidates.
- **Section 4 (spacing) is not blocked and not ruled:** the audit's `gap-scale` rule targets
  off-scale literals, and named Tailwind steps resolve to the spacing scale, so these
  entries stay open vocabulary questions for Pass 3.

## 1. The 12px step: in live use, absent from the scale

The largest single finding. 12px is the admin's most-used size with no role, spread across the whole
surface rather than isolated to one screen.

| Form | Count | Concentration |
|---|---|---|
| `text-xs` | 80 | EditPage 17, CairnTidySettings 13, CairnMediaLibrary 11, MediaHeroField 8 |
| `text-[0.75rem]` | 40 | CairnMediaLibrary 39, ShortcutsGrid 1 |

Nearest roles: meta (13px) above, label (11px) below. The question for Pass 2 or 3 is whether the
scale admits a seventh step or whether these 120 sites resolve upward and downward onto meta and
label. Rule it as design, not cleanup. 120 sites is not an accident, and both neighbors are one
pixel away, which is exactly the interval a six-role scale is supposed to make unnecessary.

## 2. Named Tailwind steps: blocked on a line-height ruling

These sites are not off-scale by accident. They are blocked by a mechanical coupling, and it is why
`type-title` ships with no markup call site at all. `type-body` is a different case: it migrated from
bracketed literals only, never from `text-sm`, so it has three live call sites in
`CairnMediaLibrary.svelte` and the 127 `text-sm` sites below are still owed to it.

In the compiled sheet a named step sets two properties:

```
.text-sm { font-size: var(--text-sm); line-height: var(--tw-leading, var(--text-sm--line-height)); }
.text-\[0\.8125rem\] { font-size: .8125rem; }
```

An arbitrary bracketed value sets font-size only, so a font-size-only role utility replaces it
pixel-identically. Replacing a named step with the same utility would drop that step's line-height
and change the rendered layout, which Pass 1's contract forbids.

| Utility | Size | Count | Role it would map to |
|---|---|---|---|
| `text-sm` | 14px | 127 | body |
| `text-base` | 16px | 19 | none |
| `text-2xl` | 24px | 2 | title |
| `text-lg` | 18px | 22 | none |
| `text-xl` | 20px | 6 | none |
| `text-3xl` | 30px | 1 | none |

Two separate rulings are owed. For `text-sm` and `text-2xl`, whether the role utilities carry a
ruled line-height per role, which would let 129 sites migrate and would make the type roles a
complete recipe rather than a size alone. For 16px, 18px, 20px, and 30px, the same
seventh-step question as section 1, one size at a time.

## 3. One-off literals

Seven sites across five values, three of them the brand wordmark at 22px.

| Site | Value | Nearest role |
|---|---|---|
| `CairnAdminShell.svelte:772` | 22px | title (24px) |
| `ConfirmPage.svelte:36` | 22px | title (24px) |
| `LoginPage.svelte:50` | 22px | title (24px) |
| `EditPage.svelte:1842` | 18px | subtitle (15px) |
| `CairnMediaLibrary.svelte:1769` | 17px | subtitle (15px) |
| `ComponentInsertDialog.svelte:368` | 11.2px | label (11px) |
| `CairnMediaLibrary.svelte:1982` | 9.6px | chip (10px) |

The three 22px sites are the brand wordmark, and they are deliberate: the K4 keming fix (design arc
2026-07-15) raised the wordmark from `text-xl font-bold tracking-[-0.01em]` because the rn pair
merged and "Cairn" read "Caim". `docs/internal/admin-design-system.md` documents the recipe. Treat
them as a ratified exception, not debt.

The 11.2px and 9.6px sites sit a fraction off a role they almost certainly meant. They are the two
entries in this file most likely to be simple slips.

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
uses `text-sm text-muted` for the line the component itself calls meta, while the meta role is 13px.
Both readings are defensible, that the header's secondary line is body-sized on purpose, or that it
should join the meta role, and the name collision makes it worth ruling explicitly.
