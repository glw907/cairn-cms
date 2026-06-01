// cairn-cms: response helpers for the public delivery endpoints. Each wraps a builder in a
// Response with the correct Content-Type, so a site's +server.ts GET is a single call. The
// content type is the one detail every site otherwise copies and occasionally gets wrong.
import { buildRssFeed, buildJsonFeed, type FeedChannel, type FeedItem } from './feeds.js';
import { buildSitemap, type SitemapUrl } from './sitemap.js';
import { buildRobots } from './robots.js';

/** An RSS 2.0 feed response. */
export function rssResponse(channel: FeedChannel, items: FeedItem[]): Response {
  return new Response(buildRssFeed(channel, items), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}

/** A JSON Feed 1.1 response. */
export function jsonFeedResponse(channel: FeedChannel, items: FeedItem[]): Response {
  return new Response(buildJsonFeed(channel, items), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}

/** A sitemap response. */
export function sitemapResponse(urls: SitemapUrl[]): Response {
  return new Response(buildSitemap(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

/** A robots.txt response. */
export function robotsResponse(opts: { sitemapUrl: string; disallow?: string[] }): Response {
  return new Response(buildRobots(opts), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
