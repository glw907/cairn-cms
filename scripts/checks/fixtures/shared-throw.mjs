// A check whose body throws, for check-shared.test.ts.
import { runCheck } from '../shared.mjs';

await runCheck('shared-throw', async () => {
  throw new Error('shared-throw: the body threw');
});
