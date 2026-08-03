import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports } from '../../../scripts/reference-coverage.mjs';

// The 72 names the surface-pruning pass demotes from the root barrel (Task 1), plus the
// `ResolvedReference` reshape (its home becomes `/delivery` only) and `RoutingRule` (Task 5,
// demoted alongside the routing-union change: `RoutingRule` is the internal normalization target
// only, no longer an accepted `ConceptConfig.routing` value). Verbatim from
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
  'ManifestDiff',
  'ManifestEntryDiff',
  // Task 9's export-rule sweep gives these two a home on `/sveltekit` (the facade's own inbound
  // and link-target payloads name them), which leaves the root demotion standing: the sweep moved
  // where they are importable from, never back onto this barrel.
  'LinkTarget',
  'InboundLink',
  'InboundReference',
  'SlotKind',
  'ComponentValues',
  'ComponentValidation',
  'ComponentInsert',
  'ReferenceOptions',
  'ResolvedReference',
];

// C2 breaking window (2026-08-02, R1): `ConceptUrlPolicy` demoted from the root barrel. The
// 2026-07-01 KEEP verdict carried no recorded defense; the type stays internal (used by
// `normalizeConcepts` and `defineConcept`), just no longer re-exported at the root.
const C2_DEMOTED = ['ConceptUrlPolicy'];

// C2 breaking window (2026-08-02): three names this pass removes outright, rather than demoting to
// an internal type. `Role` goes with the role-name widening to `string` (R1); `AuthEnv` and
// `BackendEnv` collapse into the one all-optional `CairnEnv`. Each carries a `Consumers must:`
// line in the changelog, so the root barrel must keep refusing the old name: a later re-export
// under a retired name would resurrect a contract this window deliberately ended.
const C2_REMOVED = ['Role', 'AuthEnv', 'BackendEnv'];

// C2 breaking window (2026-08-02, R4, Task 9): the export-rule sweep reverses the 2026-07-01
// pruning verdict for these 22 names. Each is genuinely named in a root-public signature
// (`ConceptConfig.datePrefix`, `ComponentDef.slots`, `Fieldset.behavior`, `Manifest.entries`,
// `ManifestEntry.references`, `ConceptDescriptor.routing`, and `FieldDescriptor`'s own union
// arms), so the new doctrine, every type named in a public signature is exported from a subpath
// the consumer already imports, outranks the July minimalism call for exactly this set. Moved
// into KEPT below rather than left in DEMOTED.
const C2_READDED = [
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
  'ReferenceEdge',
  'SlotDef',
  'RoutingRule',
];

// The keep list for the root subpath, from the audit verdicts doc's `## .` section
// (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`).
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
  'Editor',
  'CairnEnv',
  'AuthBranding',
  'MagicLinkMessage',
  'SendMagicLink',
  'EmailSender',
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
  'ConceptDescriptor',
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

  it('no longer resolves the C2 demoted names from the root subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = C2_DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('no longer resolves the names C2 removes outright from the root subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = C2_REMOVED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('resolves every C2 re-added name from the root subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const missing = C2_READDED.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });
});
