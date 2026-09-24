// Fixture: a source file whose declarations a symbol-anchored `Source:` pointer names.
export const SYMBOL_ANCHOR_CONSTANT = {
  alpha: 'first-value',
  beta: 'second-value',
} as const;

export interface SymbolAnchorShape {
  lookup: (contact: string) => string;
  verify?: (subject: string) => boolean;
}

export function symbolAnchorFactory() {
  return function innerHandle(input: string) {
    const marker = input.trim();
    return marker;
  };
}

export function symbolAnchorOverload(value: string): string;
export function symbolAnchorOverload(value: number): string;
export function symbolAnchorOverload(value: string | number): string {
  return String(value);
}

export const duplicatedName = 1;
export function containerOne() {
  const repeated = 1;
  return repeated;
}
export function containerTwo() {
  const repeated = 2;
  return repeated;
}
