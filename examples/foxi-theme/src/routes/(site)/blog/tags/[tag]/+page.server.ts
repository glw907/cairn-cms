import type { PageServerLoad, EntryGenerator } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

export const entries: EntryGenerator = () => {
  const tags = new Set<string>();
  for (const post of posts.all()) for (const tag of post.tags ?? []) tags.add(tag);
  return [...tags].map((tag) => ({ tag }));
};

export const load: PageServerLoad = ({ params }) => {
  const matched = [...posts.all()]
    .filter((p) => p.tags?.includes(params.tag))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return { tag: params.tag, posts: matched };
};
