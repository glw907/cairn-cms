// The mount-settle-pose sequence every reproduction suite runs, kept in one place because the
// instance handoff is the part that is easy to get subtly wrong: `ReproContext` hands the mounted
// component's exports to its host through `oninstance`, and the host hands that value back as
// `pose`'s second argument. A suite that skips it still mounts and still poses every story whose
// pose only clicks, so the miss would surface as one story (`media/insert-panel`) failing for a
// reason that reads like a broken component.
//
// Each suite still owns its own viewport policy, which is the part that differs between them.
import { render } from 'vitest-browser-svelte';
import { ReproContext, type ReproStory } from '../../lib/reproductions/index.js';

// `ReproInstance` retired from the public barrel (the retires pass, Task 2, a sanctioned
// NavIcon-class leak); read structurally off `ReproStory.pose`'s own signature instead.
type ReproInstance = Parameters<NonNullable<ReproStory['pose']>>[1];

/**
 * Mount `story` through `ReproContext` and bring it to the state its page contract names: `settle`
 * for a surface that only exists after hydration, then `pose` for a state that lives in internal
 * component state. Both of the seam's consumers, this repo's suites and cairn-pub's docs route,
 * run them in that order.
 *
 * Pin the viewport before calling: a story pinned to a width renders a different screen at the
 * ambient one, and a pose that clicks a `sm:`-gated control would fail for that reason alone.
 * @param story - the registered story to mount
 * @param mediaBase - `ReproContext`'s own `mediaBase` prop; omitted mounts at the engine default
 * @returns the render result, mounted and posed
 */
export async function renderStory(story: ReproStory, mediaBase?: string) {
  let instance: ReproInstance | undefined;
  const screen = await render(ReproContext, {
    props: {
      story,
      mediaBase,
      oninstance: (value: ReproInstance) => {
        instance = value;
      },
    },
  });
  if (story.settle) await story.settle(screen.container);
  // Non-null: `bind:this` inside ReproContext writes through its own render effect during the
  // mount above, so a mounted story always has an instance by the time this line runs. A story
  // whose pose does not need it simply ignores the argument.
  if (story.pose) await story.pose(screen.container, instance!);
  return screen;
}
