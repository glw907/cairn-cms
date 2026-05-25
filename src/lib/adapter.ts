// cairn-core: the adapter contract each site implements.
//
// This is the single seam that lets one admin surface serve different designs. A site
// supplies a `CairnAdapter` (see `src/lib/cairn.config.ts`) describing its backend repo,
// its editable collections (folder + form fields + frontmatter validator), and its preview
// plugin set. cairn-core never hard-codes a collection, tag, or directive — it reads them
// from the adapter. Field descriptors are plain data so a load function can hand them to
// the editor form across the server→client boundary.
import type { PreviewPlugins } from './carta';
import type { RepoRef } from './github';

interface FieldBase {
  /** Frontmatter key and form input name. */
  name: string;
  label: string;
  required?: boolean;
}

export interface TextField extends FieldBase {
  type: 'text';
}
export interface DateField extends FieldBase {
  type: 'date';
}
export interface TextareaField extends FieldBase {
  type: 'textarea';
  rows?: number;
}
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
export interface TagsField extends FieldBase {
  type: 'tags';
  /** Controlled vocabulary rendered as checkboxes. */
  options: readonly string[];
}

export type CairnField = TextField | DateField | TextareaField | BooleanField | TagsField;

export interface CairnCollection {
  /** Route `[type]` segment and list key, e.g. `posts`. */
  type: string;
  label: string;
  /** Repo-relative folder holding the collection's markdown files. */
  dir: string;
  /** Editor form fields, rendered in order. */
  fields: CairnField[];
  /** Validate raw frontmatter (from the form) into the on-disk object, throwing on error. */
  validate(data: Record<string, unknown>, source: string): object;
}

export interface CairnAdapter {
  /** Branding + magic-link email copy. */
  siteName: string;
  /** From: address for magic-link email — a domain-authenticated sender. */
  sender: string;
  /** The repository the admin reads content from and commits to. */
  backend: RepoRef;
  /** Site plugin set for the Carta preview (parity with the live render). */
  preview: PreviewPlugins;
  collections: CairnCollection[];
}

/** Look up a collection by its route segment, or undefined if the segment is unknown. */
export function findCollection(adapter: CairnAdapter, type: string): CairnCollection | undefined {
  return adapter.collections.find((collection) => collection.type === type);
}

/** Read raw frontmatter from a submitted form, decoding each value per its field type. */
export function frontmatterFromForm(
  collection: CairnCollection,
  form: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of collection.fields) {
    switch (field.type) {
      case 'boolean':
        data[field.name] = form.get(field.name) === 'on';
        break;
      case 'tags':
        data[field.name] = form.getAll(field.name).map(String);
        break;
      default:
        data[field.name] = form.get(field.name);
    }
  }
  return data;
}
