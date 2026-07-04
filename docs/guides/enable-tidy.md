# Enable tidy

Tidy is cairn's optional AI copy-edit, built on [Claude](https://www.anthropic.com/claude). Turning
tidy on is a developer task: add a `tidy` block to `site.config.yaml` and set an Anthropic API key
as a Worker secret. Editors then work with tidy from the toolbar. See
[Write in the editor](./write-in-the-editor.md#tidy) for that side.

If you haven't declared your adapter yet, start with
[Define an adapter and schema](./define-an-adapter-and-schema.md). Tidy is off by default, and
turning it on is a deliberate per-site choice: every call it makes is a real, billed request to
Anthropic's API, so there's no "just try it" setting to leave on by accident.

## Turn tidy on in the site config

Add a `tidy` block to `site.config.yaml`, the committed config `parseSiteConfig` reads at build:

```yaml
tidy:
  enabled: true
```

That one line is a complete config. `enabled` defaults to `false`, so tidy stays off until you set
it, and every other field falls back to a sensible default:

| Field | Default | What it controls |
| --- | --- | --- |
| `enabled` | `false` | The master switch. Nothing else here matters while it's `false`. |
| `model` | `claude-sonnet-4-6` | The model tidy calls. The only supported alternative is `claude-haiku-4-5`, faster and cheaper at the cost of judgment on subtler fixes. |
| `conventions` | Fixes on, every style and advanced toggle off | The per-convention settings, Oxford comma, number style, em dash spacing, and the rest, that shape tidy's prompt. |

`enabled` and `model` are developer-tier facts: set them once in the file, and the in-admin
settings screen shows both back to you read-only. `conventions` is the field an editor actually
touches day to day, set from that same screen rather than by hand-editing YAML. See
[what changes for editors](#see-what-changes-for-editors), below.

## Set the Anthropic API key as a Worker secret

Tidy calls the Anthropic API directly from the Worker, so it needs an API key. The key is a
secret, so it doesn't go in `site.config.yaml` or in a plain `vars` entry in `wrangler.jsonc`. Set
it with wrangler:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

`wrangler dev` reads a `.dev.vars` file instead of asking Cloudflare for the secret, so local
development needs the same key there:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Keep `.dev.vars` out of version control the same way you would any other local secret file.

`ANTHROPIC_API_KEY` is the one member of
[`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings) that's optional. Every
other binding is required, so a forgotten one fails at compile time instead of surfacing as a
runtime error later. Leaving tidy off means you can skip the secret entirely. Turning tidy on
without setting the secret fails closed: the action refuses every request with `fail(503)`, and the
editor sees tidy report itself unavailable.

## Verify the wiring

`cairn-doctor` runs a `config.tidy-key` check whenever `tidy.enabled` is `true`:

```bash
npx cairn-doctor
```

The check confirms presence, not correctness: a wrangler secret is invisible to any CLI, so the
doctor can only confirm `ANTHROPIC_API_KEY` appears somewhere it would if it were a plain var, the
wrangler config or `.dev.vars`. A pass still asks you to verify it's the real key and not a
placeholder. See [the doctor's check table](../reference/doctor.md#the-checks) for the exact
condition and what makes it skip.

The real test is running tidy once. Open an entry in the admin, invoke tidy on a paragraph, and
confirm it comes back with proposals. With observability on, a successful call logs `tidy.done`
with the model and the token usage. A broken key instead logs `tidy.error`, or refuses outright
before the call ever goes out. [Log events](../reference/log-events.md) covers the whole `tidy.*`
family, and [Read cairn's logs](./read-cairn-logs.md) covers querying them on a deployed Worker.

## Know what a tidy run costs

Every tidy call spends tokens on the Anthropic API, and cairn caps both the input and the output, so
a run has a known cost ceiling.

- Tidy runs only when an editor triggers it, over the whole draft or a selected passage. Nothing
  calls the model on a timer or in the background.
- A request over roughly 24,000 characters (about 6,000 input tokens) is refused before the model
  is reached; the editor tidies a selection instead of the whole draft.
- The output cap exceeds what proofreading that input needs, so a run can return a full rewrite.
- Model choice is the main lever. `claude-sonnet-4-6` favors judgment on subtler fixes, and
  `claude-haiku-4-5` runs faster for less. Current per-token pricing lives on
  [Anthropic's pricing page](https://platform.claude.com/docs/en/pricing).
- Local development costs nothing: cairn's dev wiring, as the showcase template ships it, injects a
  stubbed Anthropic client, so building and testing never reaches the real API.

## See what changes for editors

Once `tidy.enabled` is `true` and the key resolves, the in-admin settings screen
(`/admin/settings`) drops its gate note and opens the conventions editor: the per-convention
toggles an editor sets for their own site, saved straight back into `site.config.yaml`'s
`tidy.conventions` block. The developer-tier facts you just set, whether tidy is on, whether the
key is set, and which model, show there too, read-only.

Past that screen, tidy is an editing feature: an editor invokes it from the
toolbar, reviews proposals inline, and accepts or rejects each one. That whole flow, and tidy's
remit of small fixes that never touch voice or structure, is
[Write in the editor's tidy section](./write-in-the-editor.md#tidy).
