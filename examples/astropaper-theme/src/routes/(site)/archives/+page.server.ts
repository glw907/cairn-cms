import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** One month's entries, newest first, inside a year group. */
export interface MonthGroup {
  month: string;
  count: number;
  posts: ReturnType<typeof posts.all>;
}

/** One year's month groups, newest month first. */
export interface YearGroup {
  year: string;
  count: number;
  months: MonthGroup[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Groups the whole post index by year, then month, newest first throughout, styled after
 *  AstroPaper's own `src/pages/archives/_utils/getPostsByGroupCondition.ts` (MIT). */
export const load: PageServerLoad = () => {
  const all = [...posts.all()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const byYear = new Map<string, Map<string, typeof all>>();

  for (const post of all) {
    if (!post.date) continue;
    const [year, month] = post.date.split('-');
    if (!byYear.has(year)) byYear.set(year, new Map());
    const months = byYear.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(post);
  }

  const years: YearGroup[] = [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => {
      const monthGroups: MonthGroup[] = [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, entries]) => ({
          month: MONTH_NAMES[Number(month) - 1] ?? month,
          count: entries.length,
          posts: entries,
        }));
      const count = monthGroups.reduce((sum, m) => sum + m.count, 0);
      return { year, count, months: monthGroups };
    });

  return { years };
};
