// cairn-cms: the directive block registry (seam 3). One declaration per block, carrying how it
// inserts in the editor and how it renders in rehype. The render pipeline and the insert palette
// both derive from this single source, so the parser, the render dispatch, and the editor never
// drift apart.
import type { Element, ElementContent } from 'hast';
import type { FieldDescriptor } from '../content/fields.js';
import type { BehaviorTable, Fieldset } from '../content/fieldset.js';
import { defineFieldset } from '../content/fieldset.js';

type SlotKind = 'markdown' | 'inline' | 'repeatable';

/**
 * One named content region of a block. The slots named `title` and `body` are special: `title`
 *  serializes to the directive `[label]` and `body` to the unmarked content (see the canonical grammar).
 * @public
 */
export interface SlotDef {
  /** The slot's name, unique within the block; `title` and `body` are the special two. */
  name: string;
  /** The label the insert form shows for the slot's input. */
  label: string;
  /** How the slot's content is entered: `markdown`, `inline`, or `repeatable` (a list of items). */
  kind: SlotKind;
  /**
   * Whether the insert form requires a value for this slot (default `false`): it shows an asterisk
   *  and keeps the insert action unavailable until the slot has content. The render never reads it,
   *  so a hand-typed directive without the slot still renders.
   */
  required?: boolean;
  /** Help text the insert form shows under the slot's control; the control is described by it. */
  help?: string;
  /**
   * For `kind: 'repeatable'`: the fields composing each list item. The insert form reads only the
   *  first key. Each item is one string stored under that key, or under `text` when this is absent.
   */
  itemFields?: Record<string, FieldDescriptor>;
  /**
   * For `kind: 'repeatable'`: derives a row's label from its item values and zero-based index.
   *  When it returns nothing, the picker falls back to `${label} ${index + 1}`.
   */
  itemLabel?: (item: Record<string, string | boolean>, index: number) => string;
}

/**
 * The structured input a block's `build` receives. The engine stamps the block's
 *  attributes and partitions its slots from the rendered hast, so `build` arranges hast and
 *  never walks the tree. `slot(name)` returns a slot's rendered children (title, body, or any
 *  named slot); `items(name)` returns a repeatable slot's items, one child list per item.
 * @public
 */
export interface BlockContext {
  /** Declared attribute values, keyed by attribute key. Booleans are real booleans. */
  attributes: Record<string, string | boolean>;
  /** A named slot's rendered children. Returns `[]` for an absent or empty slot. */
  slot(name: string): ElementContent[];
  /** A repeatable slot's items, each item its list of rendered children. `[]` when absent. */
  items(name: string): ElementContent[][];
  /** A declared attribute's string value. `undefined` for a boolean or absent value. */
  attr(key: string): string | undefined;
  /** The stamped block element, for an escape hatch. Most builds never need it. */
  node: Element;
}

/**
 * A site block: how it inserts (editor) and how it renders (rehype).
 * @public
 */
export interface BlockDef {
  /** Directive name, e.g. 'card' (matches `:::card`). */
  name: string;
  /** Palette label. */
  label: string;
  /** Palette description. */
  description: string;
  /**
   * Markdown scaffold the editor palette inserts at the cursor when the block declares no
   *  `attributes` and no `slots`; with either, the insert form opens instead. Defaults to none.
   */
  insertTemplate?: string;
  /**
   * Build the final hast element from the block context (attributes plus partitioned
   *  slots). The engine stamps the entrance ordinal (`data-rise`) on the top-level
   *  result, so a build fn stays free of any motion concern. Synchronous by design: it returns an
   *  `Element`, never a `Promise`, because it runs inline in the pipeline's synchronous hast
   *  transform once per directive occurrence. A block needing data it lacks pre-fetches it
   *  outside the pipeline and passes it through `attributes`.
   */
  build: (ctx: BlockContext) => Element;
  /**
   * Opt this directive into client hydration. `true` mounts the island eagerly on
   *  first load and after client-side navigation; `'visible'` defers the mount to first intersection.
   *  The engine wraps {@link BlockDef.build}'s output in an island boundary, and the site registers
   *  the live Svelte component under the same name on `rendering.islands`. Absent leaves the directive a
   *  static, server-only block.
   * @remarks
   * The boundary is a `<div>` carrying `data-cairn-island` (the directive name), `data-cairn-props`
   * (the declared attributes as JSON: a `number` field a JSON number, a `boolean` field a JSON boolean,
   * every other field the author's literal string), and `data-cairn-hydrate="visible"` on a `'visible'`
   * island only. Its one child is `build()`'s output, the no-JS fallback and the page's first paint, so
   * make it show the live component's starting content at the same size or the mount shifts the layout.
   * The editor preview frame is sandboxed, so the island runtime never mounts there and the preview
   * shows the fallback.
   */
  hydrate?: boolean | 'visible';
  /**
   * Optional role-to-default-icon, e.g. `{ caution: 'warning' }`. Maps a free-string role to a
   *  glyph key in the site IconSet; choose a logically representative glyph and prefer glyphs
   *  distinct across roles so the picker stays scannable. Overrides the engine
   *  {@link DEFAULT_ICON_BY_ROLE} fallback for the roles it names. The built-in fallback covers
   *  `note`, `tip`, `important`, `warning`, `caution`, `info`, and `danger`. Resolves nothing for a
   *  block with no `icon` attribute.
   */
  defaultIconByRole?: Record<string, string>;
  /** One line on when to reach for this block; feeds the picker and the reference file. */
  use?: string;
  /** The `{key="value"}` attributes this block accepts, keyed by attribute name. */
  attributes?: Record<string, FieldDescriptor>;
  /**
   * Per-attribute function-valued behavior (a cross-field `validate`), keyed by attribute name.
   *  {@link defineBlock} bundles it into the attribute {@link Fieldset}.
   */
  behavior?: BehaviorTable;
  /** The named content regions this block accepts. */
  slots?: SlotDef[];
  /**
   * A glyph key from the site IconSet, shown beside the label in the picker. Choose a logically
   *  representative glyph and prefer glyphs distinct across blocks so the picker stays scannable.
   */
  icon?: string;
  /** A category heading for the picker. Blocks order by declaration within a group. */
  group?: string;
  /** Omit from the top-level picker (for a nested or round-trip-only block). */
  hidden?: boolean;
  /**
   * A structured sample the picker seeds the form with and renders through the same path a real
   *  insert takes. Declaring `preview` is what opts the block into the two-pane configure layout.
   */
  preview?: {
    /** The sample attribute values, keyed by attribute name. */
    attributes?: Record<string, string | boolean>;
    /** The sample slot content, keyed by slot name; a repeatable slot takes one string per item. */
    slots?: Record<string, string | string[]>;
  };
}

/**
 * A declared block as {@link defineBlock} returns it: the declaration plus the attribute validator
 *  built from its `attributes` and `behavior`, which {@link validateComponent} runs.
 * @public
 */
export type RegisteredBlock<D extends BlockDef = BlockDef> = D & {
  /** The attribute validator. Engine-internal: {@link defineBlock} sets it. */
  attributeSchema: Fieldset;
};

/**
 * A site's blocks by name, as `defineRegistry` builds it.
 * @public
 */
export interface BlockRegistry {
  defs: BlockDef[];
  names: string[];
  get(name: string): BlockDef | undefined;
  defaultIcon(name: string, role?: string): string | undefined;
  /** The name of the block's first `type:'icon'` attribute, or undefined when it declares none. */
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
function findIconField(def: BlockDef): string | undefined {
  return Object.entries(def.attributes ?? {}).find(([, field]) => field.type === 'icon')?.[0];
}

/**
 * The engine's role-to-glyph-key fallback for the conventional admonition roles, which a site's
 *  IconSet may satisfy. A component's {@link BlockDef.defaultIconByRole} overrides it.
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

/** Directive names the engine's render step handles; a site cannot register a component under one. */
const RESERVED_DIRECTIVE_NAMES = new Set(['figure', 'include']);

/**
 * Build a registry from a site's block definitions. The single source the render
 * pipeline (directive stamp plus rehype dispatch) and the editor palette both read.
 * `createRenderer`, `defineAdapter`, and the admin call it on the `blocks` array they receive, so a
 * site reaches for it only to read a registry of its own.
 * @throws When a block is named `figure` or `include` (reserved for the engine's render step),
 * or sets `defaultIconByRole` without declaring a `type: 'icon'` attribute.
 * @public
 */
export function defineRegistry({ blocks }: {
  /** The site's block definitions, each built with `defineBlock`. */
  blocks: readonly BlockDef[];
}): BlockRegistry {
  for (const c of blocks) {
    if (RESERVED_DIRECTIVE_NAMES.has(c.name)) {
      throw new Error(
        `cairn: block "${c.name}" uses "${c.name}", a reserved directive name handled by the engine render step: remove it if the engine's built-in ${c.name} now covers your use, or rename it otherwise`,
      );
    }
    if (c.defaultIconByRole && Object.keys(c.defaultIconByRole).length > 0 && !findIconField(c)) {
      throw new Error(
        `cairn: block "${c.name}" sets defaultIconByRole but declares no type:'icon' attribute, so the default icon can never render`,
      );
    }
  }
  const byName = new Map(blocks.map((c) => [c.name, c]));
  return {
    defs: [...blocks],
    names: blocks.map((c) => c.name),
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
export function emptyValues(def: BlockDef): ComponentValues {
  const attributes: Record<string, string | boolean> = {};
  for (const [name, field] of Object.entries(def.attributes ?? {})) {
    const d = field.default;
    attributes[name] =
      typeof d === 'number' ? String(d) : typeof d === 'object' || d === undefined ? (field.type === 'boolean' ? false : '') : d;
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
export function previewValues(def: BlockDef): ComponentValues {
  const base = emptyValues(def);
  if (!def.preview) return base;
  return {
    attributes: { ...base.attributes, ...def.preview.attributes },
    slots: { ...base.slots, ...def.preview.slots },
  };
}

/** The descriptor types that serialize to a single directive-attribute string (decision 2). */
const ATTRIBUTE_TYPES: Set<FieldDescriptor['type']> = new Set([
  'text', 'textarea', 'number', 'select', 'url', 'date', 'boolean', 'icon',
]);

/** Reject an attribute type that cannot serialize to a single directive-attribute string (decision 2). */
function checkComponentAttributes(name: string, attributes: Record<string, FieldDescriptor>): void {
  for (const [key, field] of Object.entries(attributes)) {
    if (!ATTRIBUTE_TYPES.has(field.type)) {
      throw new Error(
        `cairn: block "${name}" attribute "${key}" is type "${field.type}"; a directive attribute must be a single-value scalar (text, textarea, number, select, url, date, boolean, or icon).`,
      );
    }
  }
}

/**
 * Declare a site block, building its attribute validator from the `fields.*` descriptors and
 *  validating the block at declaration. Mirrors {@link defineConcept}: a malformed attribute type
 *  or pattern fails at module load. The built `attributeSchema` is what {@link validateComponent} runs.
 * @remarks
 * A directive attribute is one flat string, so `attributes` may hold only the scalar leaves `text`,
 * `textarea`, `number`, `select`, `url`, `date`, `boolean`, and `icon`. A
 * cross-field attribute rule goes in the co-bundled `behavior` table, keyed by attribute name.
 * A block with `attributes` or `slots` opens the insert form; one with neither is picked by its
 * `insertTemplate`, and a block with neither a schema nor an `insertTemplate` does not appear
 * in the picker.
 * @throws When an attribute is an `object`, `array`, `multiselect`, `reference`, or `image`, or when
 * an attribute `pattern` is malformed.
 * @public
 */
export function defineBlock<const D extends BlockDef>(def: D): RegisteredBlock<D> {
  const attributes = def.attributes ?? {};
  checkComponentAttributes(def.name, attributes);
  return { ...def, attributeSchema: defineFieldset(attributes, { behavior: def.behavior }) };
}
