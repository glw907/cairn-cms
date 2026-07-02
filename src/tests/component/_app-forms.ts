// A stand-in for SvelteKit's $app/forms, wired in by the component project's vite alias. The real
// module exists only inside a kit app; MediaInsertPopover imports `deserialize` statically, so the
// alias points here. deserialize parses the action envelope (plain JSON) and devalue-parses its
// `data` field, the same two steps the real one runs, minus the app's custom decoders (the upload
// envelope carries only plain JSON-serializable data, so no custom decoder is needed under test).
import { parse } from 'devalue';

/** Parse a serialized SvelteKit form-action result, matching the real $app/forms deserialize. */
export function deserialize(result: string): unknown {
  const parsed = JSON.parse(result);
  if (parsed.data) parsed.data = parse(parsed.data);
  return parsed;
}
