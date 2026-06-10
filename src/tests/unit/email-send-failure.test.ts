import { describe, it, expect } from 'vitest';
import { errorCode, emailSendFailure } from '../../lib/email.js';
import { CairnError } from '../../lib/diagnostics/index.js';

describe('errorCode', () => {
  it('reads a string code off a binding error', () => {
    expect(errorCode({ code: 'E_SENDER_NOT_VERIFIED' })).toBe('E_SENDER_NOT_VERIFIED');
  });

  it('falls back to undefined for a plain Error or a non-string code', () => {
    expect(errorCode(new Error('smtp down'))).toBeUndefined();
    expect(errorCode({ code: 42 })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
  });

  it('reads an E_* code embedded in the message when no structured code exists', () => {
    expect(errorCode(new Error('send failed: E_SENDER_NOT_VERIFIED'))).toBe('E_SENDER_NOT_VERIFIED');
    expect(errorCode(new Error('binding rejected with E_DELIVERY_FAILED today'))).toBe('E_DELIVERY_FAILED');
  });
});

describe('emailSendFailure', () => {
  it('maps the not-verified code to the sender-not-onboarded condition', () => {
    const cause = Object.assign(new Error('not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
    const failure = emailSendFailure(cause);
    expect(failure).toBeInstanceOf(CairnError);
    expect(failure.conditionId).toBe('email.sender-not-onboarded');
    expect(failure.cause).toBe(cause);
  });

  it('maps any other failure to the generic send-failed condition', () => {
    const cause = new Error('smtp down');
    const failure = emailSendFailure(cause);
    expect(failure.conditionId).toBe('email.send-failed');
    expect(failure.cause).toBe(cause);
  });

  it('maps the not-verified message string to sender-not-onboarded when no code exists', () => {
    // The live binding has been observed throwing this string with no structured code (the
    // ecxc outage); the substring mapping keeps the onboarding remediation reachable either way.
    const cause = new Error('destination address is not a verified address');
    expect(emailSendFailure(cause).conditionId).toBe('email.sender-not-onboarded');
  });
});
