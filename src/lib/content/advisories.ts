// cairn-cms: the entry editor's internal advisory channel. An advisory is a
// non-blocking, serializable notice that rides EditData across the SSR boundary, so it carries data
// only and never a callback. Today's one notice is the held address: another live entry already
// resolves to the address this entry would publish at.
//
// heldAddress is the one predicate behind that notice and behind the publish refusal, so the edit
// page warns exactly when a publish would be refused. It reads only the manifest the caller already
// holds, because the build's duplicate-permalink throw (the site resolver) sees only routable,
// non-draft entries on main.
import type { ConceptDescriptor } from './types.js';
import type { Manifest, ManifestEntry } from './manifest.js';

/**
 * One action an advisory offers, as a label and an optional link target. Module-internal (its
 * export was retired, a sanctioned NavIcon-class leak); a consumer reads it
 * structurally as `NonNullable<EditData['advisories'][number]['actions']>[number]`.
 */
interface AdvisoryAction {
  /** The action's button or link label. */
  label: string;
  /** The link target, when the action navigates. */
  href?: string;
}

/** A non-blocking editor notice, serializable so it can ride EditData across the SSR boundary. */
export interface AdvisoryNotice {
  /** The notice kind, e.g. "address-collision". */
  kind: string;
  /** The advisory severity; warn-and-allow, never a gate. */
  severity: 'warn';
  /** The notice text shown to the editor. */
  message: string;
  /** The notice's offered actions, when any. */
  actions?: AdvisoryAction[];
}

/**
 * The live entry that already holds the address `self` would publish at, or null when none does.
 * Null whenever `self` is a draft or its concept is non-routable, since neither takes an address
 * on the build. Otherwise the first other manifest row at that permalink that is non-draft and of a
 * declared, routable concept: the pair the site resolver's duplicate-permalink throw would reject.
 * `self` carries the entry's own identity and draft flag rather than a manifest row, because an
 * entry being edited may have no row yet or a branch-side permalink.
 */
export function heldAddress(
  manifest: Manifest,
  concepts: ConceptDescriptor[],
  self: { concept: string; id: string; permalink: string; draft: boolean },
): ManifestEntry | null {
  if (self.draft) return null;
  const routable = (id: string) => concepts.find((c) => c.id === id)?.routing.routable === true;
  if (!routable(self.concept)) return null;
  return (
    manifest.entries.find(
      (row) =>
        row.permalink === self.permalink &&
        !row.draft &&
        (row.concept !== self.concept || row.id !== self.id) &&
        routable(row.concept),
    ) ?? null
  );
}
