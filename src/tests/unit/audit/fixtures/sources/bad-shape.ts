// A literal that reads as a sentence rather than area[.subject].verb_phrase.
export function recordFailure(log: { warn(event: string): void }): void {
  log.warn('Signup failed');
}
