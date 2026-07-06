---
title: Adding new posts in AstroPaper theme
date: 2026-06-03
description: Some rules and recommendations for creating or adding new posts using AstroPaper theme.
tags:
  - astro
  - blog
  - docs
featured: true
---

A new post is a new markdown file in the posts directory. AstroPaper recommends a short,
descriptive filename and a frontmatter block that carries the title, the date, and a one-line
description search engines will show.

```md
---
title: My New Post
date: 2026-06-03
description: A short summary shown on the index and in search results.
tags: [astro, blog]
---

The post body starts here.
```

A few conventions keep the archive readable:

1. Write the description as a single sentence a reader can scan in the index.
2. Keep the tag list short. Three or four tags is plenty for a personal blog.
3. Set `featured: true` sparingly. It is meant to pin your best two or three posts, not every one.

Everything else, the reading surface, the code-block highlighting, the responsive layout, is the
theme's job, not the post's.
