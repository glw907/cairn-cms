// The rule's own false-positive case: a name heuristic over <ident>.info(...) cannot tell
// console's own logger from cairn's, so this raises a finding whose message says so.
export function noisyConsole(): void {
  console.info('a.b.c');
}
