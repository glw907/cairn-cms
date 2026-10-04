# Survey: writing the introduction of a technical docs page (2026-10-04)

Method note: pages fetched with WebFetch, which returns a model-condensed extract. Quotes below are as returned; spot-check a quote against the live page before it goes in a published doc. Class: STANDARD (published guide or template), BOOK (published book, via the author's site), PRACTITIONER.

## 1. Per source

### Google Technical Writing One, "Defining your audience"
URL: https://developers.google.com/tech-writing/one/audience. STANDARD. Applies to all types.
- "Begin by identifying your audience's role(s)." Also assess the audience's "proximity" to the subject.
- "good documentation = knowledge and skills your audience needs to do a task − your audience's current knowledge and skills."
- Curse of knowledge: "their expert understanding of a topic ruins their explanations to newcomers."
- Same content is adjusted per audience: a professor explains differently to graduate and first-year students.

### Google Technical Writing One, "Organizing large documents" (document opening)
URL: https://developers.google.com/tech-writing/one/documents. STANDARD. Applies to documents generally (examples are design docs and API docs).
- "State Your Scope": the sample says what the document describes and "does not describe."
- Identify audience and prerequisites: "This document is aimed at the following audiences: ..." and "assumes that you understand ...".
- State key points first: "Engineers and scientists are busy people who won't necessarily read all 76 pages of your document."
- Connect new ideas to familiar ones: "The Froobus API handles the same use cases as the Frambus API, except that the Froobus API is much easier to use."
- Organize by "Who is reading? Why? What should they know afterward?"

### Google Technical Writing Two, "Large documents" (introduction)
URL: https://developers.google.com/tech-writing/two/large-docs. STANDARD. Applies to long documents; page-sized docs inherit the logic.
- An introduction states "What the document covers. What prior knowledge you expect readers to have. What the document doesn't cover."
- Sample: "This document explains how to publish Markdown files using the Froobus system. Froobus is a publishing system that runs on a Linux server and converts Markdown files into HTML pages. This document is intended for people who are familiar with Markdown syntax ... This document doesn't include information about installing or configuring a Froobus publishing system."
- "Remember that you want to keep your documentation easy to maintain, so don't try to cover everything in the introduction."
- Check after drafting: "Does your introduction provide an accurate overview of the topics you cover?"

### Google Technical Writing One, "Paragraphs"
URL: https://developers.google.com/tech-writing/one/paragraphs. STANDARD. Applies to every paragraph, so to the intro's paragraphs.
- "The opening sentence is the most important sentence of any paragraph. Busy readers focus on opening sentences and sometimes skip over subsequent sentences."
- A good paragraph answers what ("What are you trying to tell your reader?"), why ("Why is it important for the reader to know this?"), how ("How should the reader use this knowledge?").

### Google developer documentation style guide, Headings and titles
URL: https://developers.google.com/style/headings. STANDARD (house base).
- Only intro-adjacent rule: "If you introduce a group of related H3 or lower sections within a larger H2 section, use the phrase the following sections." Not "this section" (ambiguous).
- Searched: the style guide has no dedicated rule on page introductions. (developers.google.com/style/text-structure and /documentation-types returned 404.) Silence is the finding.

### Diátaxis, tutorials
URL: https://diataxis.fr/tutorials/. STANDARD (community framework, widely adopted). Tutorials.
- "It's important to allow the learner to form an idea of what they will achieve right from the start."
- Preferred framing: "In this tutorial we will create and deploy a scalable web application. Along the way we will encounter containerisation tools and services." Avoid "In this tutorial you will learn..." as presumptuous.
- "Keep up a narrative of expectations."

### Diátaxis, tutorials vs how-to
URL: https://diataxis.fr/tutorials-how-to/. STANDARD. Tutorial, how-to.
- "A tutorial serves the needs of the user who is at study ... A how-to guide serves the needs of the user who is at work."
- Reader state (study vs work) decides what the opening owes the reader.

### Diátaxis, how-to guides
URL: https://diataxis.fr/how-to-guides/. STANDARD. How-to.
- "Choose titles that say exactly what a how-to guide shows."
- "Describe clearly the problem or task that the guide shows the user how to solve." ("This guide shows you how to...")
- "If you want x, do y."
- "Maintain focus on that goal."

### Diátaxis, explanation
URL: https://diataxis.fr/explanation/. STANDARD. Explanation.
- "provide background and context in your explanation: explain why things are so - design decisions, historical reasons, technical constraints."
- Open "with real or imagined why questions" to bound an open-ended topic.
- Titles with an "about" relation ("About user authentication").
- Remains bounded; read away from active task work.

### Diátaxis, reference
URL: https://diataxis.fr/reference/. STANDARD. Reference.
- "The only purpose of a reference guide is to describe, as succinctly as possible, and in an orderly way." "Neutral description is the key imperative." Link out to tutorials, how-tos, explanation rather than embedding them.
- No opening prescription beyond that; the structure mirrors the product.

### The Good Docs Project templates
STANDARD (community templates; the closest thing to per-type intro rules).
- Concept, https://www.thegooddocsproject.dev/template/concept: "Optionally, you may begin the document with an introductory paragraph before diving into the definition. This introductory paragraph can set the stage, explaining the concept's relevance and importance." "Apply the inverted pyramid technique here by starting with a high-level overview." May be skipped.
- How-to, .../template/how-to: Overview gives "A clear description of the problem or task that the user can solve or complete" and "when and why your user might want to perform the task." Assumes the user "know[s] what they want to achieve." Examples: "This guide explains how to create an issue on GitHub. You can create issues to track ideas, feedback, tasks, or bugs ..."
- Tutorial, .../template/tutorial: "The overview section is important, as it can motivate your users to begin their learning journey with your product and help set them up for success. There are three topics you should cover in this section: learning objectives, intended audience, and any prerequisite background knowledge."
- Quickstart, .../template/quickstart: Overview has "A short description of your application and its purpose", what users can accomplish, the intended audience, and "The basic knowledge that you expect the user to have".
- Reference, .../template/reference: introduction says what a reference article is ("descriptions of specific components or characteristics"), keeps procedural content limited, and distinguishes reference from API reference by reader (unfamiliar with the problem space vs domain expert).

### Mark Baker, Every Page Is Page One (BOOK)
URL: https://everypageispageone.com/the-book/ (author's site). All types.
- "Because a reader can arrive at an Every Page is Page One topic from anywhere, the topic must establish its context."
- "self-contained ... designed not merely to stand alone, but to function alone."
- "a specific and limited purpose. Their purpose is based on serving the reader's purpose, but is not necessarily identical with it."
- Secondary summary (techwhirl.com/every-page-page-one-topic-based-authoring-tech-comm-web/): readers arrive via search, recommendation, or link "with no continuity from where they were before"; "help readers to get their bearings quickly."
- The book itself was not read; only the author's site and a secondary summary.

### GitLab documentation style guide and topic types
URLs: https://docs.gitlab.com/development/documentation/styleguide/ ; .../topic_types/concept/ ; .../topic_types/tutorial/. STANDARD (company guide).
- Style guide: avoid "This page shows..." or "This guide explains..."; "These phrases slow the user down. Instead, get right to the point." Example: "GitLab has different types of pipelines to help address your development needs."
- Concept: opening answers "What is this? Why would you use it?" and "everything someone might want to know if they've never heard of this concept before." Defines the feature and its purpose; no implementation details.
- Tutorial: opens with "A paragraph that explains what the tutorial does, and the expected outcome." Optional "Before you begin" for prerequisites.

### Red Hat modular documentation guide and supplementary style guide
URLs: https://redhat-documentation.github.io/modular-docs/ ; https://redhat-documentation.github.io/supplementary-style-guide/. STANDARD (company guide).
- Concept intro: "a single, concise paragraph that provides a short overview"; answers "What is the concept?" and "Why should the user care about the concept?"
- Procedure intro: "what the module will help the user do and why it will be beneficial to the user."
- Short description: 50 to 300 characters; "Include user intent. Explain what the user must do and why"; "Do not use self-referential language, for example, 'This topic covers...'"; "Do not use feature-focused language. Focus on what users can accomplish rather than what the product does."

### Microsoft Writing Style Guide, developer content
URL: https://learn.microsoft.com/en-us/style-guide/developer-content/. STANDARD.
- "it's OK to assume IT pros and developers bring a fundamental understanding of programming concepts. So skip the basic knowledge and focus on technology-specific or product-specific information that helps them achieve their goals."
- No page-introduction rule found. (Microsoft Learn contributor templates for tutorial and conceptual articles returned 404.)

### Write the Docs, documentation principles
URL: https://www.writethedocs.org/guide/writing/docs-principles/. STANDARD (community).
- "Skimmable: Structure content to help readers identify and skip over concepts which they already understand." "Complete: cover concepts in full, or not at all." "Discoverable: Funnel users ... through all likely pathways."
- Nothing specific to introductions.

### Tom Johnson, I'd Rather Be Writing (PRACTITIONER)
URL: https://idratherbewriting.com/blog/writing-product-overviews/. Product overview (a docs home page), not a page intro.
- "The product overview ... explains what you can do with the product, including the high-level business goals, the market needs or pain points it solves, who the product or other features are for, and other introductory information."
- Only the opening excerpt was readable. Not a standard.

## 2. Convergent guidance

1. State what the page covers and who it is for. Google TW Two; Good Docs (tutorial, quickstart); GitLab (tutorial: what it does and the outcome); Red Hat (what the user can do).
2. State why the reader would care or when they would use it. Google TW One paragraphs ("why"); Good Docs how-to ("when and why"); Red Hat (concept, procedure); GitLab concept ("Why would you use it?").
3. State prerequisites or assumed knowledge, and non-coverage. Google TW Two; Good Docs (tutorial, quickstart); Google TW One documents.
4. Start from the reader's knowledge gap, not the author's. Google TW One audience; Microsoft developer content (skip basics); Write the Docs (skimmable).
5. Concept and explanation intros carry background: the what and why, design decisions, constraints. Diátaxis explanation; Good Docs concept; GitLab concept; Red Hat concept.
6. Tutorials set the destination, in the doing voice ("we will"). Diátaxis tutorials; Good Docs tutorial; GitLab tutorial.
7. How-to intros name the task or problem. Diátaxis how-to; Good Docs how-to; Red Hat procedure.
8. Keep intros short and do not try to cover everything. Google TW Two; Red Hat ("single, concise paragraph"); Good Docs concept (inverted pyramid).
9. The page must establish its own context because readers arrive from anywhere. Baker (EPPO); Write the Docs (discoverable, pathways).
10. Connect the new thing to something the reader already knows. Google TW One documents.

## 3. Differences and silences

- Self-reference. Google TW Two's sample and Good Docs overviews use "This document/guide explains ...". GitLab and Red Hat forbid "This page covers ..." and say to get to the point. The house base (Google) uses both forms; the sources split on meta-statements, not on content.
- Length. Red Hat fixes 50 to 300 characters for the short description and "a single, concise paragraph." Google gives no number. Good Docs concept calls the intro optional.
- Intro optional or required. Good Docs concept: optional. Google, Red Hat, GitLab: expected.
- Reference: Diátaxis wants austere neutral description; Good Docs reference template wants a statement of what a reference article is and who it serves. No source asks reference for background or why.
- "You will learn" phrasing. Diátaxis says avoid it; Good Docs tutorial template uses "By the end of this tutorial, you will be able to ...".
- SILENT in every source found: a page serving several readers with different reasons (only Google's "adapting for audiences" and Diátaxis's study/work split touch it, and neither addresses one page for both); pointing the reader from a harder route to an easier one; how to frame "what happens underneath"; the general model a page sits within as an intro job outside concept pages. Google style guide has no intro rule. Docs for Developers was not accessible (see section 6).

## 4. Reasoning guidance vs mechanical rules

Bears on the reasoning the owner asked for:
- Reader-first and intent: Google TW One ("Who is reading? Why? What should they know afterward?"; audience role plus proximity); Baker (purpose "based on serving the reader's purpose, but not necessarily identical with it"); Diátaxis (study vs work).
- Arriving from anywhere: Baker ("the topic must establish its context"; readers arrive with no continuity from where they were).
- Framing and background: Diátaxis explanation ("background and context ... why things are so"); Good Docs concept ("relevance and importance", "high-level overview"); Red Hat and GitLab concept ("why should the user care", "everything someone might want to know if they've never heard of this concept"); Google TW One (connect to the familiar).
- Boundaries: Google TW Two (covers, assumes, does not cover; do not cover everything).
- Check against delivery: Google TW Two ("Does your introduction provide an accurate overview ...").
- No source covers: several readers on one page, or recommending an easier route. Treat these as the owner's judgment, labeled unsourced.

Mechanical:
- Opening sentence carries the central point (Google TW One paragraphs).
- Avoid "This page shows ..." (GitLab, Red Hat) vs allowed (Google TW Two, Good Docs).
- "the following sections" not "this section" (Google style).
- Red Hat 50 to 300 characters; "single, concise paragraph."
- Tutorial: "we will", not "you will learn" (Diátaxis).
- Title says exactly what a how-to shows (Diátaxis).

## 5. Proposed brief section: "Writing the introduction"

Presented as prompts. Each sentence carries its source in brackets. Nothing here is unsourced except as marked in section 3.

> Ask who arrives at this page and what they know. [Google TW One audience: roles, proximity, knowledge gap.]
> Ask what each reader wants. A page's purpose serves the reader's purpose without being identical to it. [Baker.]
> Ask whether the reader is studying or at work. A learner needs a destination and a narrative; a worker needs the task named. [Diátaxis tutorials-how-to, tutorials, how-to.]
> Assume the reader may have landed here from search or a link, with no earlier page behind them, so say what this page is within its subject. [Baker: "the topic must establish its context."]
> Say what the page covers, what you assume the reader knows, and what it leaves out. [Google TW Two.]
> Say why the reader would want it and when. [Good Docs how-to; Red Hat concept and procedure; Google TW One paragraphs "why".]
> When the page explains or introduces a concept, give the background the reader lacks: why the thing exists, the decisions and constraints behind it. [Diátaxis explanation; Good Docs concept; GitLab concept.]
> Connect the new thing to something the reader already knows. [Google TW One documents.]
> For a tutorial, name what will be built and the path, in "we will" voice. [Diátaxis tutorials; GitLab tutorial.]
> For a how-to, name the task or problem the guide solves. [Diátaxis how-to; Red Hat procedure.]
> For reference, state what the page describes and for whom, then describe neutrally; send background and instruction to their own pages. [Good Docs reference; Diátaxis reference.]
> Keep the introduction proportionate; do not try to cover everything in it. [Google TW Two.]
> Put the central point in the first sentence of each paragraph. [Google TW One paragraphs.]
> After drafting the page, reread the introduction against what the page delivers. [Google TW Two.]
> Skip basics the reader already has. [Microsoft developer content.]

Not covered by any source (owner's judgment, to be ruled on, not asserted as published method): addressing two readers on one page, and pointing to an easier route.

## 6. Not accessed or weakly accessed

- Docs for Developers (Bhatti et al., Apress 2021): no excerpt on introductions reachable (search returned only listings; the O'Reilly and Springer pages were not fetched as full text). Not cited.
- Mark Baker's book text: not read; only the author's site and a secondary summary (techwhirl).
- Tom Johnson: only an excerpt of the product-overview post; no general page-intro guidance found.
- Google style guide: 404 on /style/text-structure and /style/documentation-types; no page-intro rule located.
- Microsoft contributor templates (tutorial, conceptual): 404.
- DigitalOcean docs style guide: 404, not surveyed.
- All quotes are via a condensing fetcher; verify against live pages before publishing any.
