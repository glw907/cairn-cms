/**
 * The exact beta-binomial math the operating characteristic is built from: a plant's per-run catch
 * probability is drawn from a beta distribution, and the count of plants an instrument catches out
 * of `n` is then an ordinary binomial draw at that beta-binomial mixture's own probability of
 * catching a single plant (at least two of its three runs). Every probability here is an exact sum
 * over log-gamma terms, never a simulation.
 */

/** Lanczos approximation constants (g = 7), accurate to about 15 significant digits. */
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

/**
 * The natural log of the gamma function, by the Lanczos approximation, with the reflection
 * formula for an argument below 0.5 (needed here, since a beta-binomial's shape parameters can be
 * well under 1 at a high intraclass correlation).
 * @param x - A positive real number (or, via reflection, any non-integer).
 * @returns `ln(Gamma(x))`.
 */
export function lgamma(x: number): number {
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  const y = x - 1;
  let sum = LANCZOS_COEFFICIENTS[0];
  for (let i = 1; i < LANCZOS_G + 2; i += 1) sum += LANCZOS_COEFFICIENTS[i] / (y + i);
  const t = y + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(sum);
}

/**
 * The natural log of the beta function `B(a, b) = Gamma(a) Gamma(b) / Gamma(a + b)`.
 * @param a - The first shape parameter, greater than 0.
 * @param b - The second shape parameter, greater than 0.
 * @returns `ln(B(a, b))`.
 */
export function logBeta(a: number, b: number): number {
  return lgamma(a) + lgamma(b) - lgamma(a + b);
}

/**
 * The natural log of the binomial coefficient `C(n, k)`.
 * @param n - The trial count.
 * @param k - The success count, from 0 to `n`.
 * @returns `ln(C(n, k))`.
 */
export function logChoose(n: number, k: number): number {
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/**
 * A beta-binomial distribution's shape parameters from its mean and its intraclass correlation
 * (the beta prior's own concentration: `rho` near 0 is a sharply peaked prior, near 1 a
 * near-degenerate one spread toward 0 and 1).
 * @param mean - The distribution's mean, between 0 and 1.
 * @param icc - The intraclass correlation, between 0 and 1 exclusive.
 * @returns The beta prior's `a` and `b` shape parameters.
 */
function betaBinomialShape(mean: number, icc: number): { a: number; b: number } {
  const s = (1 - icc) / icc;
  return { a: mean * s, b: (1 - mean) * s };
}

/**
 * The log-probability mass of `k` successes in `n` beta-binomial trials.
 * @param n - The trial count.
 * @param k - The success count, from 0 to `n`.
 * @param mean - The beta prior's mean.
 * @param icc - The beta prior's intraclass correlation.
 * @returns `ln(P(K = k))`.
 */
export function logBetaBinomialPmf(n: number, k: number, mean: number, icc: number): number {
  const { a, b } = betaBinomialShape(mean, icc);
  return logChoose(n, k) + logBeta(k + a, n - k + b) - logBeta(a, b);
}

/**
 * The probability that an ordinary binomial draw reaches at least `t` successes in `n` trials, by
 * an exact sum in log space.
 * @param n - The trial count.
 * @param t - The minimum success count for a pass.
 * @param p - The per-trial success probability.
 * @returns `P(X >= t)` for `X ~ Binomial(n, p)`.
 */
export function binomialAtLeast(n: number, t: number, p: number): number {
  if (t <= 0) return 1;
  if (t > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const logP = Math.log(p);
  const log1mP = Math.log(1 - p);
  let sum = 0;
  for (let k = t; k <= n; k += 1) {
    sum += Math.exp(logChoose(n, k) + k * logP + (n - k) * log1mP);
  }
  return Math.min(1, sum);
}

/**
 * A single plant's probability of counting as caught: at least two of its three runs catch it,
 * each run drawn from a beta-binomial mixture at the instrument's true recall and intraclass
 * correlation.
 * @param recall - The instrument's true on-path recall.
 * @param icc - The intraclass correlation across a plant's three runs.
 * @returns The probability a plant is caught.
 */
export function catchProbability(recall: number, icc: number): number {
  return Math.exp(logBetaBinomialPmf(3, 2, recall, icc)) + Math.exp(logBetaBinomialPmf(3, 3, recall, icc));
}

/**
 * The probability that an instrument at a given true recall and intraclass correlation catches at
 * least `t` of `n` independent plants (plants are independent given the instrument, so the plant
 * count caught is an ordinary binomial draw at `catchProbability`).
 * @param n - The plant count.
 * @param t - The pass threshold.
 * @param recall - The instrument's true on-path recall.
 * @param icc - The intraclass correlation across a plant's three runs.
 * @returns The probability the instrument reaches the threshold.
 */
export function passProbability(n: number, t: number, recall: number, icc: number): number {
  return binomialAtLeast(n, t, catchProbability(recall, icc));
}

/** Evenly spaced points from `start` to `end`, inclusive, `count` of them. */
export function linspace(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
}

/** The chi-square distribution's 95th percentile at 1 degree of freedom, `qchisq(0.95, 1)`. */
export const CHI2_95_1 = 3.841458820694124;

/** A beta-binomial maximum-likelihood fit: the mean, the intraclass correlation, and the profile 95 percent interval over the intraclass correlation. */
export interface RefitResult {
  mean: number;
  icc: number;
  ci: [number, number];
}

/**
 * Fit a beta-binomial mean and intraclass correlation to clustered binary catch data by a grid
 * search over the log-likelihood (the same grid a scratch fit script used: 361 points from 0.05 to
 * 0.95 for the mean, 397 points from 0.005 to 0.995 for the intraclass correlation), and report the
 * profile likelihood's 95 percent interval over the intraclass correlation.
 * @param data - Observed catch counts, keyed by how many of `trials` runs caught each plant.
 * @param trials - The run count each observation was drawn from (2 for pass 1's data).
 * @returns The maximum-likelihood mean and intraclass correlation, and the profile interval.
 */
export function refitBetaBinomial(data: Record<number, number>, trials: number): RefitResult {
  const meanGrid = linspace(0.05, 0.95, 361);
  const iccGrid = linspace(0.005, 0.995, 397);
  const entries = Object.entries(data).map(([k, count]): [number, number] => [Number(k), count]);
  let bestMean = meanGrid[0];
  let bestIcc = iccGrid[0];
  let bestLogLikelihood = -Infinity;
  const profile = new Array<number>(iccGrid.length).fill(-Infinity);
  for (let ri = 0; ri < iccGrid.length; ri += 1) {
    const icc = iccGrid[ri];
    for (const mean of meanGrid) {
      let logLikelihood = 0;
      for (const [k, count] of entries) logLikelihood += count * logBetaBinomialPmf(trials, k, mean, icc);
      if (logLikelihood > profile[ri]) profile[ri] = logLikelihood;
      if (logLikelihood > bestLogLikelihood) {
        bestLogLikelihood = logLikelihood;
        bestMean = mean;
        bestIcc = icc;
      }
    }
  }
  const threshold = bestLogLikelihood - CHI2_95_1 / 2;
  let lo = Infinity;
  let hi = -Infinity;
  for (let ri = 0; ri < iccGrid.length; ri += 1) {
    if (profile[ri] >= threshold) {
      lo = Math.min(lo, iccGrid[ri]);
      hi = Math.max(hi, iccGrid[ri]);
    }
  }
  return { mean: bestMean, icc: bestIcc, ci: [lo, hi] };
}
