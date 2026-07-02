// Showcase fixture: a deterministic Anthropic client for the tidy action. It returns a CANNED
// corrected string for the seeded copy-edit entry so the review diff is stable across runs, and no
// network call or real key is ever made. The real SDK client is used in production; this is injected
// only through createCairnAdmin's `tidy.client` dep when CAIRN_DEV_BACKEND is set.
//
// The TidyClient contract (src/lib/sveltekit/content-routes.ts) is structural: messages.create takes
// the prompt and returns a Message-shaped object. The action reads the user message's text, so the
// stub keys its reply off that text rather than the prompt.
import type { ContentRoutesDeps } from '@glw907/cairn-cms/sveltekit';
import { SEED_EDITOR } from './fake-github.js';

// NonNullable<ContentRoutesDeps['tidy']>['client'] is the optional client factory; unwrap it once
// more so its return type (the structural TidyClient) is reachable for the messages.create body.
type TidyClientFactory = NonNullable<NonNullable<ContentRoutesDeps['tidy']>['client']>;

// The body the engine's tidy action sends to messages.create, derived from the client contract so
// the stub stays in lockstep with it.
type TidyCreateBody = Parameters<ReturnType<TidyClientFactory>['messages']['create']>[0];

/**
 * Build the fake client factory the showcase passes to createCairnAdmin's `tidy.client` dep. The
 * factory ignores the key (it never calls the network) and returns one client per tidy request.
 */
export function createFakeAnthropic(): NonNullable<ContentRoutesDeps['tidy']>['client'] {
  return () => ({
    messages: {
      async create(params: TidyCreateBody) {
        // The user message carries the buffer the editor sent. When it is the seed entry's body,
        // return the canned correction; otherwise echo it back so tidy reports "Nothing to fix"
        // rather than inventing edits.
        const input = params.messages[0]?.content ?? '';
        const corrected = input.trim() === SEED_EDITOR.body ? SEED_EDITOR.corrected : input;
        return {
          content: [{ type: 'text' as const, text: corrected }],
          model: 'claude-showcase-stub',
          stop_reason: 'end_turn' as const,
          usage: { input_tokens: 24, output_tokens: 24 },
        };
      },
    },
  });
}
