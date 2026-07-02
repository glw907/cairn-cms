// cairn-cms: the tidy settings screen and the tag-vocabulary admin screen, both of which
// read-modify-commit the same committed site-config YAML. createSettingsActions closes over the
// shared ContentRoutesContext (content-routes-context.ts) built once by createContentRoutes.
import { redirect, error } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import {
  DEFAULT_TIDY_MODEL,
  resolveTidyConventions,
  parseSiteConfig,
  setTidy,
  validateTidyConventions,
  TidyConventionsError,
  extractVocabulary,
  setVocabulary,
  validateVocabulary,
} from '../nav/site-config.js';
import type { TidyConventions, VocabularyEntry } from '../nav/site-config.js';
import { emptyManifest, parseManifest } from '../content/manifest.js';
import { buildTagUsageIndex } from '../content/tag-usage-index.js';
import { requireSession } from './guard.js';
import type { ContentRoutesContext, ContentEvent } from './content-routes-context.js';

/**
 * The two-tier tidy settings load (spec 2.8, Task 15). The developer tier is read-only: `enabled`,
 *  `keyConfigured`, and `model`/`modelLabel` are deploy-time facts the editor sees but cannot change.
 *  The editor tier is the resolved `conventions` block, written back through the save. The visibility
 *  gate is truthful: `enabled` is true only when `tidy.enabled` is set AND the API key is present, so
 *  the screen renders the convention list only then and the honest gate note otherwise. The key is a
 *  Worker secret, so `keyConfigured` is the presence of `ANTHROPIC_API_KEY` in the load's env, never
 *  the key itself; nothing here returns or logs the secret.
 */
export interface SettingsData {
  /**
   * The truthful gate: tidy is enabled AND the API key is present. The screen renders the editor
   *  tier only when this is true, and the honest gate note (a labelled region, no disabled controls)
   *  otherwise.
   */
  enabled: boolean;
  /**
   * Whether `tidy.enabled` is set in the site config, independent of the key. The gate note's
   *  checklist reads this to show which deploy-time step is still open.
   */
  tidyEnabled: boolean;
  /** Whether the API key secret is present in the Worker env. A presence flag, never the key. */
  keyConfigured: boolean;
  /** The model id (a developer-tier fact, read-only on the screen). */
  model: string;
  /**
   * A plain-language label for the model id ("Claude Sonnet"), so the read-only fact is not a bare
   *  jargon token. Falls back to the raw id for an unknown model.
   */
  modelLabel: string;
  /**
   * The resolved editor-tier conventions: every field concrete, the screen's initial control state.
   *  Present only when the gate is open; the gate state needs no conventions.
   */
  conventions: TidyConventions;
  /** The success flash a redirected save carries (`?saved=1`). */
  saved: boolean;
  /** A redirected save's validation or conflict error read from `?error=`. */
  error: string | null;
}

/**
 * A refused settings save: a conflict bounce or a malformed conventions payload. Just the one-line
 *  summary; the save commits nothing on a refusal.
 */
export interface SettingsSaveFailure {
  error: string;
}

/**
 * The vocabulary admin screen's data: the committed tag vocabulary, a per-value cross-branch usage
 *  count, and the in-use-but-unlisted seed set. The usage overlay is best-effort, so it degrades to
 *  an empty `usage`/`unlisted` while the committed `vocabulary` stays visible when a read fails.
 */
export interface VocabularyLoadData {
  /** The committed `{ value, label }` entries, in config order. */
  vocabulary: VocabularyEntry[];
  /** Each vocabulary value to its cross-branch in-use count (main plus open cairn/* branches). */
  usage: Record<string, number>;
  /** Tags in use but absent from the vocabulary, with their count, sorted: the seed candidates. */
  unlisted: { value: string; count: number }[];
}

/**
 * The fallback site-config path when no nav menu names one: the convention every scaffolded site
 *  uses. The settings save edits the same committed YAML the nav editor does, so it resolves the path
 *  from the configured nav menu first and falls back to this default.
 */
const DEFAULT_SITE_CONFIG_PATH = 'src/lib/site.config.yaml';

/**
 * Plain-language labels for the known tidy models, so the read-only model fact reads as a name rather
 *  than a bare id. An unknown id falls back to itself.
 */
const TIDY_MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-6': 'Claude Sonnet',
  'claude-haiku-4-5': 'Claude Haiku',
};

/** The display label for a tidy model id, falling back to the raw id for an unknown model. */
function tidyModelLabel(model: string): string {
  return TIDY_MODEL_LABELS[model] ?? model;
}

/** Build the tidy settings and tag-vocabulary loads and saves, closed over the shared context. */
export function createSettingsActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * The repo-relative site-config path the settings save reads and commits. It is the same committed
   *  YAML the nav editor edits, so it comes from the configured nav menu first and falls back to the
   *  scaffold default when no menu is configured.
   */
  function siteConfigPath(): string {
    return runtime.navMenu?.configPath ?? DEFAULT_SITE_CONFIG_PATH;
  }

  /**
   * Read whether the Anthropic API key secret is present in the load's env. A presence flag for the
   *  truthful visibility gate, never the key itself: the key is a Worker secret, so this only reports
   *  that a non-empty `ANTHROPIC_API_KEY` exists and the value never leaves the server.
   */
  function keyConfigured(event: ContentEvent): boolean {
    const env = (event.platform?.env ?? {}) as Record<string, unknown>;
    return typeof env.ANTHROPIC_API_KEY === 'string' && env.ANTHROPIC_API_KEY.length > 0;
  }

  /**
   * Load the two-tier tidy settings (spec 2.8, Task 15). The developer tier (enabled, key, model) is
   *  read-only; the editor tier is the resolved conventions block. The visibility gate is truthful: the
   *  `enabled` flag is true only when `tidy.enabled` is set AND the key is present, so the screen renders
   *  the convention list only then and the honest gate note otherwise. No secret is returned: only a
   *  presence flag for the key. The conventions come straight from the runtime config (the same source
   *  the tidy action's prompt reads), so the screen and the prompt can never diverge.
   */
  function settingsLoad(event: ContentEvent): SettingsData {
    requireSession(event);
    const tidy = runtime.tidy;
    const tidyEnabled = tidy?.enabled === true;
    const keyPresent = keyConfigured(event);
    const model = tidy?.model || DEFAULT_TIDY_MODEL;
    return {
      enabled: tidyEnabled && keyPresent,
      tidyEnabled,
      keyConfigured: keyPresent,
      model,
      modelLabel: tidyModelLabel(model),
      conventions: resolveTidyConventions(tidy?.conventions),
      saved: event.url.searchParams.get('saved') === '1',
      error: event.url.searchParams.get('error'),
    };
  }

  /**
   * Save the editor-tier tidy conventions: validate the posted block, then read-modify-commit it into
   *  the same committed YAML the nav editor writes, with the session editor as author. The transport is
   *  the nav save's exactly: a form POST carrying the conventions JSON, a head-guarded
   *  `backend.commit`, and a stale-head `isConflict` bounced back as a reload prompt. Only the conventions
   *  block is written (setTidy leaves `tidy.enabled` and `tidy.model` untouched), so an editor's save can
   *  never flip the developer-tier deploy facts. The save refuses before any commit when tidy is not
   *  enabled, so the gate state's absent editor tier can never be saved past.
   */
  async function settingsSave(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    // The editor tier does not exist when tidy is off, so a save in that state is a 404 (no editable
    // surface to commit), the server half of the truthful gate.
    if (runtime.tidy?.enabled !== true) throw error(404, 'Tidy is not enabled for this site');

    const form = await event.request.formData();
    let conventions: TidyConventions;
    try {
      conventions = validateTidyConventions(JSON.parse(String(form.get('conventions') ?? '{}')));
    } catch (err) {
      const message = err instanceof TidyConventionsError ? err.message : 'Invalid tidy settings';
      throw redirect(303, `/admin/settings?error=${encodeURIComponent(message)}`);
    }

    const path = siteConfigPath();
    const backend = ctx.resolveBackend(event);
    // Read the head BEFORE the content, so this expectedHead is at-or-before the bytes the commit
    // merges. The settings write lands on the default branch and triggers a deploy, so it is
    // fail-closed: a concurrent commit to the config moves the head off this value and the commit
    // throws a conflict, surfacing the reload-and-reapply prompt below rather than a last-writer-wins.
    const head = await backend.branchHead(backend.defaultBranch);
    const raw = await backend.readFile(path, backend.defaultBranch);
    if (raw === null) throw error(404, 'Site config not found');
    // Parse first so a malformed file fails before the write rather than committing onto a broken base.
    parseSiteConfig(raw);

    const commitFields = { concept: 'settings', id: 'tidy', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path, content: setTidy(raw, conventions) }],
        { name: editor.displayName, email: editor.email },
        'Update tidy settings',
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      if (isConflict(err)) {
        log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
        const message = 'The site config changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/settings?error=${encodeURIComponent(message)}`);
      }
      log.error('commit.failed', { ...commitFields, error: String(err) });
      throw err;
    }

    throw redirect(303, '/admin/settings?saved=1');
  }

  /**
   * Load the tag-vocabulary admin screen (Plan 3): the committed vocabulary plus a per-value
   *  cross-branch usage count and the in-use-but-unlisted seed set. The committed list is read on the
   *  default branch and degrades to `[]` on a read or parse failure, mirroring navLoad, so the screen
   *  still opens. The usage overlay is best-effort and separate, mirroring mediaLibraryLoad: the
   *  manifest read and the non-strict buildTagUsageIndex share one try/catch that degrades `usage` to
   *  `{}` and `unlisted` to `[]` on any failure, keeping the committed vocabulary visible. The safety
   *  boundary is the strict gate on vocabularySave, never this load, so degrading here is correct.
   */
  async function vocabularyLoad(event: ContentEvent): Promise<VocabularyLoadData> {
    requireSession(event);
    const backend = ctx.resolveBackend(event);

    let vocabulary: VocabularyEntry[] = [];
    let raw: string | null = null;
    try {
      raw = await backend.readFile(siteConfigPath(), backend.defaultBranch);
    } catch {
      // An unreadable config degrades to an empty vocabulary; the first save writes a clean list.
      raw = null;
    }
    if (raw !== null) {
      try {
        vocabulary = extractVocabulary(parseSiteConfig(raw));
      } catch (err) {
        // A malformed config keeps the same degrade rather than failing the screen closed; the
        // swallow names the operator fault in the log, as navLoad does.
        log.error('config.invalid', {
          conditionId: 'config.site-config-invalid',
          error: String(err),
        });
        vocabulary = [];
      }
    }

    // The usage overlay is best-effort: a transient manifest or branch-list failure must keep the
    // committed vocabulary visible, never 500 the whole screen (the dispatcher has no load-level
    // try/catch, and the non-strict index still rethrows a listBranches failure). The strict gate on
    // the save is the safety boundary, not this read.
    let usage: Record<string, number> = {};
    let unlisted: { value: string; count: number }[] = [];
    try {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      const usageIndex = await buildTagUsageIndex(backend, runtime.concepts, manifest, {});
      const listed = new Set(vocabulary.map((entry) => entry.value));
      usage = Object.fromEntries(vocabulary.map((entry) => [entry.value, usageIndex.get(entry.value)?.length ?? 0]));
      unlisted = [...usageIndex]
        .filter(([value]) => !listed.has(value))
        .map(([value, rows]) => ({ value, count: rows.length }))
        .sort((a, b) => a.value.localeCompare(b.value));
    } catch {
      usage = {};
      unlisted = [];
    }

    return { vocabulary, usage, unlisted };
  }

  /**
   * Save the tag vocabulary (Plan 3): validate the posted list, gate a delete on cross-branch usage
   *  failing closed, then read-modify-commit the `vocabulary` key into the same committed YAML the
   *  nav and settings saves write. The transport is settingsSave's exactly: a form POST carrying the
   *  vocabulary JSON, a head-guarded backend.commit, and a stale-head isConflict bounced back as a
   *  reload prompt. The delete gate is the safety boundary: a removed value still in use anywhere the
   *  strict index reads (main plus open cairn/* branches) is rejected by name, so a still-used tag can
   *  never be deleted out from under a draft. Rename (label change, same value) and add always commit.
   */
  async function vocabularySave(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);

    const form = await event.request.formData();
    let posted: VocabularyEntry[];
    try {
      posted = validateVocabulary(JSON.parse(String(form.get('vocabulary') ?? '[]')));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid vocabulary';
      throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
    }

    const path = siteConfigPath();
    const backend = ctx.resolveBackend(event);
    // Read the head BEFORE the content, so this expectedHead is at-or-before the bytes the commit
    // merges. The vocabulary write lands on the default branch and triggers a deploy, so it is
    // fail-closed: a concurrent commit to the config moves the head off this value and the commit
    // throws a conflict, surfacing the reload-and-reapply prompt below rather than a last-writer-wins.
    const head = await backend.branchHead(backend.defaultBranch);
    const raw = await backend.readFile(path, backend.defaultBranch);
    if (raw === null) throw error(404, 'Site config not found');

    // The delete gate: any value in the current vocabulary but absent from the posted one is being
    // removed, and a removed value still in use anywhere the strict index reads must block the save.
    const current = extractVocabulary(parseSiteConfig(raw));
    const postedValues = new Set(posted.map((entry) => entry.value));
    const removed = current.filter((entry) => !postedValues.has(entry.value)).map((entry) => entry.value);
    if (removed.length > 0) {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      // strict: a transient branch-read failure must not read a still-used value as free, so it
      // rethrows and the save fails rather than deleting an in-use tag.
      const usageIndex = await buildTagUsageIndex(backend, runtime.concepts, manifest, { strict: true });
      const inUse = removed.find((value) => (usageIndex.get(value)?.length ?? 0) > 0);
      if (inUse !== undefined) {
        const message = `The tag "${inUse}" is still in use, so it cannot be deleted. Remove it from your content first.`;
        throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
      }
    }

    const commitFields = { concept: 'vocabulary', id: 'site-config', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path, content: setVocabulary(raw, posted) }],
        { name: editor.displayName, email: editor.email },
        'Update tag vocabulary',
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      if (isConflict(err)) {
        log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
        const message = 'The site config changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
      }
      log.error('commit.failed', { ...commitFields, error: String(err) });
      throw err;
    }

    throw redirect(303, '/admin/vocabulary?saved=1');
  }

  return { settingsLoad, settingsSave, vocabularyLoad, vocabularySave };
}
