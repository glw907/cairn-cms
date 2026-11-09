# Vendored DTCG schema

`2025.10/resolver.json` is the Design Tokens Community Group resolver schema, version 2025.10. It
bundles the format schema and the value schemas under separate `$id`s, so one compile checks a
resolver document and a tokens document.

- Source: <https://www.designtokens.org/schemas/2025.10/resolver.json>
- Fetched: 2026-11-09
- SHA-256: `a5acd14318f3c347ea2d12b4ab0f873d1340e74e957c454d112672e58b1da977`
- License: the schema file declares none. The `design-tokens/community-group` repository's
  `LICENSE.md` licenses its reports under the W3C Software and Document License and its test suites
  and other software under the W3C 3-clause BSD License. The file here is unmodified.

The schema is draft-07 and uses the `uri-reference` format, which Ajv does not ship, so
`scripts/theme/build-tokens.mjs` compiles it with `new Ajv({ validateFormats: false })`. The house
schemas in `schema/` are draft 2020-12 and compile in a second instance from `ajv/dist/2020`.
