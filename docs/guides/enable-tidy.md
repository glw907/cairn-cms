<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Enable tidy and the editor copy-edit

This guide wires the editor's two copy-edit features: the spellcheck, which is on by default and needs
no setup, and tidy, the opt-in language-model copy-edit, which a developer turns on. Both are
configured in the committed site config (the same `site.config.yaml` the nav menus live in), and tidy
also needs one Worker secret.

## Prerequisites

- A running cairn site with the admin mounted. If you have not stood one up, start from
  [Define an adapter and schema](./define-an-adapter-and-schema.md).
- For tidy, an Anthropic API key and a Worker on the Workers Paid plan (the model call is a Worker
  subrequest).

## Spellcheck: the dialect

Spellcheck runs locally in the editor with no setup. The one thing a site declares is the dialect, so
the checker loads the right word list. It lives under `spellcheck.dialect` in the site config:

```yaml
spellcheck:
  dialect: en-us
```

The default is `en-us`, so a US-English site can omit the block. Today only US English ships its word
list, so an unset or unknown dialect resolves to it; the field is in place for the British and other
dialects a later release adds. The dialect is a per-site declaration, not a per-editor or per-word
choice, and tidy never normalizes regional spelling regardless of it.

An editor's personal additions (a name, a place, a term the dictionary does not know) commit to a
git-tracked file at `src/content/.cairn/dictionary.txt`, one word per line, sorted, with `#` comment
lines allowed. It rides the same GitHub App commit pipeline the content uses, so a word one editor
adds is shared with every editor. You do not create or maintain this file by hand; the editor's
add-to-dictionary action writes it.

## Tidy: turn it on

Tidy is off until you enable it. Three things turn it on: the master switch in the config, the API key
as a Worker secret, and an optional model and convention choice.

1. **Enable it in the site config.** Add a `tidy` block:

   ```yaml
   tidy:
     enabled: true
     model: claude-sonnet-4-6
   ```

   `enabled` defaults to `false`, so the whole block is opt-in. `model` defaults to
   `claude-sonnet-4-6` (Claude Sonnet), the judgment floor for a light copy-edit; the lighter, cheaper
   alternative is `claude-haiku-4-5` (Claude Haiku). The model is a developer-tier decision that
   travels with the key (cost is an ops choice), so it is read-only in the editor-facing settings.

2. **Set the API key as a Worker secret.** The key is `ANTHROPIC_API_KEY`. It is a secret, never a
   committed config value, so set it on the Worker:

   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

   For local development, put it in `.dev.vars` instead (gitignored). The tidy action reads it from
   `event.platform.env`, refuses with a clear message before any model call if it is missing, and never
   returns or logs it.

3. **Check the wiring.** `cairn doctor` carries a tidy check: once `tidy.enabled` is `true`, it warns
   if `ANTHROPIC_API_KEY` is in neither the wrangler vars nor `.dev.vars`. A Worker secret is invisible
   to the CLI, so the check asks you to verify the secret rather than claiming it is unset. See the
   [doctor reference](../reference/doctor.md).

That is the whole developer setup. An editor sees the Tidy control appear once the key is present, and
the convention settings screen renders. When tidy is not enabled, the editor's tidy control and the
convention section are absent (not shown disabled), and the settings screen tells the editor what their
developer needs to do.

## The conventions

The convention config under `tidy.conventions` is what shapes the copy-edit. An editor edits it in the
two-tier settings screen, and it saves to this same site-config file, so you can also set it by hand.
The resting state is the safe default: the objective Fixes group on, every style and advanced toggle
off, no decisions asked.

```yaml
tidy:
  enabled: true
  conventions:
    fixes: true
    oxfordComma: complex-only
    numberStyle: under-ten
    smartQuotes: true
```

The groups:

- **`fixes`** (default `true`): the objective fixes (spelling, grammar, doubled words, whitespace,
  capitals, terminal punctuation). Turning it off leaves only the configured style conventions.
- **The style tier** (each off when absent): `oxfordComma` (`always`, `complex-only`, `never`),
  `numberStyle` (`under-ten`, `under-hundred`, `always-numerals`), `measurements`
  (`abbreviate`, `spell-out`), `percent` (`sign`, `word`), `emDash` (`spaced`, `closed`),
  `enDashRanges` (a boolean), `ellipsis` (`single-char`, `three-dots`), and `timeFormat`
  (`5 PM`, `5pm`, `5 p.m.`).
- **The advanced tier** (each a boolean, default `false`): `smartQuotes` (straight quotes to curly,
  with the full apostrophe rule set) and `brandCaps` (brand and proper-noun capitalization on a
  curated list).

A toggle that is off emits no rule, so tidy applies only what you enable. The prompt is built from
this config alone and is told never to harmonize to the author's own habits and never to guess an
undeclared style. An undeclared style is the author's choice. That is why "fifteen" and "15" keep
coexisting when number style is off, and why regional spelling is never normalized. For the why, see
[the editor copy-edit explanation](../explanation/editor-copyedit.md).

## How tidy behaves at runtime

Tidy commits nothing. It reads the draft once, returns a corrected string, and the editor computes the
diff locally and reviews it before any of it lands. The action bounds the call:

- It refuses an over-long body before the call (tidy a selection instead).
- It bounds the model call with its own deadline, shorter than the platform limit, and maps an overrun
  or an abort to a retryable "try again".
- It validates the result as a proofread, not a restructure: a result that changes the heading
  structure, the frontmatter, a `media:` token, a code block, or more than a bounded fraction of the
  wording is discarded with an honest message, and the document is untouched.

The runtime emits log events for each outcome (`tidy.done`, `tidy.error`, `tidy.refused`,
`tidy.empty`, and `dictionary.added` for a dictionary commit). See
[log events](../reference/log-events.md).

## See also

- [Write in the editor](./write-in-the-editor.md) for the editor-facing walkthrough of spellcheck,
  the personal dictionary, and tidy.
- [The editor copy-edit](../explanation/editor-copyedit.md) for the voice-preservation and
  local-spellcheck design reasoning.
- [The sveltekit reference](../reference/sveltekit.md) for the `tidyAction` and `addDictionaryWordAction`
  request shapes.
