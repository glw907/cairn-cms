import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports } from '../../../scripts/reference-coverage.mjs';

// The 72 names the surface-pruning pass demotes from the root barrel (Task 1), plus the
// `ResolvedReference` reshape (its home becomes `/delivery` only). Verbatim from
// `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`.
const DEMOTED = [
  'initialValues',
  'normalizeConcepts',
  'findConcept',
  'frontmatterFromForm',
  'dateInputValue',
  'serializeMarkdown',
  'isValidId',
  'idFromFilename',
  'filenameFromId',
  'slugify',
  'slugFromId',
  'composeDatedId',
  'parseCairnToken',
  'formatCairnToken',
  'extractCairnLinks',
  'escapeLinkText',
  'parseManifest',
  'emptyManifest',
  'diffManifests',
  'upsertEntry',
  'removeEntry',
  'inboundLinks',
  'manifestEntryFromFile',
  'manifestLinkResolver',
  'emptyValues',
  'serializeComponent',
  'parseComponent',
  'validateComponent',
  'buildComponentInsert',
  'generateComponentReference',
  'remarkDirectiveStamp',
  'requireOrigin',
  'buildMagicLinkMessage',
  'cloudflareSend',
  'setMenu',
  'validateNavTree',
  'validateVocabulary',
  'setVocabulary',
  'MAX_NAV_NODES',
  'NavValidationError',
  'ResolvedPreview',
  'TextField',
  'TextareaField',
  'NumberField',
  'SelectField',
  'MultiselectField',
  'UrlField',
  'EmailField',
  'DateField',
  'DatetimeField',
  'BooleanField',
  'IconField',
  'ImageField',
  'ObjectField',
  'ReferenceField',
  'ArrayField',
  'BehaviorTable',
  'FieldBehavior',
  'DatePrefix',
  'ManifestEntry',
  'ManifestDiff',
  'ManifestEntryDiff',
  'LinkTarget',
  'InboundLink',
  'InboundReference',
  'ReferenceEdge',
  'SlotKind',
  'SlotDef',
  'ComponentValues',
  'ComponentValidation',
  'ComponentInsert',
  'ReferenceOptions',
  'ResolvedReference',
];

// The keep list for the root subpath, from the audit verdicts doc's `## .` section
// (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`). `RoutingRule` is a
// deliberate exception: it is on the audit's keep list and stays exported through this task, and
// leaves the barrel only in Task 5 alongside the routing-union change.
const KEPT = [
  'defineAdapter',
  'defineConcept',
  'composeRuntime',
  'createRenderer',
  'defineRegistry',
  'defineComponent',
  'fields',
  'fieldset',
  'githubApp',
  'parseSiteConfig',
  'glyph',
  'parseMarkdown',
  'extractMenu',
  'extractVocabulary',
  'serializeManifest',
  'verifyManifest',
  'verifyReferences',
  'CommitConflictError',
  'SiteConfigError',
  'Role',
  'Editor',
  'AuthEnv',
  'AuthBranding',
  'MagicLinkMessage',
  'SendMagicLink',
  'CairnAdapter',
  'ConceptConfig',
  'NamedField',
  'ImageValue',
  'ValidationResult',
  'ValidationIssue',
  'SenderConfig',
  'NavMenuConfig',
  'PreviewConfig',
  'AssetConfig',
  'RoutingRule',
  'ConceptDescriptor',
  'ConceptUrlPolicy',
  'CairnRuntime',
  'SiteRender',
  'ComposeInput',
  'StandardInput',
  'StandardSchemaV1',
  'FieldDescriptor',
  'Fieldset',
  'InferFieldset',
  'FieldsetOptions',
  'CairnRef',
  'LinkResolve',
  'Manifest',
  'ComponentDef',
  'ComponentRegistry',
  'IconSet',
  'RendererOptions',
  'RepoFile',
  'CommitAuthor',
  'Backend',
  'BackendProvider',
  'GithubAppProvider',
  'BackendEnv',
  'FileChange',
  'NavNode',
  'SiteConfig',
  'VocabularyEntry',
];

const DTS = resolve(
  fileURLToPath(new URL('../../../dist/index.d.ts', import.meta.url)),
);

describe('root barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(DTS), 'missing dist/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from the root subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from the root subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const missing = KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });
});
