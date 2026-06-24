// cairn-cms: the Help home getting-started progress, derived from the committed manifest and the
// pending-branch list rather than stored. An entry in the manifest is published to main; a pending
// item is written on an open cairn/ branch. The three step states fall out of those two inputs, so
// the count the editor sees is always the real state of the corpus.
import type { Manifest } from './manifest.js';

/** The three getting-started steps, their completion count, and the fixed step total. */
export interface GettingStarted {
  wrotePost: boolean;
  publishedPost: boolean;
  createdPage: boolean;
  doneCount: number;
  total: 3;
}

/**
 * Map the manifest and the pending-branch list to the three getting-started step states. Writing a
 *  post (published or pending) completes the first step; publishing one completes the second; a page
 *  (published or pending) completes the third.
 */
export function deriveGettingStarted(
  manifest: Manifest,
  pending: { concept: string; id: string }[],
): GettingStarted {
  const publishedPost = manifest.entries.some((e) => e.concept === 'posts');
  const wrotePost = publishedPost || pending.some((p) => p.concept === 'posts');
  const createdPage =
    manifest.entries.some((e) => e.concept === 'pages') || pending.some((p) => p.concept === 'pages');
  const doneCount = Number(wrotePost) + Number(publishedPost) + Number(createdPage);
  return { wrotePost, publishedPost, createdPage, doneCount, total: 3 };
}
