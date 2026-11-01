// Known-bad for S08-public-routes: the archive and the feed read the markdown files straight off
// disk through a route-level glob and a hand-rolled frontmatter split, outside the site's content
// index. Drafts leak in, the feed is hand-assembled XML with relative links, and nothing links the
// archive from the menu.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/routes/(site)/notes'), { recursive: true });
  mkdirSync(join(root, 'src/routes/notes/feed.xml'), { recursive: true });
  const read = `const raw = import.meta.glob('/src/content/notes/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const notes = Object.entries(raw).map(([path, text]) => {
  const title = /^title: (.*)$/m.exec(text)?.[1] ?? path;
  const date = /^date: (.*)$/m.exec(text)?.[1] ?? '';
  const id = path.split('/').pop()!.replace(/^\\d{4}-\\d{2}-\\d{2}-/, '').replace(/\\.md$/, '');
  return { id, title, date, body: text.replace(/^---[\\s\\S]*?---\\n/, '') };
});
`;
  writeFileSync(
    join(root, 'src/routes/(site)/notes/+page.server.ts'),
    `${read}
export const prerender = true;

export const load = () => ({ notes: notes.sort((a, b) => (a.date < b.date ? 1 : -1)) });
`,
  );
  writeFileSync(
    join(root, 'src/routes/notes/feed.xml/+server.ts'),
    `${read}
export const prerender = true;

export const GET = () => {
  const items = notes
    .map((n) => \`<item><title>\${n.title}</title><link>/notes/\${n.id}</link><description>\${n.body}</description></item>\`)
    .join('');
  return new Response(\`<?xml version="1.0"?><rss version="2.0"><channel><title>Notes</title>\${items}</channel></rss>\`, {
    headers: { 'Content-Type': 'application/rss+xml' },
  });
};
`,
  );
}
