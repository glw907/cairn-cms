# Page-level review prior art (task 7a, 2026-09-30)

Agent-facing record. It answers the owner rulings of 2026-10-01 recorded in
`2026-09-30-draft-docs-2a-pilot-job-read.md`: every page needs an introduction, structure precedes line
editing, and the chain adopts published systems and existing mechanisms only (no invented tags, fields,
checklists, or rule wording). A part no published source covers is dropped and listed under "Dropped".
Quotes are verbatim from the sources as fetched on the access date.

## Sources read

Access date for every URL: 2026-09-30.

| Short name | URL | Version or date |
|---|---|---|
| Good Docs concept template | https://gitlab.com/tgdp/templates/-/blob/main/concept/template_concept.md | Templates repo tag `v1.6.0` (2026-06-11), `main` head `41645d9cc4b7d80db06d03cd7b862c16ece849b8` |
| Good Docs concept guide | https://gitlab.com/tgdp/templates/-/blob/main/concept/guide_concept.md | same |
| Good Docs how-to template | https://gitlab.com/tgdp/templates/-/blob/main/how-to/template_how-to.md | same |
| Good Docs how-to guide | https://gitlab.com/tgdp/templates/-/blob/main/how-to/guide_how-to.md | same |
| Good Docs tutorial template | https://gitlab.com/tgdp/templates/-/blob/main/tutorial/template_tutorial.md | same |
| Good Docs tutorial guide | https://gitlab.com/tgdp/templates/-/blob/main/tutorial/guide_tutorial.md | same |
| Diátaxis tutorials | https://diataxis.fr/tutorials/ | undated, read through a fetch summary, so only short quotes are used |
| Diátaxis how-to guides | https://diataxis.fr/how-to-guides/ | same |
| Diátaxis explanation | https://diataxis.fr/explanation/ | same |
| Google Technical Writing Two, "Organizing large documents" | https://developers.google.com/tech-writing/two/large-docs | page footer "Last updated 2025-03-31 UTC" |
| Red Hat peer review guide | https://redhat-documentation.github.io/peer-review/ | undated, read through a fetch summary |
| DigitalOcean's Technical Writing Guidelines | https://www.digitalocean.com/community/tutorials/digitalocean-s-technical-writing-guidelines | undated; page HTML read directly |
| DigitalOcean, Write for DOnations | https://www.digitalocean.com/community/pages/write-for-digitalocean | undated, read through a fetch summary |
| Federal Plain Language Guidelines, March 2011, Rev. 1, May 2011 | https://www.plainlanguage.gov/media/FederalPLGuidelines.pdf (301 to https://digital.gov/guides/plain-language; read from the Wayback copy `https://web.archive.org/web/2023/https://www.plainlanguage.gov/media/FederalPLGuidelines.pdf`) | 118 pages; "V. Test" starts at page 99 |
| Editorial Freelancers Association, editorial service definitions | https://www.the-efa.org/editorial-services-definitions/ | undated |
| Wikipedia, Levels of edit (Van Buren and Buehler; Rude's eight levels, titles only) | https://en.wikipedia.org/wiki/Levels_of_edit | undated |
| Google opendocs maturity checklist | https://github.com/google/opendocs/blob/main/audit/checklist.md | `main` at fetch time |

Where the Good Docs templates live: the GitHub repo `thegooddocsproject/templates` is archived (last push
2022-09-18) and holds only 2022 versions. The current templates, with the `concept` template this record
needs, are on GitLab at https://gitlab.com/tgdp/templates (releases, latest `v1.6.0`). This record reads the
GitLab files, not the archived GitHub ones.

Repo files read: `docs/internal/docs-register.md` (anatomies at lines 591-632, the extend track profile at
693-714, the deviations tables at 879-918), `docs/internal/outlines/extend.json`,
`~/.claude/agents/cairn-docs-drafter.md`, `docs/internal/engine-rulings.md` (entry format, lines 1-20),
`docs/internal/briefs/extend/security-model.json`, `scripts/checks/check-provenance.mjs`,
`docs/internal/facts/README.md`, `docs/superpowers/specs/2026-09-08-docs-standard-design.md`,
`docs/superpowers/specs/2026-09-21-draft-docs-design.md`.

## The page types the extend arm uses

The outline's `pageType` values map to the Good Docs types as follows. `concept` pages (architecture,
security-model) take the concept template. `tutorial milestone` pages (add-cairn-to-a-sveltekit-app) take the
tutorial template. Task pages (replace-magic-links..., add-a-custom-admin-screen, theme-your-public-site) take
the how-to template. The register today has an anatomy row for the task guide and the tutorial milestone and
none for a concept page.

## a. Anatomies

### What the register says today, and where it is silent

Register "The page anatomies" (`docs/internal/docs-register.md:591-632`):

- Task guide: "1. A one-line contract naming what the reader accomplishes. 2. Preconditions, each stated with a
  link to whatever produces it. 3. The steps ... 4. A verification section ... 5. Failure paths that point at the
  track's recovery surface". Silent on: who the page is for, when and why the reader would do the task, a cue that
  routes the wrong reader elsewhere, and any ending after the failure paths (no see-also, no next page).
- Tutorial milestone: "stated objectives, the state the prior milestone produced, steps, a checklist before
  advancing, and a disclosure block". Per milestone only. Silent on a page-level overview (audience, assumed
  knowledge, what the tutorial builds), a page-level summary, and next steps.
- Reference entry: "now opening with a short narrative lede, a sentence or two of what the shape is and why it
  exists, before the table". This is the only anatomy row that requires an opening. Reference pages are outside
  the extend pilot.
- Concept page: no anatomy row exists. The extend track profile (`:693-714`) names a register ("contract-first
  task, tutorial, and concept prose") and a counterpart question and nothing about page shape.
- The one-line contract is not an introduction. The Good Docs how-to template's overview carries two parts, "This
  guide explains how to {insert a brief description of the task}." and "{Optional: Specify when and why your user
  might want to perform the task.}", and its guide's Overview section adds the problem or task and "When and why
  your user might want to perform the task". The register's contract names only what the reader accomplishes.
  The task-guide one-line contract alone does not meet the introduction requirement.

Format of an overlay row (`docs-register.md:899-909`): four columns, Base rule, What cairn does instead,
Evidence, Ruling. Rows record departures from a Google rule and "Only Geoff adds a row". The register's own test
(`:884-888`): "A tightening forbids only a form the guide permits or is silent on, and it needs no record."
Google's guide is silent on an introduction requirement per page type, so the anatomy additions below are
tightenings: they belong in "The page anatomies" section with a provenance line, and need no Deviations row. If
Geoff prefers a recorded row anyway, the row text is the "What cairn does instead" cell below, the evidence is the
template URL, and the ruling cell is his 2026-10-01 ruling.

### Concept: the Good Docs concept template (v1.6.0)

Template, opening of the file, as published:

> A summary paragraph introducing a concept, explaining its importance or relevance, and providing an overview of
> the content that will be covered in the document (scope).
>
> Typical wording to use is:
>
> * This article explains the basics of {concept} and how it works in {the tool or context}.

The template then defines the concept ("{Then include a paragraph with a definition of the concept you are
explaining.}", with "This section usually doesn't have a separate heading"), then optional Background, "Use
cases" ("{Use this section to provide use cases and explain how a reader can benefit from a concept.}"), optional
comparison, and an optional closing section:

> ## (Optional) Related resources
> ... If you would like to dive deeper or start implementing {concept}, check out the following resources:
> How-to guides / Linked concepts / External resources

The concept guide, "Contents of the concept document":

> ### (Optional) An introductory paragraph
> Optionally, you may begin the document with an introductory paragraph before diving into the definition. This
> introductory paragraph can set the stage, explaining the concept's relevance and importance. It provides readers
> with a context for what they're about to learn and what they can expect in the document.
> Apply the inverted pyramid technique here by starting with a high-level overview.
> You may skip it and jump right into the definition section.

Tension inside the source, recorded as found: the template file opens with a summary paragraph that has no
"optional" mark, while the guide marks the introductory paragraph "(Optional)" and says "You may skip it and jump
right into the definition section." The guide's "Giving a definition" section then carries the scope duties: "This
is a good moment to define the scope of the concept - define its boundaries, what you'll cover in a document and how
deep into details you will dive", and "It may be useful to define what is out of scope". Its "Key questions" best
practice: "Address the key questions of what, when, who, why, where, and how (5W and 1H), placing these explanations
near the beginning of your document. One more technique is to answer the question 'How can I use it' or 'How it
helps me' from the reader's perspective." The owner's 2026-10-01 ruling resolves the tension: every page has an
introduction, so the template's un-bracketed summary paragraph governs and the guide's "(Optional)" is not adopted.

The guide on how the reader arrives (the "read instead" case): "They may land in your concept document by clicking
a link in the How-to document prerequisites or by clicking a link from a related concept document." On scope:
"If the explanation begins to explain another concept, it is advisable to start a different concept document and
provide a link." On the ending: the optional "Related resources" section, with "If you have many related links,
split them into a few groups ... not more than 3-5 links each".

The Good Docs concept template has no summary or conclusion section. A concept page's ending is its Related
resources section, so the concept ending is a see-also block, nothing synthesizing. The pilot read flagged
`architecture` for stopping "on a link (`:162`) with no closing synthesis"; no published Good Docs text supports a
closing synthesis for a concept (DigitalOcean does, see below).

DigitalOcean's conceptual article structure, published at the DigitalOcean guidelines page: "Conceptual articles
will have a title, an introduction, and a conclusion, but they might not have a prerequisites section or follow
the 'Step' convention", with a structure of Title, Introduction, "Prerequisites (optional)", Subtopics, Conclusion.
Its Introduction text: "The first section of every article is the **Introduction**, which is usually one to three
paragraphs long. The purpose of the introduction is to motivate the reader, set expectations, and summarize what
the reader will do in the article." Its questions:

> * **What is the tutorial about?** What software is involved and what does each component do (briefly)?
> * **Why should the reader learn this topic?** What are the benefits of using this particular software in this configuration? ...
> * **What will the reader do or create in this tutorial?** ...
> * **What will the reader have accomplished when they're done?** What new skills will they have? ...
>
> Answering these questions in your introduction will also help you design a clear and reader-focused tutorial, as
> you'll align the content of your tutorial to the things you mention in the introduction. A good introduction lets
> the learner know what the rest of the article is about.

and its Conclusion text: "The **Conclusion** of your tutorial should summarize what the reader has accomplished by
following your tutorial. ... The conclusion should also describe what the reader can do next, which can include a
description of use cases or features the reader can explore, links to other DigitalOcean tutorials with additional
setup or configuration, and links to external documentation."

Adopted for the concept anatomy: the Good Docs concept template as the base, with DigitalOcean cited as the second
source that requires a conclusion. Proposed anatomy line (drawn from the quotes; provenance in parentheses):

> **Concept page** (the extend track's architecture and security model pages). It opens with an introduction, a
> summary paragraph that introduces the concept, explains its importance or relevance, and gives an overview of the
> content the page covers (its scope), and that states what is out of scope and the pages that cover it. A definition
> of the concept follows. The sections after it each take one subtopic. The page ends with a related-resources
> section grouped as how-to guides, linked concepts, and external resources. (Good Docs concept template v1.6.0,
> https://gitlab.com/tgdp/templates/-/blob/main/concept/template_concept.md, and its guide; Geoff, 2026-10-01.)

The out-of-scope clause is the concept guide's "It may be useful to define what is out of scope", made required by
the owner's ruling that every page carries an introduction. It also meets Google's "What the document doesn't
cover." (see the Google source below).

### Tutorial: the Good Docs tutorial template (v1.6.0)

Template, as published:

> ## Overview
> In this tutorial, you'll learn how to {insert brief description of the main tutorial task}. This tutorial is
> intended for {audience}. It assumes you have basic knowledge of:
> * Concept 1 ...
> By the end of this tutorial, you'll be able to:
> * Learning objective 1 ...
>
> ## Background  {This section is optional. ...}
> ## Before you start ... * Prerequisite 1 ...
> ## {Task name} ... steps ...
> ## Summary
> {Use this section to summarize what the user learned in the tutorial.}
> In this tutorial, you learned how to: * Summary point 1 ...
> ## Next steps
> {Use this section to share links to related tutorials, videos, or other documentation}.

Guide: "The overview section is important, as it can motivate your users to begin their learning journey with your
product and help set them up for success. There are three topics you should cover in this section: learning
objectives, intended audience, and any prerequisite background knowledge." and "It's important to mention the
intended audience and any prerequisite knowledge in the overview section. This information helps users determine if
the content is appropriate for them." The summary: "In the summary section, you can list the knowledge and skills
your users have gained by completing your tutorial. Try to avoid repeating the learning objectives you listed in the
overview section word for word." Next steps: "Use this section to include links to other tutorials, such as
tutorials that allow users to learn about related features. You can also include links to relevant resources, like
articles, blogs, or videos." Size limits in the guide: "Avoid writing procedures that are more than seven primary
steps long." and "Ideally, your tutorial should take 15 to 60 minutes to complete."

Proposed anatomy line, which sits above the existing "Tutorial milestone" row's per-milestone shape:

> **Tutorial** (a page of milestones). It opens with an overview that says what the tutorial teaches the reader to
> do, who it is intended for, the knowledge it assumes, and what the reader can do by the end. A prerequisites
> section follows. The milestones follow, each in the tutorial-milestone shape. The page ends with a summary of
> what the reader learned, in different words from the overview's objectives, and a next-steps section that links
> related tutorials and other documentation. (Good Docs tutorial template v1.6.0,
> https://gitlab.com/tgdp/templates/-/blob/main/tutorial/template_tutorial.md, and its guide; Geoff, 2026-10-01.)

Voice conflict, to rule on before the line lands: the template's "In this tutorial, you'll learn how to" is second
person. Diátaxis rejects it: "'In this tutorial you will learn…' ... presumptuous and a very poor pattern", and
prefers "In this tutorial we will create and deploy a scalable web application." DigitalOcean agrees with the
Good Docs template's second person: "Instead of using phrases like 'we will learn how to,' use phrases like 'you
will configure' or 'you will build.'" The register's first-person row (`docs-register.md:907`) admits "we" only for
the author's evidence. Two published sources against one, and the register already bars the first person for this
use, so the anatomy takes the second person and states the outcome ("By the end, you can ...") and not a claim about
what the reader will learn. The Diátaxis point is also why the line above says "what the reader can do by the end".

### How-to (task): the Good Docs how-to template (v1.6.0)

Template, as published:

> ## Overview
> This guide explains how to {insert a brief description of the task}.
> {Optional: Specify when and why your user might want to perform the task.}
> ## Before you start
> {This section is optional}
> Before you {insert a brief description of the task}, ensure: ...
> ## {Task name} ... steps ...
> ## See also
> {Include references and/or links to other related documentation such as other how-to guides, conceptual topics,
> troubleshooting information, and limitation details if any. ...}

Guide, "About the 'Overview' section": "Use this section to provide the following: A clear description of the
problem or task that the user can solve or complete. When and why your user might want to perform the task." and
"The how-to assumes that a user has basic knowledge of the application and knows what they want to achieve." Guide,
"About the 'Before you begin' section", the wrong-place cue: "Optionally, provide cues that signal to a user that
they're probably in the wrong place and offer more suitable options. For example, If you are a Linux user, refer to
{link to relevant Linux how-to guide}." Guide, "About the 'See also' section": "This section is useful to provide
your users with suggestions on further reading without interrupting the topic covered by the current document." Guide
best practice: "Avoid over-documenting multiple ways of achieving the same task. ... Additional methods should be
omitted or mentioned by providing a link or reference document." and "Keep your users on a single page as much as
possible and provide links to additional resources at the bottom of the page."

Diátaxis, how-to guides (cross-check): "This guide shows you how to…" should "Describe clearly the problem or task
that the guide shows the user how to solve."; "It should start and end in some reasonable, meaningful place, and
require the reader to join it up to their own work."; and the link-out rule, "Refer to the x reference guide for a
full list of options." Agrees with the Good Docs overview and See also.

Proposed anatomy lines for the register's task-guide row. The existing numbered list stays; the changes are an
expanded item 1 and a new item 6:

> 1. An introduction. It states the task, when and why the reader would do it, who the page is for, and, where a
>    reader could be on the wrong page, the page to read instead. This replaces the one-line contract; the contract
>    (what the reader accomplishes) stays as the introduction's first sentence.
> 6. A see-also section that links related how-to guides, concept pages, troubleshooting, and limitations the page
>    leaves out.

(Good Docs how-to template v1.6.0, https://gitlab.com/tgdp/templates/-/blob/main/how-to/template_how-to.md, and its
guide; Geoff, 2026-10-01.) The register's failure-path item 5 already carries the troubleshooting link, so the
see-also section links the rest and does not repeat it.

Where the three Good Docs endings differ, and what the extend pilot needs: concept ends in Related resources,
tutorial ends in Summary then Next steps, how-to ends in See also. The pilot read found `add-cairn-to-a-sveltekit-app`
"stops at the email check (`:1088`) with no 'you now have a production site' and no next pages" (the tutorial's
Summary and Next steps), `replace-magic-links-with-cloudflare-access` "ends at verify step 5 (`:271`) with no failure
path or route to debugging" (the register's own item 5, plus See also), and `architecture` "stops on a link" (a
Related-resources section, which the template makes optional and the owner's ruling makes required on every page).

### Diátaxis cross-check on opening and ending

- Tutorial: opens by showing "the learner where they'll be going"; ends by acknowledging what the learner built.
  Sequencing: "First, do x. Now, do y. Now that you have done y, do z." Hand-off to explanation: "a link or reference
  to that explanation, so that it's available, but doesn't get in the way."
- How-to: opens with the problem or task the guide solves; sequence is the structure; "Linking Out" to reference
  rather than listing every option.
- Explanation: "Keep explanation closely bounded"; "you should be able to place an implicit (or even explicit)
  *about* in front of each title"; "Provide background and context in your explanation: explain *why* things are so";
  and use "a real or imagined *why* question to serve as a prompt" to define scope. Diátaxis gives no opening or
  ending sections for explanation and no checklist. It confirms the concept template's bounded-scope intro and
  supports the security-model page opening on why the design assumes what it assumes. Not cited by any published
  page (`docs-register.md`, "No published page cites Diátaxis").

### The 09-08 spec's "page describing itself" tell

`docs/superpowers/specs/2026-09-08-docs-standard-design.md:656-660` adds three tells to the writing-voice output
style: "the two-headed heading, the abstract noun standing in for the concrete thing, and the page describing
itself." The pilot pages' meta-sentence openers ("This page assesses, one exposed component at a time, what cairn
defends ...", `docs/internal/briefs/extend/security-model.json` first sentence) are that tell. It conflicts on its
face with the sentences the published templates require: "This guide explains how to {task}", "This article
explains the basics of {concept}", and Google's own "This document explains how to publish Markdown files using the
Froobus system." Read against these sources, the tell cannot mean "the introduction names the page"; the defect in
the pilot openers is that they name the page and nothing the reader needs: no reader, no decision, no other page.
The structural seat must check for that content (items 1 to 4 under b) and not ban the form. Whichever way Geoff
rules, the register line and the tell must be scoped together, or a drafter satisfying the anatomy trips the tell.

## b. Structural edit seat

### What exists, and what does not

No single published checklist covers a whole technical page at the structural level and also tests the
introduction. What exists is a definition of the level, one peer-review checklist for technical docs that covers
structure but not the introduction, and a published list for the introduction that is not framed as a review. The
recommendation runs two published blocks verbatim and invents no third.

Definition of the level, for the seat's prompt header. The EFA: "Developmental editors (also called 'substantive,'
'structural,' or 'content' editors) deal with content, organization, and genre considerations. After reviewing a
manuscript, they may provide an overall critique of the content ... or ... a revision (or 'editorial' or 'edit')
letter that outlines the big-picture issues and offers suggestions for how to address them." and, on order: "Line
editing may be performed as a separate service, in conjunction with developmental editing after big-picture issues
have been addressed". That is the published authority for the owner's rule that line editing waits for structure.
The EFA gives no checklist. The Levels of edit article lists Rude's "Developmental outline: Technical document" and
"Technical: Document" and "Style: Document" levels by working unit but carries no definitions or questions (its
page lists titles only). Chicago, Einsohn, and Rude's own text are not freely published and were not read; they are
not adopted. Google's opendocs maturity checklist was read and rejected: it grades a project's docs program, not a
page.

### Recommended: Red Hat peer review guide, "Structure Checklist", plus Google's introduction and navigation items

Block 1, Red Hat's Structure Checklist (https://redhat-documentation.github.io/peer-review/), verbatim, the
checklist for technical documentation written for reviewing a whole module against its type:

> **Structure meets modular guidelines**
> - Module types are not mixed.
> - Module types are used correctly.
> - Tags and entities are used correctly.
> - Modules are as self-contained as possible to facilitate reuse.
>
> **A logical flow of information**
> - Information is provided at the right pace.
> - Information is presented in the most logical order and location.
> - Cross-references are used appropriately and only when useful.
>
> **User stories**
> - The user goal is clear.
> - Tasks reflect the intended goal of the user.
> - Troubleshooting and error recognition steps are included where appropriate.

The first group is Red Hat's modular framework (module types are its concept, procedure, and reference types;
"Tags and entities" is AsciiDoc). Run its first, second, and fifth items as published only where they map to
cairn's page types ("Module types are not mixed", "Module types are used correctly"), and leave "Tags and entities"
and "reuse" out as inapplicable; naming an item inapplicable is a selection, not a rewrite. The "A logical flow
of information" group and "User stories" group run whole. Red Hat's Minimalism checklist ("The text does not include
unnecessary information.") is the published counterpart of the drafter's removal rule and is the item the owner's
hand-off finding sits against, see (c).

Block 2, Google Technical Writing Two, "Organize a document", the introduction duties and the whole-document review
the page itself prescribes (https://developers.google.com/tech-writing/two/large-docs):

> If readers of your documentation can't find relevance in the subject, they are likely to ignore it. To set the
> ground rules for your users, we recommend providing an introduction that includes the following information:
> What the document covers.
> What prior knowledge you expect readers to have.
> What the document doesn't cover.
> Remember that you want to keep your documentation easy to maintain, so don't try to cover everything in the introduction.

and its review step:

> After you've completed the first draft, check your entire document against the expectations you set in your
> overview. Does your introduction provide an accurate overview of the topics you cover?

and its navigation list:

> Clear navigation includes:
> introduction and summary sections
> a clear, logical development of the subject
> headings and subheadings that help users understand the subject
> a table of contents menu that shows users where they are in the document
> links to related resources or more in-depth information
> links to what to learn next

and its heading-lead-in rule: "Most readers appreciate at least a brief introduction under each heading to provide
some context." (the published form of the register's existing rule that each explanatory section "opens with a
sentence tying it to the task"). Google also publishes "Outline a document": "You might find it useful to think of an
outline as the narrative for your document" and "Structure your outline so that your document introduces information
when it's most relevant to your reader," which gives the seat a published reason to re-sequence sections that follow
the outline's `covers` order as an inventory.

Why this pairing: both are published for technical documentation, both are lists a reviewer can run item by item
against a page and its outline entry (`job`, `covers`, `outOfScope`), and together they are short enough to
paste into a reviewer prompt. No other published source read covers the introduction as a review item.

Which item checks the introduction: Google's three-part introduction list, "What the document covers", "What prior
knowledge you expect readers to have", "What the document doesn't cover", checked together with its review question
("Does your introduction provide an accurate overview of the topics you cover?"). Red Hat's "The user goal is
clear" is the nearest item inside Block 1 and is not enough alone, as the pilot's meta-sentence openers pass it. The
type-specific introduction duties come from the page's Good Docs template (a) and are the second half of the same
check: for a concept, the summary paragraph; for a tutorial, the overview with intended audience, assumed knowledge,
and what the reader can do by the end; for a how-to, the task and when and why to do it.

How it checks against the outline entry: the outline's `job` is the page's purpose, `covers` is the list the page
must deliver in the order the seat judges (Block 1 "most logical order"), and `outOfScope` is the page's
"doesn't cover" list; the seat compares the introduction to those three. It does not need a new field.

Stance the seat takes: an editor. It reads the whole page against the outline and this checklist, returns findings
with `file:line`, and never edits. It runs before line editing and before the fact read's ordering concerns, and
the final reader read in (f) is a separate seat.

## c. Drafter

Quoted rules in `~/.claude/agents/cairn-docs-drafter.md`:

- Line 32-34: "The first sentence of each section states its answer. A reader who stops after that sentence already
  has the section's point; everything after it is support, a step, or a caveat, never a delayed reveal."
- Line 36-38 (the removal rule): "Write with no padding. A sentence that restates something the previous sentence
  already said, a hedge that adds no information, and a transition word doing no work are all cuts, not style. If a
  sentence can be removed without losing a fact or a step, remove it."
- Line 41-43 (the `no-claim` tag): "record it with the fact id it draws from, from the ids the dispatch handed you,
  or `no-claim` when it carries no traceable fact (a transition, an instruction with no external claim, a reference
  to something the page itself defines)."

The pilot read's cause 2 (`...-pilot-job-read.md`, "Recurring causes") is that line 38 licenses cutting the very
sentences the anatomies in (a) require. The sentences the drafter must write and may not cut under line 38, each
named by the published anatomy that requires it:

- The introduction (concept: summary paragraph and scope; tutorial: overview with audience, assumed knowledge,
  and outcome; how-to: task, when and why, and the wrong-place cue). Sources: Good Docs templates, DigitalOcean
  Introduction, Google "Introduce a document".
- The hand-off lead-ins, the sentence that opens each section and ties it to the task or the previous section
  (register `docs-register.md:611-616`, Google "Provide text under each heading").
- The ending (tutorial summary and next steps; how-to see-also; concept related resources).

How each is recorded in the brief: by the existing mechanism, `no-claim`, with one limit the provenance gate
enforces and the drafter must know. `scripts/checks/check-provenance.mjs:29` fails a `no-claim` sentence that holds
any extractable fact: "a no-claim sentence cites nothing, so any extractable fact in it fails." The extractor reads
code spans, paths, numerals, flags, and names (`:36-57`). An introduction that names `create-cairn-site` or `/admin`
or a version, as the conductor's draft for `add-cairn-to-a-sveltekit-app` does, carries a fact and needs a fact id;
only a sentence with no such token (the reader, the decision, the page to read instead named by its title) is
`no-claim`. This is existing behavior, not a new rule, and it means the introduction's claims must be traced in the
page-inputs step before drafting.

The exemption needs no new tag: the removal rule already says a sentence that removes a fact or a step stays, and
the introduction's, hand-off's, and ending's content (reader, assumed knowledge, outcome, next page) is not covered
by "a fact or a step". The change the sources support is to the drafter definition's line 38, so the rule names the
sentences the anatomy requires as the ones it does not apply to. Wording for that sentence is the brief's, taken
from the register anatomy line, never invented here. Red Hat's Minimalism item "The text does not include
unnecessary information" is the published counterpart of line 38 and is silent on the exception, which is itself
the gap.

## d. Positions

Can a brief cite an `engine-rulings.md` entry as a source today? No.

- A brief sentence's `id` is "`f:` plus six base36 characters" or "no-claim" (`check-provenance.mjs:14-16`). A
  brief JSON has `{ "text", "id" }` and no other field (`docs/internal/briefs/extend/security-model.json`).
- The gate resolves an `f:` id to "a fact bullet in docs/internal/facts/" and rejects a cited bullet tagged
  `[candidate]`, `[rejected]`, or `[docs-drift]`; `[verified]`, `[external]`, `[vendor]` are citable
  (`:16-20`, `facts/README.md:183-184`).
- `engine-rulings.md` entries (format at its top: slug heading, Verdict, Reopens on, Shape, Record, Any-site case,
  Verified) are not fact bullets. No gate resolves a ruling.
- The existing mechanism that comes closest is the owner tier (`facts/README.md:42-52`): a bullet whose source is
  `docs/internal/what-cairn-is-and-is-not.md` carries a key phrase copied verbatim from that file, and
  `check:facts` verifies the phrase. A ruling not recorded in the owner brief is not in that tier. The facts
  README also says a fact "whose only source is an arm page" is retagged `[candidate]` and left uncited
  (`:77-79`), so a design position recorded only in `engine-rulings.md` or the pilot record cannot be cited by a
  `[verified]` bullet either.

So the attacker sentence for `security-model`, "cairn assumes the likeliest attacker holds an editor's account", has
no citable source until the position is entered into the container by an existing route (an owner-brief line with a
key phrase, or a verified code fact). That is the owner's ruling to apply, not a mechanism the sources supply. Where
no route is taken the sentence is `no-claim`, and the gate then fails it only if it carries an extractable token.
Recorded as a gap. See "Dropped".

## e. Outline fields

The page entry's existing fields (`docs/internal/outlines/extend.json`, 25 pages, one `pages[]` entry each): `slug`,
`title`, `path`, `group`, `order`, `batch`, `job`, `pageType`, `exemplars`, `figure`, `figureNote`, `absorbs`,
`factSections`, `factIds`, `covers`, `outOfScope`, `pinned`, `rearms`. The file also carries top-level `crossLinks`
(71 entries of `{ from, to, why }`).

Mapping of the published introduction contents onto what exists:

- "What the document doesn't cover." (Google) and the concept guide's "what is out of scope": `outOfScope`. Every
  pilot entry already lists them as "topic (slug)", for example security-model's "Configuring the access map
  (restrict-admin-access)." The read-instead page for a boundary is the slug in parentheses. No field is needed.
- See-also, next steps, related resources (all three Good Docs templates; Google "links to what to learn next"):
  `crossLinks`, each with a `why`. No field is needed.
- "What prior knowledge you expect readers to have" (Google), the tutorial's "It assumes you have basic knowledge
  of" and "intended for {audience}", and the how-to's "assumes that a user has basic knowledge of the application":
  not held by any field. The `job` text is where it goes today: every `job` is one sentence that starts with the
  action, and the track-level reader is the register's extend-track "Profile" (`docs-register.md:696-697`). The
  per-page reader and assumed knowledge belong in the `job` string, as a clause after the action, because the
  published introductions put them in the introduction's own sentences, not in a separate record. For a tutorial
  the first `covers` entry is already "Prerequisites: ..." and carries the assumed tools.
- "Who the page is for" when two readers differ (security-model's evaluator and its replacer): the same `job`
  clause.
- When and why to do the task (how-to) and why the concept matters (concept): `job` already carries the purpose
  ("Assess what cairn defends and what it leaves to you ..."); the why is the sentence's first clause.

A new field was considered and not adopted: no published template stores the reader outside the document, so the
owner's adopt-only ruling supports editing `job` text and `outOfScope` entries and nothing else.

## f. The final reader read

### What the repo already cites

`docs/superpowers/specs/2026-09-08-docs-standard-design.md:640-646`, "### Reader test":

> For a task guide, someone who is not the author must do the task from the page. For a concept page or the front
> door, the reader reads it once and paraphrases it back. Every mismatch between the paraphrase and the page is a
> place the page was unclear. This is Part V of the guidelines, and DigitalOcean's editors run each tutorial before
> it ships. The test never applies to reference entries. It costs the owner's time or a volunteer's, and how many
> pages get one is owner decision 4.

"The guidelines" are the Federal Plain Language Guidelines, March 2011, Rev. 1, May 2011 (the spec's "Prose rules"
section, `:173`, vendors that PDF; Part V is "V. Test", PDF page 99). `docs/superpowers/specs/2026-09-21-draft-docs-design.md:239`,
the cold-reader row of the testing table: "Admin | Cold reader: an agent with the page and a terminal only, held to
the profile's ceiling, logging every point where it had to infer | each task guide in pass B | an unstated step, an
unclassified error". The extend arm has no such row (its tests are the site round and the page chain).

### External source adopted: Federal Plain Language Guidelines, Part V

Part V (read from the Wayback copy of https://www.plainlanguage.gov/media/FederalPLGuidelines.pdf). Two methods, split
by document length. Paraphrase testing, for "short documents, short web pages":

> Paraphrase testing will tell you what a reader thinks a document means and will help you know if the reader is
> interpreting your message as you intended.
> Ask the participant to read to a specific stopping point, known as a cue. Each time the participant reaches a cue,
> ask the participant to tell you in his or her own words what that section means. Take notes, writing down the
> participant's explanation in the participant's words. Do not correct the participant. When you review your notes
> later, wherever participants misunderstood the message, the document has a problem that you should fix.
> Ask additional, open-ended questions.
>   What would you do if you got this document?
>   What do you think the writer was trying to do with this document?
>   Thinking of other people you know who might get this document:
>     What about the document might work well for them?
>     What about the document might cause them problems?
> Don't ask yes/no questions.

Usability testing, "best for longer documents" and "the best technique for documents where people have to find the
information before understanding it. ... With usability testing, you test the document as a whole, not just
individual paragraphs." Its session shape:

> Introduction. You make the participant comfortable, explain what will happen, and ask a few questions about the
> person to understand their relevant experience.
> Scenarios. You give the participant very short stories suggesting they have a need for specific information and
> then you watch and listen as they find that information and tell you what they understand from what they found.
> ... Typically, you ask people to "think aloud" as they work so you hear their words for what they are looking for
> and you hear how they understand what they found.
> Debriefing. At the end, you can ask neutral questions about the experience and follow up about any specific words
> or phrases.

Plus the iteration rule: "Test, make corrections based on feedback, and test again. Plan to test at least twice."

Supporting sources, same stance:

- DigitalOcean's Technical Writing Guidelines, on the tutorial: "Authors test their tutorials to ensure they work by
  following them exactly as written on fresh servers to ensure accuracy and identify missing steps. Our editors also
  test these articles as part of the review process to ensure a great learning experience for the reader." And the
  Write for DOnations page: "They'll then verify that your tutorial is technically correct by following it as
  written." and "We ask that you thoroughly test it by reading through it and following it as a reader would."
- Google, "Organize a document": "After you've completed the first draft, check your entire document against the
  expectations you set in your overview ... You might find it useful to think of this review as a form of
  documentation quality assurance (QA)." This is the check that the introduction describes the page that follows.

Blog posts on "cold read" and "fresh eyes" review surfaced in a search; none is a published standard, and none was
adopted.

### What the final read adopts, and how it differs from (b)

Adopted: Federal Plain Language Guidelines Part V. The page's paraphrase test (read to a cue, say in your own words
what the section means, do not correct) runs on a concept page and the open-ended questions run on every page: "What
do you think the writer was trying to do with this document?" tests the introduction directly, since a reader whose
answer differs from the outline's `job` has found an introduction that does not state it. The usability test's
scenario shape (a short story giving a need, then watching the reader find and use the page) runs on the tutorial
and the task pages. The reader is the agent playing the Part V participant, as the 09-21 draft-docs design already
chose for the admin arm; Part V itself names human participants and says nothing about an agent, so that substitution
is the repo's existing choice and not a Part V rule.

How it differs from (b):

| | (b) Structural edit seat | (f) Final reader read |
|---|---|---|
| Position | Before line editing, over the finished structure | Last, after the register editor and the fact read have passed |
| Stance | Editor: judges the page against a checklist and an outline and proposes changes | Reader: has the page and nothing else, performs the page's job or paraphrases it, and reports where the page failed it |
| Source | Red Hat Structure Checklist and Google "Organize a document" (b) | Federal Plain Language Guidelines Part V; DigitalOcean's test-as-a-reader practice |
| Output | `file:line` findings against checklist items | Paraphrase mismatches, points where it inferred, and the answer to "What do you think the writer was trying to do with this document?" |
| Reads the outline | Yes, compares page to `job`, `covers`, `outOfScope` | No, it must not see the outline; the outline is what it is tested against afterward |

Position note: Part V says "Test as early as you can in the project", and the spec's placement of the reader test as
the last gate before shipping is the repo's own sequencing, not Part V's. The last position is deliberate: the final
read confirms the whole chain's output reaches its reader, so it runs after every other seat.

## Dropped

- A single published structural-edit checklist that checks the introduction. None found among EFA, Chicago, Einsohn,
  Rude (not freely published, or definitions only), Google, Microsoft, Write the Docs, GitLab, or Red Hat. Dropped;
  two published blocks run verbatim instead, and the gap is stated under (b).
- A Good Docs required closing synthesis for a concept page. The concept template has none, so the pilot's
  "no closing synthesis" finding on `architecture` has no published source beyond DigitalOcean's Conclusion.
  Dropped for concept pages; the concept ending is Related resources.
- A published agent-as-reader review method. Part V and DigitalOcean describe human readers. The agent substitution is
  the 09-21 draft-docs design's, recorded under (f), not sourced.
- A citable source for a stated design position (the security-model attacker sentence). See (d); no mechanism
  supplies it, and none is invented here.
- Wording for an exemption to the removal rule. No published source states a carve-out; the brief's anatomy line is
  the only source and the exemption is the owner's to rule on, so no wording is drafted here.
- Chicago Manual of Style levels of edit, Einsohn's Copyeditor's Handbook, and Rude's Technical Editing text. Not
  freely published; not read.
