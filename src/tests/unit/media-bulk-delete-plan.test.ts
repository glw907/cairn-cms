import { describe, it, expect } from 'vitest';
import { planBulkDelete } from '../../lib/media/bulk-delete-plan.js';
import type { UsageIndex, UsageEntry } from '../../lib/media/usage.js';
import type { MediaEntry, MediaManifest } from '../../lib/media/manifest.js';

function usageRow(id: string): UsageEntry {
  return { concept: 'posts', id, title: id, origin: { kind: 'published' } };
}

function manifestRow(hash: string): MediaEntry {
  return {
    hash,
    sha256: `${hash}-sha256`,
    slug: hash,
    displayName: hash,
    originalFilename: `${hash}.png`,
    alt: '',
    ext: 'png',
    contentType: 'image/png',
    bytes: 1,
    width: null,
    height: null,
    createdAt: '2026-06-18T00:00:00Z',
  };
}

describe('planBulkDelete', () => {
  it('marks a hash with no usage row and a manifest row deletable', () => {
    const index: UsageIndex = new Map();
    const manifest: MediaManifest = { aaaaaaaaaaaaaaaa: manifestRow('aaaaaaaaaaaaaaaa') };

    const plan = planBulkDelete(['aaaaaaaaaaaaaaaa'], index, manifest);

    expect(plan.deletable).toEqual(['aaaaaaaaaaaaaaaa']);
    expect(plan.skipped).toEqual([]);
  });

  it('skips a hash with usage rows as still-referenced and carries its rows', () => {
    const rows = [usageRow('hello'), usageRow('world')];
    const index: UsageIndex = new Map([['bbbbbbbbbbbbbbbb', rows]]);
    const manifest: MediaManifest = { bbbbbbbbbbbbbbbb: manifestRow('bbbbbbbbbbbbbbbb') };

    const plan = planBulkDelete(['bbbbbbbbbbbbbbbb'], index, manifest);

    expect(plan.deletable).toEqual([]);
    expect(plan.skipped).toEqual([
      { hash: 'bbbbbbbbbbbbbbbb', reason: 'still-referenced', usage: rows },
    ]);
  });

  it('skips a hash with no usage row and no manifest row as uncommitted', () => {
    const index: UsageIndex = new Map();
    const manifest: MediaManifest = {};

    const plan = planBulkDelete(['cccccccccccccccc'], index, manifest);

    expect(plan.deletable).toEqual([]);
    expect(plan.skipped).toEqual([
      { hash: 'cccccccccccccccc', reason: 'uncommitted', usage: [] },
    ]);
  });

  it('partitions a mixed selection and preserves input order in both arrays', () => {
    const refRows = [usageRow('post-1')];
    const index: UsageIndex = new Map([['2222222222222222', refRows]]);
    const manifest: MediaManifest = {
      '1111111111111111': manifestRow('1111111111111111'),
      '2222222222222222': manifestRow('2222222222222222'),
      '4444444444444444': manifestRow('4444444444444444'),
    };

    // Input order: deletable, still-referenced, uncommitted, deletable.
    const selected = [
      '1111111111111111',
      '2222222222222222',
      '3333333333333333',
      '4444444444444444',
    ];
    const plan = planBulkDelete(selected, index, manifest);

    expect(plan.deletable).toEqual(['1111111111111111', '4444444444444444']);
    expect(plan.skipped).toEqual([
      { hash: '2222222222222222', reason: 'still-referenced', usage: refRows },
      { hash: '3333333333333333', reason: 'uncommitted', usage: [] },
    ]);
  });

  it('yields empty buckets for an empty selection', () => {
    const plan = planBulkDelete([], new Map(), {});

    expect(plan.deletable).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });
});
