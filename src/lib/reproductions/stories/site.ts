// cairn-cms: the last four stories for the live-reproduction seam: `tags/screen`,
// `roster/own-row`, `nav/worked-navlayout`, and `toolkit/custom-screen`. Each row's component, host,
// and props-or-pose decision comes from docs/internal/record/repro-story-audit.md's four matching
// rows.
//
// `toolkit/custom-screen` is the one row with no package component to mount: its subject is the
// worked snippet in docs/extend/add-a-custom-admin-screen.md, so ./CustomScreen.svelte builds that
// screen inside this module from the exported `@glw907/cairn-cms/admin-toolkit` primitives, per the
// audit's own row.
import type { Component } from 'svelte';
import ManageEditors from '../../components/ManageEditors.svelte';
import VocabularyAdmin from '../../components/VocabularyAdmin.svelte';
import WelcomeView from '../../components/WelcomeView.svelte';
import type { Editor } from '../../auth/types.js';
import type { EditorsData } from '../../sveltekit/editors-routes.js';
import { fixtureEditor, fixtureSiteName, fixtureVocabulary } from '../fixtures.js';
import type { ReproStory } from '../index.js';
import CustomScreen from './CustomScreen.svelte';

/** The Tags screen at rest, carrying the manifest's five frozen marker keys (`tags/screen`). */
const tagsScreen: ReproStory = {
  id: 'tags/screen',
  component: VocabularyAdmin as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: fixtureVocabulary, form: null },
  markers: [
    { n: 1, key: 'add-field', anchor: '#cairn-vocab-new-label' },
    { n: 2, key: 'tag-list', anchor: 'div.overflow-hidden.card-shell.card-shadow' },
    // gear is the fixture vocabulary's own zero-usage entry, so its delete stays the active,
    // ungated control the other two entries' non-zero counts guard shut.
    { n: 3, key: 'unused-tag', anchor: 'button[aria-label="Remove Gear"]' },
    { n: 4, key: 'not-on-list', anchor: 'div.rounded-box.border-dashed' },
    { n: 5, key: 'save-changes', anchor: 'button.btn-primary[type="submit"]' },
  ],
};

/**
 * A second editor beside {@link fixtureEditor}, so `roster/own-row` has a row whose controls stay
 * enabled to contrast against the disabled own row. Named for the editor who credits the fixture
 * publish history's most recent version, so the roster reads as one consistent cast rather than a
 * name invented for this row alone.
 */
const ROSTER_PEER: Editor = {
  email: 'robin@example.com',
  displayName: 'Robin Lake',
  role: 'owner',
  capability: 'owner',
};

/**
 * The roster `roster/own-row` renders: the signed-in editor first, at the role the shell's own
 * fixture identity carries, plus one owner peer.
 */
const rosterData: EditorsData = {
  editors: [
    { email: fixtureEditor.email, displayName: fixtureEditor.displayName, role: 'editor', capability: 'editor' },
    ROSTER_PEER,
  ],
  self: fixtureEditor.email,
  // The default two-name vocabulary, so ManageEditors renders its bare toggle button rather than
  // the labelled-select branch a larger declared vocabulary would take.
  vocabulary: [
    { role: 'owner', capability: 'owner' },
    { role: 'editor', capability: 'editor' },
  ],
};

/** The roster with its own row's controls disabled, `data.self` matching the fixture editor (`roster/own-row`). */
const rosterOwnRow: ReproStory = {
  id: 'roster/own-row',
  component: ManageEditors as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: rosterData, form: null },
};

/**
 * The resolved sidebar the fixture `navLayout` produces, at rest (`nav/worked-navlayout`). The
 * whole contract is `data.nav`, which `ReproContext`'s own default shell payload already carries
 * (`fixtureNavLayout`, ../fixtures.js), so this row overrides no shell field.
 */
const workedNavLayout: ReproStory = {
  id: 'nav/worked-navlayout',
  component: WelcomeView as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: { displayName: fixtureEditor.displayName, siteName: fixtureSiteName } },
};

/** The events a site's own custom screen manages, matching the doc snippet's own shape. */
const customScreenEvents = [
  { id: 'spring-cleanup', name: 'Spring Cleanup', status: 'Confirmed' },
  { id: 'trail-work-day', name: 'Trail Work Day', status: 'Confirmed' },
  { id: 'annual-meeting', name: 'Annual Meeting', status: 'Pending' },
];

/** The composed custom screen from the worked doc snippet, mounted for real (`toolkit/custom-screen`). */
const toolkitCustomScreen: ReproStory = {
  id: 'toolkit/custom-screen',
  component: CustomScreen as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: { events: customScreenEvents } },
};

/** The four site stories, in manifest order. */
export const siteStories: ReproStory[] = [tagsScreen, rosterOwnRow, workedNavLayout, toolkitCustomScreen];
