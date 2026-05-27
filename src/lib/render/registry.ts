import type { Element } from 'hast';

/** A site component: how it inserts (editor) and how it renders (rehype). */
export interface ComponentDef {
	/** Directive name, e.g. 'card' (matches `:::card`). */
	name: string;
	/** Palette label. */
	label: string;
	/** Palette description. */
	description: string;
	/** Markdown scaffold inserted at the cursor by the editor palette. */
	insertTemplate: string;
	/** Build the final hast element from the stamped directive element. */
	build: (node: Element, rise?: string) => Element;
	/** Optional role→default-icon (e.g. `{ caution: 'warning' }`). */
	defaultIconByRole?: Record<string, string>;
}

export interface ComponentRegistry {
	defs: ComponentDef[];
	names: string[];
	get(name: string): ComponentDef | undefined;
	defaultIcon(name: string, role?: string): string | undefined;
}

/** Build a registry from a site's component definitions. The single source the
 *  render pipeline (directive stamp + rehype dispatch) and the editor palette read. */
export function defineRegistry(input: { components: ComponentDef[] }): ComponentRegistry {
	const byName = new Map(input.components.map((c) => [c.name, c]));
	return {
		defs: input.components,
		names: input.components.map((c) => c.name),
		get: (name) => byName.get(name),
		defaultIcon: (name, role) => (role ? byName.get(name)?.defaultIconByRole?.[role] : undefined),
	};
}
