// cairn-cms: the two auth stories for the live-reproduction seam (Task A4 of
// docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md). Both mount `bare` and own
// their theme root: LoginPage and ConfirmPage render their wrapper from `data.theme`
// (docs/internal/record/repro-story-audit.md), so ReproContext routes an override theme into
// `data.theme` rather than a shell prop. Neither needs a pose or markers; the contracted state
// (an empty sign-in form, the resting "Confirm sign-in" button) is the resting render.
import { fixtureCsrf, fixtureSiteName } from '../fixtures.js';
import type { Component } from 'svelte';
import LoginPage from '../../components/LoginPage.svelte';
import ConfirmPage from '../../components/ConfirmPage.svelte';
import type { ReproStory } from '../index.js';

/** The magic-link sign-in page, resting state: an empty email form (`auth/login`). */
const login: ReproStory = {
  id: 'auth/login',
  component: LoginPage as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    data: { siteName: fixtureSiteName, error: null, csrf: fixtureCsrf, theme: 'cairn-admin' },
    form: null,
  },
};

/** The scanner-safe confirm page, resting state: the "Confirm sign-in" button (`auth/confirm`). */
const confirm: ReproStory = {
  id: 'auth/confirm',
  component: ConfirmPage as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    data: {
      token: 'repro-fixture-token',
      siteName: fixtureSiteName,
      error: null,
      csrf: fixtureCsrf,
      theme: 'cairn-admin',
    },
    form: null,
  },
};

/** The two auth stories, in manifest order. */
export const authStories: ReproStory[] = [login, confirm];
