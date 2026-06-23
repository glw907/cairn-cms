// cairn-cms: RSS and JSON Feed builders (public-delivery design). Pure functions over a
// channel and a list of items, so they unit-test without a render or a network. The caller
// (a template +server.ts shim) assembles items from the content index and passes absolute
// URLs built from PUBLIC_ORIGIN.
import { escapeXml } from './xml.js';

/** Feed channel metadata. URLs are absolute. */
export interface FeedChannel {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  language?: string;
  author?: { name: string; email?: string };
}

/** One feed entry. `contentHtml` carries the rendered body for a full-content feed. */
export interface FeedItem {
  title: string;
  url: string;
  date?: string;
  updated?: string;
  summary: string;
  contentHtml?: string;
  tags?: string[];
}

/** Make a string safe inside a CDATA section by splitting any `]]>` across two sections. */
function cdataSafe(value: string): string {
  return value.replace(/]]>/g, ']]]]><![CDATA[>');
}

/**
 * Parse a YYYY-MM-DD (or ISO) string as a UTC instant. Returns undefined for an absent or
 *  unparseable date, so a feed omits the date field rather than emit Invalid Date or throw.
 */
function parseFeedDate(date?: string): Date | undefined {
  if (!date) return undefined;
  const at = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/** Format a date as an RFC-822 string in UTC, as RSS wants, or undefined when it cannot parse. */
function rfc822(date?: string): string | undefined {
  return parseFeedDate(date)?.toUTCString();
}

/** Format a date as an ISO-8601 instant in UTC, or undefined when it cannot parse. */
function iso(date?: string): string | undefined {
  return parseFeedDate(date)?.toISOString();
}

/** Build an RSS 2.0 document. */
export function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string {
  const entries = items
    .map((item) => {
      const content = item.contentHtml ?? item.summary;
      const pubDate = rfc822(item.date);
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        `      <description>${escapeXml(item.summary)}</description>`,
        // CDATA cannot contain `]]>`, so split that one sequence rather than escape the body.
        `      <content:encoded><![CDATA[${cdataSafe(content)}]]></content:encoded>`,
        '    </item>',
      ]
        .filter((line) => line !== '')
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.siteUrl)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    channel.language ? `    <language>${escapeXml(channel.language)}</language>` : '',
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />`,
    entries,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Build a JSON Feed 1.1 document. */
export function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string {
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: channel.title,
      description: channel.description,
      home_page_url: channel.siteUrl,
      feed_url: channel.feedUrl,
      ...(channel.language ? { language: channel.language } : {}),
      ...(channel.author ? { authors: [channel.author] } : {}),
      items: items.map((item) => {
        const datePublished = iso(item.date);
        const dateModified = iso(item.updated);
        return {
          id: item.url,
          url: item.url,
          title: item.title,
          summary: item.summary,
          ...(datePublished ? { date_published: datePublished } : {}),
          ...(dateModified ? { date_modified: dateModified } : {}),
          ...(item.contentHtml ? { content_html: item.contentHtml } : { content_text: item.summary }),
          ...(item.tags && item.tags.length ? { tags: item.tags } : {}),
        };
      }),
    },
    null,
    2,
  );
}
