// Engine entry. Auth landed in Plan 01, the content model and adapter in Plan 02, and the
// GitHub read-and-commit backend in Plan 03; render and nav follow.
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
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
export { glyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
export { remarkDirectiveStamp } from './render/remark-directives.js';
export {
  rehypeDispatch,
  isElement,
  strProp,
  iconSpan,
  splitHead,
  cardShell,
  markFirstList,
} from './render/rehype-dispatch.js';
export type { MakeIcon } from './render/rehype-dispatch.js';
export { createRenderer } from './render/pipeline.js';
export type { RendererOptions } from './render/pipeline.js';

// GitHub read-and-commit backend (Plan 03).
export type { RepoRef, RepoFile, CommitAuthor, AppCredentials } from './github/types.js';
export { CommitConflictError } from './github/types.js';
export { appJwt, installationToken, signingSelfTest } from './github/signing.js';
export {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
  fileSha,
  commitFile,
} from './github/repo.js';
export { appCredentials } from './github/credentials.js';
export type { GithubKeyEnv } from './github/credentials.js';
