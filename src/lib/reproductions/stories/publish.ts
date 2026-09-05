// cairn-cms: the four publish stories for the live-reproduction seam. Each row's component, host,
// and props-or-pose decision comes from docs/internal/record/repro-story-audit.md's
// `publish/header-band`, `publish/history-list`, `publish/pending-list`, and `publish/refusal-banner`
// rows, and the sweep at docs/internal/record/2026-08-17-repro-audit-verification-sweep.md's
// findings 9, 10, and 15 correct three mechanism details the audit itself understated.
//
// `publish/header-band` mounts `EditPage` for the same reason three editor stories do (the band is
// its own snippet, reachable only through the shell), so it shares ./support.ts's prop bag rather
// than building a second one.
import type { Component } from 'svelte';
import CairnHistory from '../../components/CairnHistory.svelte';
import ConceptList from '../../components/ConceptList.svelte';
import EditPage from '../../components/EditPage.svelte';
import WelcomeView from '../../components/WelcomeView.svelte';
import type { InboundLink } from '../../content/manifest.js';
import type { DeleteRefusal } from '../../sveltekit/content-routes-entry.js';
import { fixtureDeskPathname, fixtureEditor, fixtureEntries, fixtureSiteName } from '../fixtures.js';
import type { ReproStory } from '../index.js';
import { clickWhenPresent, conceptListData, editPageProps, settleEditingSurface, waitFor } from './support.js';

/**
 * The overflow menu's opened band (`publish/header-band`). `actionsOpen` is internal state with no
 * prop (`EditPage.svelte`), so the pose clicks the trigger and waits on the same `aria-expanded`
 * mirror the trigger itself exposes, rather than a fixed delay: the trigger and the menu share one
 * boolean, so the trigger's own attribute is the observable "it opened" the pose needs.
 */
const headerBand: ReproStory = {
  id: 'publish/header-band',
  component: EditPage as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  // Sweep finding 10: off the desk pathname the shell renders office chrome instead, which is not
  // this row's subject at either declared width (the narrow face is specifically the desk band's
  // own compaction).
  shellData: { pathname: fixtureDeskPathname },
  props: editPageProps(),
  // The band is in the server render, so this row's own subject needs no wait. The narrow face
  // does: the manifest sizes it to contain the whole short screen so the bottom bar sits where it
  // really sits, which puts the document body inside the frame, and `MarkdownEditor` is a fallback
  // textarea until CodeMirror arrives through dynamic imports. Without this, a capture can read a
  // frame whose band is right and whose editor underneath it is a plain textarea.
  settle: settleEditingSurface,
  pose: async (root) => {
    await clickWhenPresent(root, 'button[aria-label="More actions"]', 'the overflow trigger');
    await waitFor(root, 'button[aria-label="More actions"][aria-expanded="true"]', 'the opened overflow menu');
  },
};

/** The entry `publish/history-list` renders: the one fixture entry carrying its own publish history. */
const HISTORY_ENTRY = fixtureEntries.find((entry) => entry.history);
if (!HISTORY_ENTRY?.history) {
  throw new Error('cairn reproductions: fixtureEntries carries no entry with a history fixture');
}

/** The recent-versions list with its open-draft row and per-publish revert affordance. */
const historyList: ReproStory = {
  id: 'publish/history-list',
  component: CairnHistory as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: HISTORY_ENTRY.history, form: null },
};

/** The blocked entry `publish/refusal-banner` names, and the entries whose links block it. */
const REFUSED_ENTRY = fixtureEntries[0]!;
const REFUSAL_INBOUND_LINKS: InboundLink[] = fixtureEntries
  .filter((entry) => entry.id !== REFUSED_ENTRY.id)
  .map((entry) => ({ concept: entry.concept, id: entry.id, title: entry.title, permalink: `/posts/${entry.id}` }));

/**
 * The two fixture entries `publish/pending-list` shows as awaiting publish, grouped under the
 * fixture concept's label in the dialog's own grouping: the entry that already carries an
 * open draft ({@link HISTORY_ENTRY}, `status: 'edited'`) plus one published entry, so the group
 * reads as more than a single row.
 */
const PENDING_IDS: { concept: string; id: string }[] = [HISTORY_ENTRY, fixtureEntries[1]!].map((entry) => ({
  concept: entry.concept,
  id: entry.id,
}));

/**
 * The topbar's "Publish site (N)" confirm, posed open (`publish/pending-list`). Sweep finding 15:
 * the trigger and the dialog both live inside `CairnAdminShell`'s awaited-then block over
 * `data.pendingEntries`, with no pending branch, so neither exists in the very first render even
 * though the fixture's own promise is already resolved; the pose's own wait for the trigger
 * (through `waitFor`) is what carries it past that microtask rather than a settle run beforehand.
 */
const pendingList: ReproStory = {
  id: 'publish/pending-list',
  component: WelcomeView as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  shellData: { pendingEntries: Promise.resolve(PENDING_IDS) },
  props: { data: { displayName: fixtureEditor.displayName, siteName: fixtureSiteName } },
  pose: async (root) => {
    await clickWhenPresent(root, 'button[aria-haspopup="dialog"]', 'the "Publish site" trigger');
    await waitFor(root, 'dialog[aria-labelledby="cairn-shell-publish-all-title"][open]', 'the opened publish confirm');
  },
};

/** The refused delete's form result: what drives the banner naming the blocking entry. */
const refusalForm: DeleteRefusal = {
  error: `${REFUSAL_INBOUND_LINKS.length} entries link to this one.`,
  inboundLinks: REFUSAL_INBOUND_LINKS,
  inboundKind: 'link',
  id: REFUSED_ENTRY.id,
};

/** The refused-delete banner naming the blocking entry, with its inbound-link list. */
const refusalBanner: ReproStory = {
  id: 'publish/refusal-banner',
  component: ConceptList as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: { data: conceptListData(), form: refusalForm },
};

/** The four publish stories, in manifest order. */
export const publishStories: ReproStory[] = [headerBand, historyList, pendingList, refusalBanner];
