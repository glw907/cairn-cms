---
title: Raw HTML
---
This page is the raw HTML layer of the conformance set. The sanitizer keeps the benign tags an author types and strips the rest. Each section below shows a tag the sanitizer keeps; the last shows one it strips.

## Tags the sanitizer keeps

<details>
<summary>A details block, closed until a reader opens it</summary>

The hidden text sits inside the details element.

</details>

<nav>
A nav element, kept as written.
</nav>

A line with <kbd>Ctrl</kbd> + <kbd>K</kbd>, <ins>inserted</ins> and <del>deleted</del> text, H<sub>2</sub>O, and x<sup>2</sup>.

<table>
<tr><th>A raw table</th><th>Header two</th></tr>
<tr><td>Cell one</td><td>Cell two</td></tr>
</table>

<img src="/images/conformance-square.svg" alt="A square frame holding two nested squares" width="120" height="120">

A link with a class: <a class="conformance-link" href="https://commonmark.org/">a raw link</a>.

## A tag the sanitizer strips

The next line holds a `marquee` element. The sanitizer does not allow it, so the page shows the stripped form: the words appear as plain text with no moving element around them.

<marquee>This text was inside a marquee tag, and the tag is stripped.</marquee>
