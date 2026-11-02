# Content rest: fold record

The fold of `2026-11-01-content-rest-review-mechanics.md` into the plan and design note, at `1b4c2da33`.
Every finding was checked against source first. 23 rows: 20 folded, 3 refused, 0 owner forks. Path moves from
175 to 190 against a ceiling of 500: T1 50 to 60 (F2), and T5 35 to 40 (F8, F9, F13).

| Finding | Disposition | Where, or why |
|---|---|---|
| F1 | folded | Pre-flight "Setup" and "Bin checks", with a `readlink` check on the showcase's engine. T3 acceptance gains the round-trip test. |
| F2 | folded, narrowed | T1 "Tests", four groups, and T1 acceptance. Two of the review's named files were wrong: `fields: schema` in `edit-page-field-hint` and `edit-page-spellcheck-override` is a `NamedField[]` prop, so the plan says to leave them. `fields-exports.test.ts` was missing and is added. |
| F3 | folded, regex changed | T4 `body-scan.ts` and acceptance. The review's regex hit `data-href`, so `\b` became `[\s"']`. |
| F4 | folded | T4 header, Files, `content/manifest.ts`, `delivery/manifest.ts`, and `data.ts` bullets, and the class line. |
| F5 | folded | T2 `registry.ts` bullet. The shape is probed. |
| F6 | folded | T3 Files and `index.json` bullet. |
| F7 | folded | T3 Files and a `fake-github.ts` bullet. |
| F8 | folded | T5 `applyManifest` bullet and acceptance. |
| F9 | folded | T5 acceptance, plus the three `buildManifestFromVite` callers. |
| F10 | folded | T4 Files and Skills bullet. |
| F11 | folded | "A site breaks" stop. |
| F12 | folded | T6 test pins and acceptance. `:1231` is `CairnMediaLibrary.svelte`. |
| F13 | folded | T5 `formatManifestSummary` and acceptance, design call 13. |
| F14 | folded | Stops "Push and CI" and "Merge chores", Pre-flight dispatch line. |
| F15 | folded | "A cause that returns" stop. |
| F16 | folded | Tasks intro. T2 owns `:61,106` of `delivery-site-resolver.test.ts`, since leaving them would fail T2's own `npm run check`. T3 owns `:90,93,131`. |
| F17 | folded | T1 `types.ts` and `concepts.ts` bullets, T2 `fields.ts` bullet. |
| F18 | folded | Design call 17, which T7's `## Decisions` carries, and T5's dev bullet. |
| F19 | refused | Optional. A non-draft link to an invalid draft fails correctly, and only the message's wording is loose. |
| F20, T2 wording | folded | T2 acceptance. |
| F20, third parse | refused | Optional. About 13 ms per 10 KB is tolerable, and sharing a parse is new machinery with no measured defect. |
| F20, a11y reviewer | refused | `cairn-running-passes` maps `standards:daisyui-a11y-reviewer` to markup, and T6 changes markup text. |
| F20, hand rename | folded | Same fix as F6. |

## Probes

Scripts are in `$CLAUDE_JOB_DIR/tmp/fold`. Nothing in the repo was removed or left behind.

**F3, regex over real remark `html` nodes** (`f3c.mjs`, with `remarkParse`, `remarkGfm`, `remarkDirective`).
Comments stripped with `/<!--[\s\S]*?(?:-->|$)/g`, then `/<[a-z][^>]*[\s"'](?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi`:

| Case | Hit | Note |
|---|---|---|
| `<!-- <a href="cairn:posts/old">gone</a> -->`, multi-line, unterminated | none | Comment stripped. |
| `<pre><code>href="cairn:posts/one"</code></pre>`, and the `&lt;a` form | none | No tag opens. |
| `<!-- c --><a href="cairn:posts/one">x</a>` | `cairn:posts/one` | A live tag after a comment still hits. |
| `<a href="cairn:posts/one">x</a>`, inline in a sentence | `cairn:posts/one` | Once each. |
| `<img src="cairn:x">` | `cairn:x` | |
| `<a href='cairn:posts/one'>x</a>` | `cairn:posts/one` | |
| `<img src=cairn:x>` | `cairn:x` | Unquoted, block `html` node. |
| `<a href=cairn:posts/one>x</a>` | none | Not an `html` node: remark-directive reads `:posts` as a `textDirective`, so the text stays literal and no live href ships. |
| Tag across lines, inline and in a `<div>` block | `cairn:posts/one` | `[^>]*` must cross newlines. |
| `<a data-href="cairn:posts/one">x</a>` | none | The review's regex hit this. |
| `<A HREF="cairn:posts/one">x</A>` | `cairn:posts/one` | |
| `<pre>\nif a <b and\nhref="cairn:posts/one"\n</pre>` | `cairn:posts/one` | Accepted: a browser reads that as an attribute on `<b>`. |
| `<a title="a>b" href="cairn:posts/one">x</a>` | none | Accepted miss: the same outcome as today, and no site has it. |
| Fenced ` ```html ` block | none | No `html` node. |

The first run reported doubled nodes because the probe's visitor returned `push`'s number, and
`unist-util-visit` treats a number as the next index. A statement body fixed it, and T4 now says so.

**F5, compile** (`mk_f5.py`). The real `fields.ts` with T2's edits, under `tsc --strict` with `NodeNext`: the planned
`typeof d === 'number' ? ... : typeof d === 'object' || d === undefined ? ... : d` exits 0, with the three
`@ts-expect-error` lines (string on number, default on image, array bag with no label) used. The `??` form fails:

```
f5-bad.ts(286,5): error TS2322: Type 'string | boolean | readonly string[]' is not assignable to type 'string | boolean'.
```

**F2, grep.** `grep -rln defineFieldset src/tests` prints 69 files. `from '@glw907/cairn-cms'` inside a string in
`vite-site-facts`, `vite-verify-references`, and `vite-verify-nested-media` only. A multi-line import scan finds
root imports in `define-concept`, `fieldset-seo`, `fieldset-taxonomy`, and `fields-exports`. `grep -n schema` shows
`const schema: NamedField[]` in both `edit-page-*` files. `delivery-create-site-resolver.test.ts:92` and
`content-routes-revert.test.ts:351` pass a record or a descriptor list, so neither needs a change.

**F1, round trip** (`f1.mjs`, on `dist`). `formatManifest(parseManifest(raw)) === raw` is true for both committed
`index.json` files. On a rename the engine doesn't yet read, it's false, so the test catches a miss.

**F11.** `gh pr diff 180`: `the line is not a paragraph of its own (blank line before and after)`.

**F16.** `grep -c 'fields\.array('` prints 2 for the test file, and the `summary` lines sit at `:90,93,131`, so
the hunks stay apart from `:61,106`.
