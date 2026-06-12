import { describe, it, expect } from 'vitest';
import { renderConditionResponse, REASON_CONDITION } from '../../lib/sveltekit/condition-response.js';
import { condition } from '../../lib/diagnostics/index.js';

describe('renderConditionResponse', () => {
  it('renders the branded HTTPS page over https for the https condition', async () => {
    const res = renderConditionResponse('edge.https-not-forced', { url: new URL('http://test.dev/admin') });
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    const body = await res.text();
    expect(body).toContain('Always Use HTTPS');
    expect(body).toContain('https://test.dev/admin');
  });

  it('renders the branded CSRF recovery page for the token condition', async () => {
    const res = renderConditionResponse('auth.csrf-token-invalid');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('Back to sign-in');
  });

  it('renders the plain-text 403 for the origin condition', async () => {
    const res = renderConditionResponse('auth.csrf-origin-mismatch');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
    expect(await res.text()).toBe('Cross-site POST form submissions are forbidden');
  });

  it('renders the branded operator-fault page for the bindings condition', async () => {
    const res = renderConditionResponse('config.bindings-missing');
    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    const body = await res.text();
    expect(body).toContain('Wrangler bindings are missing');
    expect(body).toContain('AUTH_DB');
  });

  it('throws for an id with no renderer', () => {
    expect(() => renderConditionResponse('nope.not-real')).toThrow();
  });

  it('maps every guard reason to a registered condition', () => {
    for (const id of Object.values(REASON_CONDITION)) {
      expect(condition(id).id).toBe(id);
    }
  });
});
