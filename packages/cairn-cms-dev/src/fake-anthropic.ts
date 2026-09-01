// Showcase fixture: a deterministic Anthropic client for the tidy action. It returns a CANNED
// corrected string for the seeded copy-edit entry so the review diff is stable across runs, and no
// network call or real key is ever made. The real SDK client is used in production; this is injected
// only through createCairnAdmin's `tidy.client` option when CAIRN_DEV_BACKEND is set.
//
// The TidyClient contract (src/lib/sveltekit/content-routes.ts) is the narrow, engine-owned
// interface: `tidy(request)` takes the prompt and returns the corrected text plus a coarse token
// record, no Anthropic wire shape involved. The action reads the request's own `text`, so the stub
// keys its reply off that rather than the prompt.
import type { ContentRoutesConfig } from '@glw907/cairn-cms/sveltekit';
import { SEED_EDITOR } from './fake-github.js';

// NonNullable<ContentRoutesConfig['tidy']>['client'] is the optional client factory; unwrap it once
// more so its return type (the narrow TidyClient) is reachable for the tidy() request shape.
type TidyClientFactory = NonNullable<NonNullable<ContentRoutesConfig['tidy']>['client']>;

// The request the engine's tidy action sends to tidy(), derived from the client contract so the
// stub stays in lockstep with it.
type TidyRequest = Parameters<ReturnType<TidyClientFactory>['tidy']>[0];

/**
 * Build the fake client factory the showcase passes to createCairnAdmin's `tidy.client` option. The
 * factory ignores the key (it never calls the network) and returns one client per tidy request.
 */
export function createFakeAnthropic(): NonNullable<ContentRoutesConfig['tidy']>['client'] {
  return () => ({
    async tidy(request: TidyRequest) {
      // The seed entry's body gets the canned correction; anything else echoes back so tidy
      // reports "Nothing to fix" rather than inventing edits.
      const corrected = request.text.trim() === SEED_EDITOR.body ? SEED_EDITOR.corrected : request.text;
      return { corrected, refused: false, tokens: { input: 24, output: 24 } };
    },
  });
}
