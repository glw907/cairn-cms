---
title: Directives
---
This page is the directive layer of the conformance set: cairn's blocks, each shown empty, long, and nested inside another block. A theme styles the blocks, so each case checks a stress the everyday post never meets.

## Callout

An empty callout has a title and no body:

:::callout[An empty callout]{tone="note"}
:::

A long callout holds several paragraphs and a list:

::::callout[A long callout that keeps going so the title itself wraps onto a second line on a narrow screen]{tone="tip"}
A callout with a lot to say tests the space inside its box. This paragraph runs long on purpose: it describes a route over a ridge in more words than a reader needs, so the line length, the padding, and the gap before the next paragraph all show up in one place for a designer to judge.

A second paragraph follows the first, with a [link inside the callout](cairn:pages/conformance-parent) and some `inline code` to check how each sits against the callout's background.

:::points
- A point in the callout's list.
- A second point, longer than the first, so the list item wraps at a narrow width and shows its hanging indent.
:::
::::

A callout nested inside a question and answer:

::::faq{question="Can a callout sit inside an answer?"}
Yes, and this is how it looks.

:::callout[Nested callout]{tone="warning"}
The warning tone, inside the answer of a question.
:::
::::

## Alert

An empty alert:

:::alert[An empty alert]{role="caution"}
:::

A long alert:

:::alert[A long alert with a title that is far longer than any real alert needs]{role="caution"}
An alert is the heavier notice, so a long one is the worst case for the page's rhythm. This body carries enough text to fill several lines at the widest column and many more at the narrowest, because a theme that sizes the icon, the heading, and the body well at five lines must also size them well at fifteen. The sentence ends here, and a second follows to be sure of it.

A second paragraph closes the alert.
:::

An alert nested inside a callout:

::::callout[Outer callout]{tone="note"}
The alert below sits inside this callout.

:::alert[Nested alert]{role="caution"}
An alert inside a callout, so two bordered boxes share one edge.
:::
::::

## Icon

An empty icon, the normal case:

:::icon{name="flag"}
:::

A long icon, with a body far longer than an icon expects:

:::icon{name="flag"}
An icon is a single symbol and has no body in ordinary use. This body is here on purpose, long enough to measure the case where an author types text under it anyway, and the page must still hold together: the symbol, then the text, then the next block. The text keeps going for a few more words, then a few more, so that it passes the length this set treats as long, which is a number of characters no icon body will ever reach in honest use.
:::

An icon nested inside a callout:

::::callout[Icon inside a callout]{tone="tip"}
:::icon{name="flag"}
:::
::::

## Video

An empty video panel:

:::video{url="https://www.youtube.com/watch?v=YE7VzlLtp-4" title="An empty video"}
:::

A long video, with a very long title and a body under it:

:::video{url="https://www.youtube.com/watch?v=YE7VzlLtp-4" title="A video whose title is long enough to wrap across several lines in the facade, because a title that names a whole conference talk, its speaker, the venue, and the year is a title a real author will one day type"}
A caption under a video can run long. This one does, to show the space between the panel and the text below it, and to confirm that a long body does not push the panel out of its column or lose the line height the rest of the page keeps. It ends after a final clause that lifts it past the length limit.
:::

A video nested inside a callout:

::::callout[Video inside a callout]{tone="note"}
:::video{url="https://vimeo.com/76979871" title="A nested video"}
:::
::::

## Pull quote

An empty pull quote has its line and no body:

:::pull-quote[An empty pull quote.]
:::

A long pull quote:

:::pull-quote[A pull quote that is far too long for a pull quote, because a person will paste a whole sentence, then another, and the large type must still fit the column without overflowing it on a phone]{attribution="Someone whose attribution is also rather long, in the second paragraph of a long interview"}
A pull quote keeps its body outside the large type. This body adds more text under the quote, so the block has both a long quote and a long tail, and a theme sees the whole block grow rather than only the quoted line, which is the real stress for the layout.
:::

A pull quote nested inside a callout:

::::callout[Pull quote inside a callout]{tone="tip"}
:::pull-quote[A quote inside a callout.]
:::
::::

## Call to action

An empty call to action:

:::cta{label="Read more" url="https://cairn.pub" variant="primary"}
:::

A long call to action, with a label that wraps and a body under it:

:::cta{label="A button whose label is so long that it has to wrap onto a second and a third line, because a label that spells out the whole offer, the audience, the deadline, and the fine print is a label an enthusiastic author will type into the box" url="https://cairn.pub" variant="secondary"}
The body under a call to action runs long here as well, so the block shows a wrapped label above a wrapped paragraph. The paragraph continues past the length this set treats as long, with a few more words, to be certain.
:::

A call to action nested inside a callout:

::::callout[Call to action inside a callout]{tone="note"}
:::cta{label="Nested button" url="https://cairn.pub" variant="primary"}
:::
::::

## Micro call to action

An empty micro call to action:

:::micro-cta{label="More about cairn" url="https://cairn.pub" note="the documentation"}
:::

A long micro call to action:

:::micro-cta{label="A pointer link with a label so long that a compact link stops being compact and has to wrap in the middle of its own line, which is the case this entry exists to show" url="https://cairn.pub" note="a note that is also long, because the note sits beside the label and the two together must wrap without colliding on a narrow screen, where there is no room for either of them"}
A body under the pointer link, long enough to put the whole block past the length limit. It adds nothing a reader needs, and that is the point of a stress case that checks how the pieces share a narrow space.
:::

A micro call to action nested inside a callout:

::::callout[Micro call to action inside a callout]{tone="tip"}
:::micro-cta{label="Nested pointer" url="https://cairn.pub"}
:::
::::

## FAQ

An empty question, with no answer under it:

:::faq{question="A question with no answer?"}
:::

A long question and answer:

:::faq{question="A question that is long enough to wrap across several lines in the summary row, with the marker on the first line and the rest of the question hanging underneath it as a reader would expect?"}
The answer is long too. It has a first paragraph that fills a few lines so that the open state shows its spacing, and a second paragraph and a list below it.

A second paragraph, to show the gap inside the open answer. It also carries enough words to pass the limit this set uses for a long block.

- An item in the answer.
- Another item in the answer.
:::

A question nested inside a callout:

::::callout[Question inside a callout]{tone="note"}
:::faq{question="A nested question?"}
A nested answer.
:::
::::

## Banner

An empty banner, with its message in the attribute and no body:

:::banner{message="An empty banner, which stays until the year 2999." expires="2999-01-01"}
:::

A long banner:

:::banner{message="A banner whose message is long enough to wrap across several lines at a narrow width, because an announcement that explains a schedule change, the reason for it, and the new times in one sentence is the announcement an editor will paste in, and it stays until the year 2999." expires="2999-01-01"}
A body under the banner, long enough to lift the block past the length this set treats as long, to show how a banner holds a message and a paragraph together.
:::

A banner nested inside a callout:

::::callout[Banner inside a callout]{tone="note"}
:::banner{message="A nested banner, which stays until the year 2999." expires="2999-01-01"}
:::
::::

## Fragments

An include places a fragment inside the page:

::include{fragment="conformance-note"}

A second fragment holds a list and a quote:

::include{fragment="conformance-rich-note"}
