#!/usr/bin/env node
// cairn-manifest: the regenerate command. It evaluates the cairnManifest virtual module in write mode
// through the consumer's own Vite resolution and writes the canonical content manifest. A thin shell
// over writeManifest so the write logic stays testable apart from the CLI.
import { writeManifest } from './index.js';

writeManifest(process.cwd()).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
