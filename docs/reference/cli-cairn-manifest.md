# The `cairn-manifest` CLI

`cairn-manifest` regenerates the committed content manifest. It evaluates the
[`cairnManifest`](./vite.md) virtual module in write mode through the consumer's own Vite
resolution, so the manifest it writes matches what a build would verify against. The bin is a thin
shell over the exported `writeManifest` function, which keeps the write logic testable apart from the
command.

The package ships the command in its `bin` field, so an install puts it on the project's path.

## What it does

The command loads your project's Vite config, finds the `cairnManifest()` plugin in it, and reads the
content globs, the config module, and the manifest path off that plugin. It then evaluates the
write-mode virtual module through your build's own resolution and writes the serialized manifest to
the configured `manifestPath`, which defaults to `/src/content/.cairn/index.json`. Because the bin
reuses the plugin's options, it regenerates with exactly the inputs the build verifies against.

Run it after you edit content outside the admin, so the committed manifest tracks the corpus. The
[`cairnManifest`](./vite.md) plugin verifies the manifest on every build and fails the build on
drift, and this command is how you fix that drift.

## How to run it

Wire it as a package script and run it from the project root. The showcase wires it as `cairn:manifest`:

```json
{
  "scripts": {
    "cairn:manifest": "cairn-manifest"
  }
}
```

```sh
npm run cairn:manifest
```

The command takes no arguments. It uses the current working directory as the project root, so run it
from the directory that holds your `vite.config.ts`.

## Exit behavior

On success the command writes the manifest and exits zero. On failure it prints the error message to
stderr and exits non-zero. Two common failures carry a clear message: no Vite config found in the
working directory, and a Vite config with no `cairnManifest()` plugin to read the build options from.
