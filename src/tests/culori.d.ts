// culori ships JSDoc types in its source but no .d.ts, and its package.json declares no `types`
// entry, so NodeNext sees it as an untyped module. scripts/check-public-tokens.mjs imports it, and
// role-layer-contrast.test.ts pulls that script (and culori directly) into the svelte-check program,
// so this ambient declaration keeps the check at 0 errors. Only the members the type-checked files
// use are declared, with the shapes those call sites rely on.
declare module 'culori' {
  /** A parsed or constructed colour. Mode-tagged; channels are optional per mode. `alpha` is the
   * optional opacity the compositing math reads. */
  interface Color {
    mode: string;
    r?: number;
    g?: number;
    b?: number;
    l?: number;
    c?: number;
    h?: number;
    alpha?: number;
    [channel: string]: number | string | undefined;
  }

  /** An rgb-mode colour, the shape `converter('rgb')` produces: the three channels are always present
   * (a converter into rgb fills them), so a caller reads `r`/`g`/`b` without a guard. */
  interface RgbColor extends Color {
    mode: 'rgb';
    r: number;
    g: number;
    b: number;
  }

  /** Parse a CSS colour string into a {@link Color}, or `undefined` when it is not a colour. */
  export function parse(color: string): Color | undefined;

  /** A converter into a target colour space, returning a colour in that mode. The `'rgb'` converter is
   * narrowed to {@link RgbColor} so its channels are non-optional at the call site. */
  export function converter(mode: 'rgb'): (color: Color | string) => RgbColor;
  export function converter(mode: string): (color: Color | string) => Color;

  /** Build an interpolator over the given colours in a colour space; the returned function maps a
   * `[0, 1]` position to an interpolated {@link Color}. */
  export function interpolate(
    colors: (Color | string)[],
    mode?: string
  ): (t: number) => Color;

  /** A gamut clamper: reduce a colour into the target gamut, holding the given reference space. */
  export function toGamut(gamut: string, mode?: string): (color: Color) => Color;

  /** The WCAG relative luminance of a colour. */
  export function wcagLuminance(color: Color | string): number;
}
