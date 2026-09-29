# The include directive

An engine built-in. A leaf directive that splices a fragment's rendered body in place. It emits no wrapper and no class of its own for a found fragment, so there is nothing to style.

Authoring:

```md
::include{fragment="how-to-reach-us"}
```

Reads:

- A missing or unnamed fragment renders a calm notice paragraph carrying the class `cairn-include-missing`, and the page keeps building. The registry does not list the class, and the sheet does not style it, so a theme that wants the notice quiet styles it itself.
- The editor preview wraps an included fragment in a boundary cue, `cairn-fragment-boundary`. That cue belongs to the admin preview and never reaches a public page.

Override seams:

- Style the fragment's own content through the ordinary prose rules. There is no include-specific hook.
