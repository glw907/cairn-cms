# The `cairn` CLI's reference pages moved

The contract pages this directory held are published in the engine's own reference arm, which
ships in the `@glw907/cairn-cms` npm package, so an installed package puts them in a consumer's
tree:

- The exit codes: `docs/reference/cli-cairn-exit-codes.md`,
  <https://cairn.pub/docs/reference/cli-cairn-exit-codes>
- The `--json` payloads: `docs/reference/cli-cairn-json-output.md`,
  <https://cairn.pub/docs/reference/cli-cairn-json-output>
- `cairn doctor`: `docs/reference/cli-cairn-doctor.md`,
  <https://cairn.pub/docs/reference/cli-cairn-doctor>
- The log events this tool reads: `docs/reference/log-events.md`,
  <https://cairn.pub/docs/reference/log-events>

The published JSON schemas moved with them, to `docs/reference/schema/`. Each one is also served
at the `$id` it carries, under <https://cairn.pub/schema/>.
