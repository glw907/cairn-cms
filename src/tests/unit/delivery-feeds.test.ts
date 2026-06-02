import { describe, it, expect } from 'vitest';
import { buildRssFeed, buildJsonFeed } from '../../lib/delivery/feeds.js';
import type { FeedChannel, FeedItem } from '../../lib/delivery/feeds.js';

const channel: FeedChannel = {
  title: 'Site & Co',
  description: 'Posts',
  siteUrl: 'https://example.com',
  feedUrl: 'https://example.com/feed.xml',
};
const items: FeedItem[] = [
  {
    title: 'Hello <world>',
    url: 'https://example.com/posts/hello',
    date: '2026-05-09',
    summary: 'A & B',
    contentHtml: '<p>Body</p>',
  },
];

describe('buildRssFeed', () => {
  const xml = buildRssFeed(channel, items);
  it('emits a channel with an escaped title and a self link', () => {
    expect(xml).toContain('<title>Site &amp; Co</title>');
    expect(xml).toContain('https://example.com/feed.xml');
  });
  it('emits an item with an escaped title, a link, and an RFC-822 pubDate in UTC', () => {
    expect(xml).toContain('<title>Hello &lt;world&gt;</title>');
    expect(xml).toContain('<link>https://example.com/posts/hello</link>');
    expect(xml).toContain('<pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>');
  });
});

describe('buildJsonFeed', () => {
  const feed = JSON.parse(buildJsonFeed(channel, items));
  it('emits JSON Feed 1.1 with the channel and a feed_url', () => {
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(feed.title).toBe('Site & Co');
    expect(feed.feed_url).toBe('https://example.com/feed.xml');
  });
  it('emits an item with an id, a url, an ISO date, and html content', () => {
    expect(feed.items[0]).toMatchObject({
      id: 'https://example.com/posts/hello',
      url: 'https://example.com/posts/hello',
      title: 'Hello <world>',
      date_published: '2026-05-09T00:00:00.000Z',
      content_html: '<p>Body</p>',
    });
  });
});

describe('buildRssFeed CDATA safety', () => {
  it('splits a ]]> sequence in the content so it cannot close the CDATA early', () => {
    const xml = buildRssFeed(channel, [
      { title: 'T', url: 'https://example.com/posts/t', date: '2026-05-09', summary: 's', contentHtml: 'before ]]> after' },
    ]);
    const enc = xml.slice(xml.indexOf('<content:encoded>'), xml.indexOf('</content:encoded>'));
    // the only ]]> inside the section is the CDATA-splitter form, never a bare early close
    expect(enc).toContain(']]]]><![CDATA[>');
    expect(enc).not.toContain('before ]]> after');
  });
});

describe('feed date guard', () => {
  const undated: FeedItem = { title: 'No date', url: 'https://example.com/posts/x', summary: 's' };

  it('omits the RSS pubDate for an item with no date and does not throw', () => {
    const xml = buildRssFeed(channel, [undated]);
    expect(xml).not.toContain('<pubDate>');
    expect(xml).toContain('<link>https://example.com/posts/x</link>');
  });

  it('omits the JSON date_published for an item with no date and does not throw', () => {
    const feed = JSON.parse(buildJsonFeed(channel, [undated]));
    expect(feed.items[0].date_published).toBeUndefined();
    expect(feed.items[0].url).toBe('https://example.com/posts/x');
  });

  it('omits the date for a malformed date string rather than throwing', () => {
    const bad: FeedItem = { title: 'Bad', url: 'https://example.com/posts/y', date: 'not-a-date', summary: 's' };
    expect(() => buildJsonFeed(channel, [bad])).not.toThrow();
    expect(JSON.parse(buildJsonFeed(channel, [bad])).items[0].date_published).toBeUndefined();
    expect(buildRssFeed(channel, [bad])).not.toContain('<pubDate>');
  });
});
