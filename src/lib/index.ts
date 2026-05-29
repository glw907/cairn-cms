// Engine entry. Auth landed in Plan 01; the content model and adapter land in Plan 02;
// github, render, and nav follow.
export { requireOrigin } from './env.js';
export type { Role, Editor, AuthEnv } from './auth/types.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink } from './email.js';
export { buildMagicLinkMessage, cloudflareSend } from './email.js';

// Content model and adapter contract (Plan 02).
export type {
  CairnAdapter,
  ConceptConfig,
  FrontmatterField,
  TextField,
  TextareaField,
  DateField,
  BooleanField,
  TagsField,
  FreeTagsField,
  ValidationResult,
  BackendConfig,
  SenderConfig,
  NavMenuConfig,
  AssetConfig,
  RoutingRule,
  ConceptDescriptor,
  CairnExtension,
  CairnRuntime,
} from './content/types.js';
export { CONCEPT_ROUTING, normalizeConcepts, findConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from './content/frontmatter.js';
export { validateFields } from './content/validate.js';
export { isValidId, idFromFilename, filenameFromId, slugify } from './content/ids.js';
export { defineRegistry } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
