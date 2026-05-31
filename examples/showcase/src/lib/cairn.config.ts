// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a trivial design-accurate render, and a backend the dev GitHub double answers for.
import type { CairnAdapter } from '@glw907/cairn-cms';

export const cairn: CairnAdapter = {
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
      ],
      validate(frontmatter, _body) {
        const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
        if (!title) return { ok: false, errors: { title: 'Title is required' } };
        return { ok: true, data: { ...frontmatter, title } };
      },
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  // Design-accurate enough for the preview: wrap each non-empty line in a paragraph.
  render: (md) =>
    md
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `<p>${line}</p>`)
      .join(''),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
};
