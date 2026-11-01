---
paths:
  - "tool/**"
---

Load the `standards:go-conventions` skill before you write or change any file under `tool/`, and
`standards:golang-spf13-cobra` once a file under `tool/cmd/cairn` is open. The module's gate is
`make -C tool check`, and its architecture is `tool/docs/adr/0001-the-spine-is-the-product.md`.
