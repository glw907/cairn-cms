import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { matchesGlob, resolve } from 'node:path';
import { createVitest } from 'vitest/node';
import { COMPONENT_RERUN_TRIGGERS } from '../../../scripts/test/component-rerun-triggers.mjs';
import { RERUN_TRIGGER_PATHS } from './_rerun-trigger-paths.js';

// The classifier's related selection and a developer's `vitest related` both lean on the config's
// forceRerunTriggers. This canary loads the real config with the switch on, builds one Vitest
// instance, and asks it for the relevant component tests once per trigger entry. Each answer must
// be every component file. Two ways it goes red: the switch is unset (the triggers never join the
// list), or a trigger pattern fails to match an absolute path under a dot directory such as this
// repo's own `.claude/worktrees` checkouts.
describe('the component rerun triggers, as Vitest reads them', () => {
  type Vitest = Awaited<ReturnType<typeof createVitest>>;
  let vitest: Vitest;
  let total = 0;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.CAIRN_RELATED_RUN;
    process.env.CAIRN_RELATED_RUN = '1';
    vitest = await createVitest(
      'test',
      { root: process.cwd(), project: ['component'], run: true, watch: false, related: [resolve('package.json')] },
      {},
      {},
    );
    total = (await vitest.globTestSpecifications()).length;
  }, 60_000);

  afterAll(async () => {
    await vitest?.close();
    if (previous === undefined) delete process.env.CAIRN_RELATED_RUN;
    else process.env.CAIRN_RELATED_RUN = previous;
  });

  it('names a real path for every trigger entry', () => {
    for (const glob of COMPONENT_RERUN_TRIGGERS) {
      expect(RERUN_TRIGGER_PATHS.some((path) => matchesGlob(path, glob)), glob).toBe(true);
    }
    for (const path of RERUN_TRIGGER_PATHS) expect(existsSync(path), path).toBe(true);
  });

  it('sees a component suite to select from', () => {
    expect(total).toBeGreaterThan(50);
  });

  it.each(RERUN_TRIGGER_PATHS)('selects every component file when %s changes', async (path) => {
    vitest.config.related = [resolve(path)];
    const selected = await vitest.getRelevantTestSpecifications();
    expect(selected.length).toBe(total);
  });

  it('selects fewer than every file for a source change no trigger names', async () => {
    vitest.config.related = [resolve('src/lib/content/ids.ts')];
    const selected = await vitest.getRelevantTestSpecifications();
    expect(selected.length).toBeLessThan(total);
  });
});
