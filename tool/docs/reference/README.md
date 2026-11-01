# The `cairn` CLI's reference pages moved

The contract this directory once held now lives in the binary, so a machine that holds only the
installed tool can read it:

- `cairn help agents` carries the exit codes, their precedence, and every `--json` payload field.
- `cairn doctor --help` lists every check and its severity.
- `cairn <command> --help` carries each command's own contract.

The published JSON schemas live in `schema/` at the cairn-cms repository root and ship in the
`@glw907/cairn-cms` npm package. Each one is also served at the `$id` it carries, under
<https://cairn.pub/schema/>.
