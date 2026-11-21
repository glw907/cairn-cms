// A check whose body finds one problem, for check-shared.test.ts.
import { runCheck } from '../shared.mjs';

await runCheck('shared-fail', () => ['shared-fail: one problem found']);
