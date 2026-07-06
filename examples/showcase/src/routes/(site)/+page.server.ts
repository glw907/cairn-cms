import type { PageServerLoad } from './$types';
import { extractVocabulary } from '@glw907/cairn-cms';
import { posts } from '$chassis/content';
import { siteConfig } from '$theme/cairn.config';

export const prerender = true;

// The home reads its tag-filter options from the site's own committed vocabulary (the {value,label}
// list), so the control labels the slugs editors curate rather than the raw frontmatter tokens.
export const load: PageServerLoad = () => ({ posts: posts.all(), vocabulary: extractVocabulary(siteConfig) });
