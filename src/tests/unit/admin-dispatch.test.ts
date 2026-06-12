import { describe, it, expect } from 'vitest';
import { parseAdminPath, type AdminView } from '../../lib/sveltekit/admin-dispatch.js';
import { normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import { testAdapter } from './_content-fixture.js';

const concepts = normalizeConcepts(testAdapter.content);
const posts = findConcept(concepts, 'posts')!;
const pages = findConcept(concepts, 'pages')!;

describe('parseAdminPath', () => {
  // Each fixed view, with and without the tolerated single trailing slash.
  const fixedViews: Array<[string, AdminView]> = [
    ['/admin', { view: 'index' }],
    ['/admin/', { view: 'index' }],
    ['/admin/login', { view: 'login' }],
    ['/admin/login/', { view: 'login' }],
    ['/admin/auth/confirm', { view: 'confirm' }],
    ['/admin/auth/confirm/', { view: 'confirm' }],
    ['/admin/editors', { view: 'editors' }],
    ['/admin/editors/', { view: 'editors' }],
    ['/admin/nav', { view: 'nav' }],
    ['/admin/nav/', { view: 'nav' }],
  ];
  it.each(fixedViews)('parses %s', (pathname, expected) => {
    expect(parseAdminPath(pathname, concepts)).toEqual(expected);
  });

  it('parses a concept list view, tolerating a trailing slash', () => {
    expect(parseAdminPath('/admin/posts', concepts)).toEqual({ view: 'list', concept: posts });
    expect(parseAdminPath('/admin/posts/', concepts)).toEqual({ view: 'list', concept: posts });
    expect(parseAdminPath('/admin/pages', concepts)).toEqual({ view: 'list', concept: pages });
  });

  it('parses an edit view with a valid id, tolerating a trailing slash', () => {
    expect(parseAdminPath('/admin/posts/2026-01-01-hello', concepts)).toEqual({
      view: 'edit',
      concept: posts,
      id: '2026-01-01-hello',
    });
    expect(parseAdminPath('/admin/pages/about/', concepts)).toEqual({
      view: 'edit',
      concept: pages,
      id: 'about',
    });
  });

  it('reserves /admin/settings, even against a concept claiming the segment', () => {
    expect(parseAdminPath('/admin/settings', concepts)).toBeNull();
    // AdminLayout links the sidebar to /admin/settings, so a future concept named settings
    // must never claim the URL.
    const withSettings = [...concepts, { ...posts, id: 'settings', label: 'Settings' }];
    expect(parseAdminPath('/admin/settings', withSettings)).toBeNull();
  });

  it('decodes each segment individually before matching', () => {
    expect(parseAdminPath('/admin/%70osts/%61bout', concepts)).toEqual({
      view: 'edit',
      concept: posts,
      id: 'about',
    });
  });

  // Anything outside the recognized shapes maps to null, which the caller turns into a 404.
  const nulls: string[] = [
    // Not under /admin.
    '/',
    '/adminx',
    '/blog/admin',
    '/admin-extra',
    // Unknown fixed or concept segments.
    '/admin/unknown',
    '/admin/auth',
    '/admin/auth/',
    '/admin/auth/other',
    '/admin/login/extra',
    '/admin/editors/alice',
    '/admin/nav/main',
    '/admin/unknown/some-id',
    // Three or more segments.
    '/admin/posts/2026-01-01-hello/extra',
    // Invalid edit ids: uppercase, leading hyphen, raw slash, encoded slash.
    '/admin/posts/Hello',
    '/admin/posts/-hello',
    '/admin/posts/he/llo',
    '/admin/posts/he%2Fllo',
    // An encoded slash in the concept segment can never match a concept.
    '/admin/po%2Fsts',
    // Empty internal segments and a doubled trailing slash.
    '/admin//posts',
    '/admin/posts//',
    '/admin//',
    // Malformed percent encoding.
    '/admin/%ZZ',
  ];
  it.each(nulls)('returns null for %s', (pathname) => {
    expect(parseAdminPath(pathname, concepts)).toBeNull();
  });
});
