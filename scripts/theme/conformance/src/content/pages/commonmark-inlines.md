---
title: CommonMark inlines
---
This page is the inline layer of the conformance set, written against the CommonMark 0.31.2 section list: backslash escapes, entity and numeric character references, code spans, emphasis and strong emphasis, links, images, autolinks, raw HTML, hard line breaks, soft line breaks, and textual content.

## Backslash escapes

A backslash keeps a mark literal: \*not italic\*, \# not a heading, \[not a link\](nothing), and a backslash itself: \\.

## Entity and numeric character references

An ampersand written as &amp; and a less-than as &lt; and a copyright sign as &copy; and a numeric reference as &#35; and a hex reference as &#x1F;.

## Code spans

An `inline code span`, a span with a `` backtick ` inside `` it, and a long unbroken span: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.

## Emphasis and strong emphasis

*Emphasis with stars*, _emphasis with underscores_, **strong with stars**, __strong with underscores__, ***both at once***, and an intra*word*emphasis case. A line with a lone * star stays literal.

## Links

An [inline link](https://commonmark.org/ "with a title"), a [relative link](/archive/2), a [link with *emphasis* and `code`](https://commonmark.org/), a [reference link][inline-ref], a [collapsed reference][], a [shortcut reference], and a [link to a page](cairn:pages/conformance-parent).

[inline-ref]: https://spec.commonmark.org/0.31.2/
[collapsed reference]: https://commonmark.org/help/
[shortcut reference]: https://commonmark.org/

## Images

![A square frame holding two nested squares](/images/conformance-square.svg "An image with a title")

An image inside a link: [![A wide frame with a diagonal band across a pale field](/images/conformance-wide.svg)](https://commonmark.org/).

A reference image: ![A tall frame with a vertical stack of five bars][tall-image]

[tall-image]: /images/conformance-tall.svg

## Autolinks

An autolink in angle brackets: <https://commonmark.org/> and an email form: <someone@example.com>.

## Raw HTML

Inline raw HTML sits in a sentence: a <kbd>Ctrl</kbd> key, H<sub>2</sub>O, and x<sup>2</sup>.

## Hard and soft line breaks

A hard break made with two trailing spaces  
starts a new line in the same paragraph. A hard break made with a backslash\
does the same. A soft break is a plain newline,
and renders as a space.

## Textual content

Plain text with an em-dash like this --- or an ellipsis like this... or "straight quotes" that the site may smarten.
