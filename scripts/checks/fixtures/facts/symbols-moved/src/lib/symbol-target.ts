// Fixture: the same declarations as symbols/src/lib/symbol-target.ts, moved down the file by
// inserted lines, to prove a symbol-anchored pointer resolves wherever the declaration now sits.
// padding line 1
// padding line 2
// padding line 3
// padding line 4
// padding line 5
// padding line 6
// padding line 7
// padding line 8
// padding line 9
// padding line 10
// padding line 11
// padding line 12
// padding line 13
// padding line 14
// padding line 15
// padding line 16
// padding line 17
// padding line 18
// padding line 19
// padding line 20
// padding line 21
// padding line 22
// padding line 23
// padding line 24
// padding line 25
// padding line 26
// padding line 27
// padding line 28
// padding line 29
// padding line 30
// padding line 31
// padding line 32
// padding line 33
// padding line 34
// padding line 35
// padding line 36
// padding line 37
// padding line 38
// padding line 39
// padding line 40
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
