// A check whose body finds no problem, for check-shared.test.ts.
import { runCheck } from '../shared.mjs';

await runCheck('shared-pass', () => []);
