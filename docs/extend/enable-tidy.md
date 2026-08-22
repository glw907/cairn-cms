# Enable Tidy

Turn on the optional AI copy-edit pass an editor can run over their own draft, and choose which
style conventions it enforces.

Tidy is opt-in and off by default. It never runs on its own; an editor triggers it explicitly
from inside a draft, reviews every proposed change as an in-buffer diff, and accepts or rejects
each one individually before anything is saved.

## Turn it on

Install the model SDK Tidy calls. It's an optional peer dependency, so npm doesn't install it for
you, and a site that never turns Tidy on carries none of it:

```bash
npm install @anthropic-ai/sdk
```

Then set `tidy.enabled: true` in `site.config.yaml` and bind an Anthropic API key as the
`ANTHROPIC_API_KEY` Worker secret:

```yaml
# site.config.yaml
tidy:
  enabled: true
```

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

`ANTHROPIC_API_KEY` is the one optional member of
[`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings); every other binding
in that type is required. `cairn-doctor` probes it: with a literal key value readable locally
(typically `.dev.vars`), the doctor makes a zero-token call and reports valid or invalid
distinctly; with only a deployed Worker secret's name visible, it passes on presence alone. The
same probe backs the settings screen itself, `/admin/settings`, which distinguishes a missing key
from a key Anthropic has since rejected, so a revoked key closes the feature with a clear reason
rather than a generic failure the next time an editor opens it.

## Choose the model

```yaml
tidy:
  enabled: true
  model: claude-haiku-4-5
```

The default is `claude-sonnet-5`, the judgment floor for a light copy-edit, run at the low effort
tier since a proofread doesn't need extended reasoning. `claude-haiku-4-5` is the cheaper, faster
alternative for a site running many tidy passes. Both are visible and changeable from the settings
screen, so this is a starting default rather than a one-way choice.

## Choose the conventions

`tidy.conventions` builds the set of style rules the model applies, beyond the always-on
objective fixes (spelling, grammar, doubled words, stray whitespace, capitals, terminal
punctuation):

```yaml
tidy:
  enabled: true
  conventions:
    oxfordComma: always
    numberStyle: under-ten
    emDash: spaced
    enDashRanges: true
```

Only `fixes` defaults on; every other convention below defaults off. Declaring nothing beyond
`enabled: true` runs the objective fixes alone.

| Field | Values | Governs |
| --- | --- | --- |
| `fixes` | boolean, default `true` | The objective-fixes group as a whole. Turn it off to skip even those. |
| `oxfordComma` | `always` \| `complex-only` \| `never` | Oxford comma position (`complex-only` follows AP style). |
| `numberStyle` | `under-ten` \| `under-hundred` \| `always-numerals` | Number-versus-word threshold; ages, dates, measurements, and percentages always render as numerals regardless of the threshold. |
| `measurements` | `abbreviate` \| `spell-out` | Measurement notation only, never the unit system or the number itself. |
| `percent` | `sign` \| `word` | `%` versus "percent." |
| `emDash` | `spaced` \| `closed` | Em dash spacing. |
| `enDashRanges` | boolean, default `false` | Convert a hyphen between two numbers to an en dash. |
| `ellipsis` | `single-char` \| `three-dots` | Ellipsis rendering. |
| `timeFormat` | `'5 PM'` \| `'5pm'` \| `'5 p.m.'` | Time-of-day formatting. |
| `smartQuotes` | boolean, default `false` | Straight quotes to curly, with the full apostrophe rule set. |
| `brandCaps` | boolean, default `false` | Brand and proper-noun capitalization, against a curated list only. |

The same set is editable from `/admin/settings` once tidy is on, so a site config change and an
owner's later adjustment from the screen both write to the same place.

## An editor's own dictionary sits outside this

An editor can add a word to a personal dictionary from inside the tidy review, so a name or a
term of art Tidy would otherwise flag stops flagging for every future pass. That's a separate,
committed file (`src/content/.cairn/dictionary.txt`), owned by the editor track, not a config
choice here.

## What Tidy can't do to a document

Before a proposed change ever reaches an editor, cairn checks the model's output against the
original and discards the whole result if it fails: the directive structure, the heading count
and levels, the fenced-code-block count, the frontmatter (byte for byte), the `media:` token
multiset, and every code span all have to match exactly, plus a bound on how much the wording is
allowed to diverge. A result that fails any of these never reaches the review screen, and the
editor's buffer is left untouched. This is what makes Tidy safe against both a bad rewrite and a
prompt injected through the draft's own text: the check is structural, not a second opinion from
the model that wrote the change. Voice and phrasing are governed by `tidy.conventions` above and
the prompt, not by this check, since no structural comparison can verify voice.

## What a run costs and refuses

A draft over roughly 24,000 characters (about 6,000 input tokens) is refused before the model is
ever called, with a message naming the limit; select a shorter passage and tidy that instead. The
settings screen's key-health check caches its result for ten minutes, so a key you just fixed can
take a few minutes to show as healthy again. In local development, the SDK is never actually
called: the dev backend injects a stubbed Anthropic client, so building and testing a site never
reach the real API.

## What Tidy doesn't replace

Tidy corrects mechanics; it's not a substitute for spellcheck's live, as-you-type underlines, and
turning it on changes nothing about that separate feature. See [the editor's own
guide](../editors/write-in-the-editor.md) for what an editor experiences running a tidy pass.

## You know it worked when

`cairn-doctor` reports the key valid, `/admin/settings` shows the Editor tier of controls (rather
than the setup-needed state), and running Tidy on a draft returns a reviewable diff rather than a
refusal. A refusal that names a specific reason (the key missing, the key rejected, the body too
long) is doing its job; only a bare failure with no reason is worth investigating further.
