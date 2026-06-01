// cairn-cms: the directive component registry (seam 3). One declaration per component,
// carrying how it inserts in the editor and how it renders in rehype. The render pipeline
// (Plan 04) and the future component palette both derive from this single source, so the
// parser, the render dispatch, and the editor never drift apart. The adapter references
// `ComponentRegistry` from here.
import type { Element, ElementContent } from 'hast';

/** The input types a component attribute or repeatable item field can take. */
export type FieldType = 'text' | 'select' | 'icon' | 'boolean';

/** One `{key="value"}` attribute on a component directive, or one field of a repeatable item. */
export interface AttributeField {
  /** The attribute name as it appears in the directive, e.g. `icon`. */
  key: string;
  /** The form label. */
  label: string;
  type: FieldType;
  required?: boolean;
  /** Initial value; a string for text/select/icon, a boolean for boolean. */
  default?: string | boolean;
  /** Allowed values for `type: 'select'`. */
  options?: string[];
  /** Helper text shown under the field. */
  help?: string;
}

export type SlotKind = 'markdown' | 'inline' | 'repeatable';

/** One named content region of a component. The slots named `title` and `body` are special: `title`
 *  serializes to the directive `[label]` and `body` to the unmarked content (see the canonical grammar). */
export interface SlotDef {
  name: string;
  label: string;
  kind: SlotKind;
  required?: boolean;
  help?: string;
  /** For `kind: 'repeatable'`: the fields composing each list item (v1 uses the first field). */
  itemFields?: AttributeField[];
}

/** The structured input a component's `build` receives. The engine stamps the component's
 *  attributes and partitions its slots from the rendered hast, so `build` arranges hast and
 *  never walks the tree. `slot(name)` returns a slot's rendered children (title, body, or any
 *  named slot); `items(name)` returns a repeatable slot's items, one child list per item. */
export interface ComponentContext {
  /** Declared attribute values, keyed by attribute key. Booleans are real booleans. */
  attributes: Record<string, string | boolean>;
  /** A named slot's rendered children. Returns `[]` for an absent or empty slot. */
  slot(name: string): ElementContent[];
  /** A repeatable slot's items, each item its own list of rendered children. `[]` when absent. */
  items(name: string): ElementContent[][];
  /** The stamped component element, for an escape hatch. Most builds never need it. */
  node: Element;
}

/** A site component: how it inserts (editor) and how it renders (rehype). */
export interface ComponentDef {
  /** Directive name, e.g. 'card' (matches `:::card`). */
  name: string;
  /** Palette label. */
  label: string;
  /** Palette description. */
  description: string;
  /** Markdown scaffold inserted at the cursor by the editor palette. */
  insertTemplate?: string;
  /** Build the final hast element from the component context (attributes plus partitioned
   *  slots). The engine stamps the entrance-stagger ordinal (`data-rise`) on the top-level
   *  result, so a build fn stays free of any motion concern. */
  build: (ctx: ComponentContext) => Element;
  /** Optional role-to-default-icon, e.g. `{ caution: 'warning' }`. */
  defaultIconByRole?: Record<string, string>;
  /** One line on when to reach for this component; feeds the picker and the reference file. */
  use?: string;
  /** The `{key="value"}` attributes this component accepts. */
  attributes?: AttributeField[];
  /** The named content regions this component accepts. */
  slots?: SlotDef[];
}

export interface ComponentRegistry {
  defs: ComponentDef[];
  names: string[];
  get(name: string): ComponentDef | undefined;
  defaultIcon(name: string, role?: string): string | undefined;
}

/**
 * Build a registry from a site's component definitions. The single source the render
 * pipeline (directive stamp plus rehype dispatch) and the editor palette both read.
 */
export function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry {
  const byName = new Map(components.map((c) => [c.name, c]));
  return {
    defs: components,
    names: components.map((c) => c.name),
    get: (name) => byName.get(name),
    defaultIcon: (name, role) => (role ? byName.get(name)?.defaultIconByRole?.[role] : undefined),
  };
}

/** Guided-form values for one component: attribute values keyed by attribute key, slot values keyed
 *  by slot name (a string, or a string list for a repeatable slot). */
export interface ComponentValues {
  attributes: Record<string, string | boolean>;
  slots: Record<string, string | string[]>;
}

/** Seed an empty {@link ComponentValues} from a component's schema: attribute defaults (or '' / false)
 *  and empty slot values ([] for repeatable, '' otherwise). */
export function emptyValues(def: ComponentDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const field of def.attributes ?? []) {
    attributes[field.key] = field.default ?? (field.type === 'boolean' ? false : '');
  }
  const slots: Record<string, string | string[]> = {};
  for (const slot of def.slots ?? []) {
    slots[slot.name] = slot.kind === 'repeatable' ? [] : '';
  }
  return { attributes, slots };
}
