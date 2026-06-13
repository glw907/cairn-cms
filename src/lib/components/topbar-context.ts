import { getContext, setContext, type Snippet } from 'svelte';

// The topbar context portal. On an edit route the document owns the band's live state (status,
// save-state, the lifecycle actions), so the desk's controls have to render up in AdminLayout's
// one topbar rather than in a second header of their own. AdminLayout owns a holder and provides
// it; EditPage, a descendant through the children snippet, registers its desk snippet into the
// holder and clears it on teardown. CairnAdmin's view switch unmounts EditPage, which nulls the
// holder, so the band reverts to the office layout with no route plumbing.

const TOPBAR_CONTEXT_KEY = Symbol('cairn-topbar');

/** The shared holder: the desk snippet a document registers, or null on the office routes. */
export interface TopbarHolder {
  desk: Snippet | null;
  /** True while the document is in zen: AdminLayout drops the whole topbar element so the band
   *  slides away (the desk's three clusters include AdminLayout-owned chrome, the drawer toggle and
   *  breadcrumb, that must vanish with it). EditPage sets this; the office routes leave it false. */
  zen: boolean;
}

/** Called by AdminLayout once: creates the holder, provides it on context, returns it to render. */
export function provideTopbar(holder: TopbarHolder): TopbarHolder {
  setContext(TOPBAR_CONTEXT_KEY, holder);
  return holder;
}

/** Called by a descendant document (EditPage) to reach the holder it registers its desk into. */
export function useTopbar(): TopbarHolder | undefined {
  return getContext<TopbarHolder | undefined>(TOPBAR_CONTEXT_KEY);
}
