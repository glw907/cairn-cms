import { describe, it, expect } from 'vitest';
import { normalizePublishActions, resolvePublishActions } from '../../lib/sveltekit/publish-actions.js';

const concepts = [{ id: 'posts', label: 'Posts' }, { id: 'club', label: 'Club' }] as never;

describe('normalizePublishActions: validates a publish-actions config at construction', () => {
  it('returns an empty list when the site declares none', () => {
    expect(normalizePublishActions(undefined, concepts)).toEqual([]);
  });

  it('passes through a valid entry unchanged', () => {
    const entries = [{ label: 'Announce', href: '/admin/club/announce?post={id}' }];
    expect(normalizePublishActions(entries, concepts)).toEqual(entries);
  });

  it('keeps declaration order across several valid entries', () => {
    const entries = [
      { label: 'Announce', href: '/admin/club/announce?post={id}', concepts: ['club'] },
      { label: 'Share', href: '/{concept}/{id}/share' },
    ];
    expect(normalizePublishActions(entries, concepts)).toEqual(entries);
  });

  it('rejects an entry missing a label', () => {
    expect(() => normalizePublishActions([{ label: '', href: '/x' }], concepts)).toThrow(/label/);
  });

  it('rejects an entry missing an href', () => {
    expect(() => normalizePublishActions([{ label: 'X', href: '' }], concepts)).toThrow(/href/);
  });

  it('rejects a concepts filter naming an unknown concept', () => {
    expect(() =>
      normalizePublishActions([{ label: 'X', href: '/x', concepts: ['events'] }], concepts),
    ).toThrow(/events/);
  });
});

describe('resolvePublishActions: templates and filters a validated config for one published entry', () => {
  it('returns no links when the site declares none', () => {
    expect(resolvePublishActions([], { concept: 'posts', id: '2026-05-hello' })).toEqual([]);
  });

  it('substitutes {concept} and {id} in the href', () => {
    const resolved = resolvePublishActions(
      [{ label: 'Share', href: '/admin/{concept}/{id}/share' }],
      { concept: 'posts', id: '2026-05-hello' },
    );
    expect(resolved).toEqual([{ label: 'Share', href: '/admin/posts/2026-05-hello/share' }]);
  });

  it('applies an entry with no concepts filter to every concept', () => {
    const resolved = resolvePublishActions(
      [{ label: 'Share', href: '/{concept}/{id}' }],
      { concept: 'club', id: 'about' },
    );
    expect(resolved).toEqual([{ label: 'Share', href: '/club/about' }]);
  });

  it('drops an entry whose concepts filter excludes the published concept', () => {
    const resolved = resolvePublishActions(
      [{ label: 'Announce', href: '/admin/club/announce?post={id}', concepts: ['club'] }],
      { concept: 'posts', id: '2026-05-hello' },
    );
    expect(resolved).toEqual([]);
  });

  it('keeps an entry whose concepts filter includes the published concept', () => {
    const resolved = resolvePublishActions(
      [{ label: 'Announce', href: '/admin/club/announce?post={id}', concepts: ['club'] }],
      { concept: 'club', id: 'winter-social' },
    );
    expect(resolved).toEqual([{ label: 'Announce', href: '/admin/club/announce?post=winter-social' }]);
  });
});
