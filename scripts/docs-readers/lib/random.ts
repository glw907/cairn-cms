/**
 * A small seeded pseudo-random toolkit for the stability simulation: a deterministic uniform
 * generator, a standard normal draw by the Box-Muller transform, and a gamma and beta draw by
 * Marsaglia and Tsang's method, boosted for a shape below 1. None of this needs to match any
 * particular reference implementation bit for bit; a Monte Carlo estimate over enough draws
 * converges to the same true figures regardless of which quality generator produced them.
 */

/** A deterministic generator of numbers in `[0, 1)`. */
export type Rng = () => number;

/**
 * A mulberry32 generator, seeded once.
 * @param seed - Any 32-bit integer seed.
 * @returns A generator of uniform `[0, 1)` draws.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A standard normal draw by the Box-Muller transform.
 * @param rng - A uniform `[0, 1)` generator.
 * @returns One draw from the standard normal distribution.
 */
export function randomNormal(rng: Rng): number {
  let u1 = rng();
  while (u1 === 0) u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * A Gamma(shape, 1) draw by Marsaglia and Tsang's method, boosted for a shape below 1 by drawing
 * Gamma(shape + 1, 1) and scaling by a uniform variate raised to `1 / shape`.
 * @param rng - A uniform `[0, 1)` generator.
 * @param shape - The gamma distribution's shape parameter, greater than 0.
 * @returns One draw from Gamma(shape, 1).
 */
export function randomGamma(rng: Rng, shape: number): number {
  if (shape < 1) {
    const boosted = randomGamma(rng, shape + 1);
    let u = rng();
    while (u === 0) u = rng();
    return boosted * u ** (1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      x = randomNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v ** 3;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x ** 2 + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * A Beta(a, b) draw, as the ratio of two independent gamma draws sharing a scale.
 * @param rng - A uniform `[0, 1)` generator.
 * @param a - The first shape parameter, greater than 0.
 * @param b - The second shape parameter, greater than 0.
 * @returns One draw from Beta(a, b).
 */
export function randomBeta(rng: Rng, a: number, b: number): number {
  const x = randomGamma(rng, a);
  const y = randomGamma(rng, b);
  return x / (x + y);
}
