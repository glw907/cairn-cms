// The tidy action's own gate on `output_config.effort`: only a model with adaptive-thinking effort
// tiers accepts the parameter, and the Messages API answers it with a 400 on anything else. See
// content-routes-tidy.test.ts for the integration coverage that proves the action's call site
// actually consults this predicate.
import { describe, it, expect } from 'vitest';
import { supportsEffort } from '../../lib/sveltekit/content-routes-tidy.js';

describe('supportsEffort', () => {
  it('supports claude-sonnet-5, including a dated snapshot id', () => {
    expect(supportsEffort('claude-sonnet-5')).toBe(true);
    expect(supportsEffort('claude-sonnet-5-20260115')).toBe(true);
  });

  it('supports claude-opus-5', () => {
    expect(supportsEffort('claude-opus-5')).toBe(true);
  });

  it('supports claude-sonnet-4-6', () => {
    expect(supportsEffort('claude-sonnet-4-6')).toBe(true);
  });

  it('supports claude-opus-4 at 4.6 or later, not before', () => {
    expect(supportsEffort('claude-opus-4-6')).toBe(true);
    expect(supportsEffort('claude-opus-4-9')).toBe(true);
    expect(supportsEffort('claude-opus-4-5')).toBe(false);
    expect(supportsEffort('claude-opus-4-1')).toBe(false);
  });

  it('does not support claude-haiku-4-5', () => {
    expect(supportsEffort('claude-haiku-4-5')).toBe(false);
  });

  it('treats an unrecognized model id conservatively as unsupported', () => {
    expect(supportsEffort('some-future-model')).toBe(false);
    expect(supportsEffort('')).toBe(false);
  });
});
