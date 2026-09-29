# References

Files here load on demand; the always-loaded core lives in `../SKILL.md`. Each answers a
narrower question than the core does.

| File | Load it when |
|---|---|
| `exemplar-list.md` | Building or reviewing a list screen (a Members-style table) |
| `exemplar-detail.md` | Building or reviewing a detail or slide-over screen |
| `exemplar-kit.md` | Writing buttons, joins, alerts, controls, a chip, a field, or a card in plain classes |
| `form-anatomy.md` | Laying out a form's rows and labels |
| `extension-grammar.md` | Deriving a component the toolkit doesn't ship yet |
| `grader-prompt.md` | The done-gate's step 3: a coherence read against your own captures |
| `craft.md` | The invisible-polish catalogue: motion, weight, spacing rhythm |

These files, and `../SKILL.md`, quote utility class names verbatim as worked examples. Tailwind
v4's automatic source detection scans any non-ignored file under a project, `.claude/` included,
so a consuming site's own Tailwind build should exclude `.claude/` from its scan (an `@source not`
directive, or an equivalent ignore rule) once this skill installs there.
