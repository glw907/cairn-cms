// cairn-cms: the directive component registry (seam 3). One declaration per component,
// carrying how it inserts in the editor and how it renders in rehype. The render pipeline
// (Plan 04) and the future component palette both derive from this single source, so the
// parser, the render dispatch, and the editor never drift apart. The adapter references
// `ComponentRegistry` from here.
import type { Element, ElementContent } from 'hast';
import type { FieldDescriptor } from '../content/fields.js';
import type { BehaviorTable, Fieldset } from '../content/fieldset.js';
import { fieldset } from '../content/fieldset.js';

export type SlotKind = 'markdown' | 'inline' | 'repeatable';

/**
 * One named content region of a component. The slots named `title` and `body` are special: `title`
 *  serializes to the directive `[label]` and `body` to the unmarked content (see the canonical grammar).
 */
export interface SlotDef {
  name: string;
  label: string;
  kind: SlotKind;
  required?: boolean;
  help?: string;
  /** For `kind: 'repeatable'`: the fields composing each list item (v1 uses the first field). */
  itemFields?: Record<string, FieldDescriptor>;
  /**
   * For `kind: 'repeatable'`: derives a row's label from its item values and zero-based index.
   *  When it returns nothing, the picker falls back to `${label} ${index + 1}`.
   */
  itemLabel?: (item: Record<string, string | boolean>, index: number) => string;
}

/**
 * The structured input a component's `build` receives. The engine stamps the component's
 *  attributes and partitions its slots from the rendered hast, so `build` arranges hast and
 *  never walks the tree. `slot(name)` returns a slot's rendered children (title, body, or any
 *  named slot); `items(name)` returns a repeatable slot's items, one child list per item.
 */
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
  /**
   * Build the final hast element from the component context (attributes plus partitioned
   *  slots). The engine stamps the entrance ordinal (`data-rise`) on the top-level
   *  result, so a build fn stays free of any motion concern.
   */
  build: (ctx: ComponentContext) => Element;
  /**
   * Opt this directive into client hydration (phase 4b islands). `true` mounts the island eagerly on
   *  first load and after client-side navigation; `'visible'` defers the mount to first intersection.
   *  The engine wraps {@link ComponentDef.build}'s output in an island boundary, and the site registers
   *  the live Svelte component under the same name on `rendering.islands`. Absent leaves the directive a
   *  static, server-only component.
   */
  hydrate?: boolean | 'visible';
  /**
   * Optional role-to-default-icon, e.g. `{ caution: 'warning' }`. Maps a free-string role to a
   *  glyph key in the site IconSet; choose a logically representative glyph and prefer glyphs
   *  distinct across roles so the picker stays scannable. Overrides the engine
   *  {@link DEFAULT_ICON_BY_ROLE} fallback for the roles it names.
   */
  defaultIconByRole?: Record<string, string>;
  /** One line on when to reach for this component; feeds the picker and the reference file. */
  use?: string;
  /** The `{key="value"}` attributes this component accepts, keyed by attribute name. */
  attributes?: Record<string, FieldDescriptor>;
  /**
   * Per-attribute function-valued behavior (a cross-field `validate`), keyed by attribute name.
   *  {@link defineComponent} bundles it into the attribute {@link Fieldset}.
   */
  behavior?: BehaviorTable;
  /**
   * The attribute validator {@link defineComponent} builds from `attributes` and `behavior`.
   *  Engine-internal: the constructor sets it, and {@link validateComponent} runs it.
   */
  attributeSchema?: Fieldset;
  /** The named content regions this component accepts. */
  slots?: SlotDef[];
  /**
   * A glyph key from the site IconSet, shown beside the label in the picker. Choose a logically
   *  representative glyph and prefer glyphs distinct across components so the picker stays scannable.
   */
  icon?: string;
  /** A category heading for the picker. Components order by declaration within a group. */
  group?: string;
  /** Omit from the top-level picker (for a nested or round-trip-only component). */
  hidden?: boolean;
  /**
   * A structured sample the picker seeds the form with and renders through the same path a real
   *  insert takes. Declaring `preview` is what opts the component into the two-pane configure layout.
   */
  preview?: {
    attributes?: Record<string, string | boolean>;
    slots?: Record<string, string | string[]>;
  };
}

export interface ComponentRegistry {
  defs: ComponentDef[];
  names: string[];
  get(name: string): ComponentDef | undefined;
  defaultIcon(name: string, role?: string): string | undefined;
  /** The name of the component's first `type:'icon'` attribute, or undefined when it declares none. */
  iconField(name: string): string | undefined;
}

/**
 * The hast property name carrying one declared attribute from stamp to dispatch, e.g. `tone`
 *  becomes `dataAttrTone`. The directive stamp writes it and the rehype dispatch reads it, so both
 *  sides derive the name from this one helper rather than spelling the capitalize twice.
 */
export function dataAttrProp(key: string): string {
  return `dataAttr${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/**
 * The name of a component's first `type:'icon'` attribute, or undefined when it declares none. Both
 *  the construction-time guard and the registry's `iconField` derive the icon field from this one
 *  predicate rather than spelling the `type === 'icon'` find twice.
 */
function findIconField(def: ComponentDef): string | undefined {
  return Object.entries(def.attributes ?? {}).find(([, field]) => field.type === 'icon')?.[0];
}

/**
 * The engine's role-to-glyph-key fallback for the conventional admonition roles, which a site's
 *  IconSet may satisfy. A component's own {@link ComponentDef.defaultIconByRole} overrides it.
 */
const DEFAULT_ICON_BY_ROLE: Record<string, string> = {
  note: 'info',
  tip: 'lightbulb',
  important: 'star',
  warning: 'warning',
  caution: 'alert-triangle',
  info: 'info',
  danger: 'flame',
};

/**
 * Build a registry from a site's component definitions. The single source the render
 * pipeline (directive stamp plus rehype dispatch) and the editor palette both read.
 */
export function defineRegistry({ components }: { components: ComponentDef[] }): ComponentRegistry {
  for (const c of components) {
    if (c.name === 'figure') {
      throw new Error(
        `cairn: component "${c.name}" uses "figure", a reserved directive name handled by the engine render step: remove it if the engine's built-in figure now covers your use, or rename it otherwise`,
      );
    }
    if (c.defaultIconByRole && Object.keys(c.defaultIconByRole).length > 0 && !findIconField(c)) {
      throw new Error(
        `cairn: component "${c.name}" sets defaultIconByRole but declares no type:'icon' attribute, so the default icon can never render`,
      );
    }
  }
  const byName = new Map(components.map((c) => [c.name, c]));
  return {
    defs: components,
    names: components.map((c) => c.name),
    get: (name) => byName.get(name),
    defaultIcon: (name, role) => {
      if (!role) return undefined;
      const def = byName.get(name);
      if (!def || !findIconField(def)) return undefined;
      return def.defaultIconByRole?.[role] ?? DEFAULT_ICON_BY_ROLE[role];
    },
    iconField: (name) => {
      const def = byName.get(name);
      return def ? findIconField(def) : undefined;
    },
  };
}

/**
 * Guided-form values for one component: attribute values keyed by attribute key, slot values keyed
 *  by slot name (a string, or a string list for a repeatable slot).
 */
export interface ComponentValues {
  attributes: Record<string, string | boolean>;
  slots: Record<string, string | string[]>;
}

/**
 * Seed an empty {@link ComponentValues} from a component's schema: attribute defaults (or '' / false)
 *  and empty slot values ([] for repeatable, '' otherwise).
 */
export function emptyValues(def: ComponentDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const [name, field] of Object.entries(def.attributes ?? {})) {
    attributes[name] = field.default ?? (field.type === 'boolean' ? false : '');
  }
  const slots: Record<string, string | string[]> = {};
  for (const slot of def.slots ?? []) {
    slots[slot.name] = slot.kind === 'repeatable' ? [] : '';
  }
  return { attributes, slots };
}

/**
 * Seed {@link ComponentValues} from a component's `preview` sample: the {@link emptyValues} base
 *  with `def.preview.attributes` and `def.preview.slots` overlaid (a shallow merge per side). When
 *  the def declares no `preview`, returns exactly the {@link emptyValues} output.
 */
export function previewValues(def: ComponentDef): ComponentValues {
  const base = emptyValues(def);
  if (!def.preview) return base;
  return {
    attributes: { ...base.attributes, ...def.preview.attributes },
    slots: { ...base.slots, ...def.preview.slots },
  };
}

/** The descriptor types that serialize to a single directive-attribute string (decision 2). */
const ATTRIBUTE_TYPES = new Set(['text', 'textarea', 'number', 'select', 'url', 'email', 'date', 'datetime', 'boolean', 'icon']);

/** Reject an attribute type that cannot serialize to a single directive-attribute string (decision 2). */
function checkComponentAttributes(name: string, attributes: Record<string, FieldDescriptor>): void {
  for (const [key, field] of Object.entries(attributes)) {
    if (!ATTRIBUTE_TYPES.has(field.type)) {
      throw new Error(
        `cairn: component "${name}" attribute "${key}" is type "${field.type}"; a directive attribute must be a single-value scalar (text, textarea, number, select, url, email, date, datetime, boolean, or icon).`,
      );
    }
  }
}

/**
 * Declare a site component, building its attribute validator from the `fields.*` descriptors and
 *  validating the component at declaration. Mirrors {@link defineConcept}: a malformed attribute type
 *  or pattern fails at module load. The built `attributeSchema` is what {@link validateComponent} runs.
 */
export function defineComponent<const D extends ComponentDef>(def: D): D & { attributeSchema: Fieldset } {
  const attributes = def.attributes ?? {};
  checkComponentAttributes(def.name, attributes);
  return { ...def, attributeSchema: fieldset(attributes, { behavior: def.behavior }) };
}
