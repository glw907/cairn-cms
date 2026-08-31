// cairn-cms: the retires pass, Task 2's compile-only proof for the 18 sanctioned NavIcon-class
// leaks (r4-rederivation section 7, the F-1 hybrid ruling). Each block below types one value using
// the exact replacement expression the move record
// (docs/internal/record/2026-08-30-retires-move-record.md) prescribes for a name this task
// retired, against the SOURCE declaration of its keep parent (the env-genericity.test.ts idiom:
// relative `../../lib/...` imports, never the package's own subpaths). This proves the structural
// form compiles; the shipped-subpath proof that a consumer installing the tarball sees the same
// shape is `check:consumers`, not this file.
import { describe, it, expect } from 'vitest';
import type { AdminData } from '../../lib/sveltekit/cairn-admin.js';
import type { AuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import type { EditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import type { EditData, ListData, HelpData, AdminShellData } from '../../lib/sveltekit/content-routes-core.js';
import type { HistoryData } from '../../lib/sveltekit/types.js';
import type { MediaLibraryData } from '../../lib/sveltekit/content-routes-media.js';
import type { NavLoadData } from '../../lib/sveltekit/nav-routes.js';
import type { SettingsData } from '../../lib/sveltekit/content-routes-settings.js';
import type { ReproStory } from '../../lib/reproductions/index.js';

// The one runtime test in this compile-only file, the same reason env-genericity.test.ts carries
// one: vitest fails a `.test.ts` that declares no suite. The eighteen `typeOnly*` functions below
// never run; `npm run check` is what reads them.
describe('retires pass Task 2: sanctioned-leak replacement expressions', () => {
  it('is a compile-only fixture, collected so the file is a test module', () => {
    expect(true).toBe(true);
  });
});

// EditData's five return-position leaks: AdvisoryNotice, AdvisoryAction, LinkTarget,
// FragmentTarget, PublishActionLink, ResolvedPreview (six names; AdvisoryAction is the two-hop
// case, reached through AdvisoryNotice).
function typeOnlyEditDataLeaks(data: EditData): void {
  const advisory: EditData['advisories'][number] = data.advisories[0];
  void advisory;
  const action: NonNullable<EditData['advisories'][number]['actions']>[number] =
    data.advisories[0].actions![0];
  void action;
  const linkTarget: EditData['linkTargets'][number] = data.linkTargets[0];
  void linkTarget;
  const fragmentTarget: NonNullable<EditData['fragmentTargets']>[number] = data.fragmentTargets![0];
  void fragmentTarget;
  const publishActionLink: EditData['publishActions'][number] = data.publishActions[0];
  void publishActionLink;
  const resolvedPreview: NonNullable<EditData['preview']> = data.preview!;
  void resolvedPreview;
}
void typeOnlyEditDataLeaks;

// AdminData's three view-discriminated page leaks: LoginData, ConfirmData, EditorsData.
function typeOnlyAdminDataLeaks(data: AdminData, auth: AuthRoutes, editors: EditorRoutes): void {
  const loginData: Extract<AdminData, { view: 'login' }>['page'] =
    data.view === 'login' ? data.page : ({} as Extract<AdminData, { view: 'login' }>['page']);
  void loginData;
  const loginDataViaRoutes: Awaited<ReturnType<AuthRoutes['loginLoad']>> = {} as Awaited<
    ReturnType<AuthRoutes['loginLoad']>
  >;
  void loginDataViaRoutes;
  void auth;

  const confirmData: Extract<AdminData, { view: 'confirm' }>['page'] =
    data.view === 'confirm' ? data.page : ({} as Extract<AdminData, { view: 'confirm' }>['page']);
  void confirmData;

  const editorsData: Extract<AdminData, { view: 'editors' }>['page'] =
    data.view === 'editors' ? data.page : ({} as Extract<AdminData, { view: 'editors' }>['page']);
  void editorsData;
  const editorsDataViaRoutes: Awaited<ReturnType<EditorRoutes['editorsLoad']>> = {} as Awaited<
    ReturnType<EditorRoutes['editorsLoad']>
  >;
  void editorsDataViaRoutes;
  void editors;
}
void typeOnlyAdminDataLeaks;

// ListData's leak: EntrySummary.
function typeOnlyListDataLeak(data: ListData): void {
  const entrySummary: ListData['entries'][number] = data.entries[0];
  void entrySummary;
}
void typeOnlyListDataLeak;

// HelpData's two leaks: GettingStarted, MarkdownReferenceRow.
function typeOnlyHelpDataLeaks(data: HelpData): void {
  const gettingStarted: HelpData['gettingStarted'] = data.gettingStarted;
  void gettingStarted;
  const markdownReferenceRow: HelpData['reference'][number] = data.reference[0];
  void markdownReferenceRow;
}
void typeOnlyHelpDataLeaks;

// HistoryData's leak: HistoryEntry.
function typeOnlyHistoryDataLeak(data: HistoryData): void {
  const historyEntry: HistoryData['entries'][number] = data.entries[0];
  void historyEntry;
}
void typeOnlyHistoryDataLeak;

// MediaLibraryData's leak: MediaUsageInfo, indexed by content hash.
function typeOnlyMediaLibraryDataLeak(data: MediaLibraryData): void {
  const mediaUsageInfo: MediaLibraryData['usage'][string] = data.usage['some-hash'];
  void mediaUsageInfo;
}
void typeOnlyMediaLibraryDataLeak;

// AdminShellData's leak: NavConcept, reached through the authed arm of the discriminated union.
function typeOnlyAdminShellDataLeak(data: Extract<AdminShellData, { public: false }>): void {
  const navConcept: Extract<AdminShellData, { public: false }>['concepts'][number] = data.concepts[0];
  void navConcept;
}
void typeOnlyAdminShellDataLeak;

// NavLoadData's leak: NavPageOption.
function typeOnlyNavLoadDataLeak(data: NavLoadData): void {
  const navPageOption: NavLoadData['pages'][number] = data.pages[0];
  void navPageOption;
}
void typeOnlyNavLoadDataLeak;

// SettingsData's leak: TidyKeyProbeResult, the value excluding the sibling 'missing' literal.
function typeOnlySettingsDataLeak(data: SettingsData): void {
  const tidyKeyProbeResult: Exclude<SettingsData['keyStatus'], 'missing'> = data.keyStatus as Exclude<
    SettingsData['keyStatus'],
    'missing'
  >;
  void tidyKeyProbeResult;
}
void typeOnlySettingsDataLeak;

// ReproStory's leak: ReproInstance, the mounted component's own exports, read off `pose`'s own
// second parameter rather than by the retired name.
function typeOnlyReproStoryLeak(story: ReproStory): void {
  const reproInstance: Parameters<NonNullable<ReproStory['pose']>>[1] = {} as Parameters<
    NonNullable<ReproStory['pose']>
  >[1];
  void reproInstance;
  void story;
}
void typeOnlyReproStoryLeak;
