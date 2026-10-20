# Extend outline review: fold record

Target: `docs/internal/outlines/extend.json`, from `3ed692c5`. Reviews folded:
`2026-09-30-extend-outline-review-jobs.md` (OJ1-14), `-facts.md` (OF-1-12), and
`-exemplars.md` (OE1-6). Each finding was checked against the facts container, the captures,
the register, and the code before it was folded.

**Counts:** 32 findings. 31 folded, 4 of them adjusted after verification (OJ3, OJ12, OE1, OF-11).
1 split (OJ10): its key-rotation move is folded, and its kept-page grouping is refused in the
outline. No finding was refused whole.

## Jobs (OJ)

- **OJ1** folded. The define page's C6 becomes "Tag a concept", with `f:2p519o`, `f:shv6wv`, and
  `f:lbeeak` cross-listed. build-the-public-routes gains a tag-page bullet. turn-on-tidy C8 is
  trimmed to the tidy file and links the define page. Two cross-links are added: define to
  build-the-public-routes, and tidy to define.
- **OJ2** folded. The menu editor bullet moves to build-the-public-routes with `f:rnwver`,
  `f:rzfdqw`, and `f:2s8u70`. The sidebar keeps a one-line pointer and keeps `f:rnwver`, since
  that fact also carries the `navLayout` throw on a `nav` reference. The sidebar gains the
  outOfScope line. Both tidy links are retargeted to build-the-public-routes.
- **OJ3** folded, adjusted. The tutorial starts from `sv create --no-add-ons` with no Tailwind
  (`f:7e1t0j`), so importing `cairn-public.css` there would need Tailwind and daisyUI added as
  well. The import therefore lands on theme-your-public-site C1: add Tailwind and daisyUI, import
  the sheet after `tailwindcss`, and supply a theme block. Milestone 3 gets a one-clause pointer
  and `f:c4nnu9`. A tutorial-to-theme cross-link is added.
- **OJ4** folded. The site admin sheet's wiring is prepended to the custom-screen page's styling
  bullet, with `f:vs6k2k` and `f:666eg6`. Verified: the tutorial's facts carry no admin sheet, so
  the fix belongs on this page.
- **OJ5** folded. Security-model C8 now ends with a "Recovering whitelist semantics" subsection.
  restrict-admin-access gains the exhaustive-map bullet before its verify bullet. The
  security-model to restrict-admin-access cross-link the review assumed did not exist, so it is
  added. Rearm 11's action now records the decision.
- **OJ6** folded. The concept page keeps "refused before any commit". `f:dccnyu` and `f:7ak73t`
  move to the define page, whose permalink bullet now carries the token list.
- **OJ7** folded. Model content runs content-model, define, configure-rendering, link, reuse,
  configure-media, migrate. Orders are renumbered across the arm.
- **OJ8** folded. Four cross-links: scaffold to define, scaffold to build-the-public-routes,
  scaffold to `upgrade-cairn.md`, and tutorial to configure-media.
- **OJ9** folded, option (A) per ruling. The sign-in email stays the tutorial's closing section
  and is labeled as such. replace-magic-links links to the tutorial. The scaffold's link to the
  tutorial already existed, so its `why` absorbs the sign-in email instead of adding a duplicate
  pair.
- **OJ10** split. `rotate-the-github-app-key` moves to Operate, after debug-your-site. The
  kept-page grouping is refused in the outline: `kept` is a path list with no group field, and
  the plan's setup task writes the interim index with all three kept pages under Operate.
  Listing `choose-an-ai-posture` under Public site would be an edit to that setup task.
  **Unresolved, for the conductor.**
- **OJ11** folded. Architecture C8 is reworded, and C4 names `BackendProvider`'s reference entry.
- **OJ12** folded, corrected. C15 now points at the audit page. C14 and `f:ppqu4v` move to
  architecture C2. The review's wording was inverted: `f:ppqu4v` says a `/sveltekit` export
  bundled outside Vite needs **no** `$app/environment` alias, and the bullet says so.
- **OJ13** folded. The closing verify bullet is split: the workers.dev check goes to Milestone 1,
  the dev `/admin` sign-in to the dev-backend section, and the doctor check and branded 500 to
  Milestone 4. Milestone 3 gets no check line, since no placed fact names one.
- **OJ14** folded. rustc-dev-guide-ci is replaced with directus-create-extension. The restic
  take is rewritten per OE3.

## Facts (OF)

- **OF-1** folded. `f:l5gx1t` and `f:gglwt4` are added to security-model and kept on the
  tutorial.
- **OF-2** folded. `f:6kdagb`, `f:ckuow3`, `f:wdmlys`, `f:r8vksa`, and `f:db0cx6` (moved from
  architecture) go to configure-media. The request-body limit is filed as `f:9awije`, tagged
  `[external: Cloudflare Workers limits]` per ruling, with no restated figure. The C2 wording
  names the default, the presets, and the plan-dependent limit.
- **OF-3** folded. `f:xbjxit` moves from security-model to the custom-screen page.
- **OF-4** folded. `f:2glcaf` and `f:jha9f7` are added to replace-magic-links and kept on
  security-model.
- **OF-5** folded. `f:eqsngu`, `f:t767qb`, and `f:22odbz` are added to the audit page. The last
  two stay on the custom-screen page.
- **OF-6** folded. `f:1rstld` and `f:gubeex` move to the sign-in group page. `f:cf1avu` and
  `f:nz890r` leave security-model. `f:rv9gdc` and `f:ez788q` are added to the sign-in group page.
- **OF-7** folded, including the optional `f:w6pqic`. `f:s23sk0` and `f:c4nnu9` are added to the
  theme page.
- **OF-8** folded. `f:24f8gn`, `f:1x8r1x`, `f:0w432q`, and `f:54sgmg` move to the audit page.
  `f:4xrx5f` moves to restrict-admin-access. The near-duplicate pairs on security-model are a
  container tidy item that the review itself scoped out of the outline.
- **OF-9** folded, converging with OF-2. `f:69rw88` is removed from architecture, and `f:db0cx6`
  moves.
- **OF-10** folded. An outOfScope line sends the version history to the kept records on
  security-model, architecture, the custom-screen page, and the tutorial. `f:2w1yrc` stays as
  concept content.
- **OF-11** folded, extended. The island page's security-model outOfScope line is deleted, and
  so is its cross-link to security-model. That link carried the same wrong pointer. `f:21by9u`
  is added to configure-rendering.
- **OF-12** folded. debug-your-site C5 is now a link-only pointer.

## Exemplars (OE)

- **OE1** folded, adjusted. The `pageType` is `symptom row`, the register's anatomy name, which
  the drafter reads under "The page anatomies". The review proposed the manifest heading string.
  Both takes are rewritten as proposed.
- **OE2** folded per ruling. The capture is
  `~/.local/share/cairn/exemplars/extenders/astro-tutorial-2-pages-1/`: "Create your first Astro
  page", `page.md` from the `withastro/docs` MDX source, plus `page.html` and `meta.json`. It
  carries the `PreCheck` objectives ("Get ready to…"), numbered steps that end in browser checks,
  "Show me the steps.", a deploy section, and a closing "I can" checklist. It is filed under a
  new Extenders "Tutorial" heading in `docs/internal/record/docs-exemplars.md`. It replaces
  Directus on the tutorial, and the Django take is kept.
- **OE3** folded. The restic take is rewritten. Its "keep rustc" aside is overtaken by OJ14's
  swap.
- **OE4** folded. Both sveltekit-hooks takes are rewritten.
- **OE5** folded. Rotate the key now pairs operators/cloudflare-create-token and
  operators/ghost-install-ubuntu, which come from different publishers.
- **OE6** folded, including the optional configure-rendering swap. Payload replaces Sanity on the
  island page and Django on configure-rendering. The heaviest captures now fill 12 slots
  (Django), 8 (Sanity), and 7 (Directus).

## Also applied

- Every bare angle-bracket path in a rendered text field is wrapped in backticks:
  `cairn/<concept>/<id>`, `/preview/<token>`, `<publicBase>/[...path]`, `/<id>/:slug`, and the
  fragment include.
- Checks: the JSON parses, and groups, orders, cross-link endpoints, `terms.definedOn`, and
  `rearms.restoredBy` are consistent. No fact is orphaned or uncitable.
  `cairn-docs-outline resolve` returns ok with 25 of 25 entries and exits 0. `npm run
  check:facts` exits 0.
