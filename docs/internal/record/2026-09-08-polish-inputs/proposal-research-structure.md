# Proposal research, lens 6: a structure system and a gold-standard corpus

Research and recommendation for `docs-standard-proposal.md` revision 2 (Opus, fresh context, 2026-09-08), with primary sources fetched. Folded into revision 2.

---

## 1. Comparison of the published systems

| System | What it governs | Its unit | Strengths | Fit to cairn |
|---|---|---|---|---|
| **Diátaxis** (Procida) | The docs set. Which forms exist and what each one may contain. | The document, classified by user need | One test, two questions, four cells. Cheap to apply. Tells you when a page is doing two jobs. | Partial. It classifies content by need, not by audience, so it cannot produce cairn's four tracks. It says nothing about section order inside a page. cairn already forbids citing it in a published page, which is correct, because it is a planning instrument. Keep it as the private classifier only. |
| **DITA topic types** (OASIS) | The page. A fixed, validated element order per topic type. | The topic (concept, task, reference) | The strict task model fixes the order: prereq, context, steps, result, example, postreq. Order is machine-checkable. | Strong, as a shape. Weak as a toolchain. Take the ordered section list, leave the XML, the DTDs, and the specialization machinery. |
| **Minimalism** (Carroll) | What goes in and what stays out. | The task | Four principles. The third one, support error recognition and recovery, is why every task page needs a failure section rather than an appendix. Cuts padding on a reader who is already working. | Strong for the editors and admin tracks. It is the reason a task page ends with "check it worked" and "if it fails". cairn's page anatomies already imply it without naming it. |
| **Information Mapping** (Horn) | The section. How a block of information is chunked and labeled. | The information block, grouped into a map | Chunking at seven plus or minus two. Relevance, one purpose per block. Labeling, every block gets a name. Consistency across blocks of the same type. | Take the principles, which are free and testable. Reject the proprietary block-and-label table format and the certification. The chunking number is the one usable numeric bound in the whole field. |
| **Every Page Is Page One** (Baker) | The page's relationship to the rest of the set. | The topic | Seven principles. Self-contained, specific and limited purpose, conforms to a type, establishes its context, assumes a qualified reader, stays on one level, links richly. Baker explicitly rejects generic types: a topic type should be "more specific and related to the specific subject matter". | Strongest fit. cairn's readers arrive from search, from the admin Help link, and from npm, never in sequence. Baker's "conform to a type" validates cairn's existing named anatomies (condition entry, symptom row) over DITA's three generic ones. |
| **Good Docs Project templates** | The page, as a fill-in file. | The template | 27 templates in three packs, each with a writing guide beside it. The how-to template fixes Overview, Before you begin, Steps, See also, and states "Address one logical goal (task) per how-to page". | Useful as a source for section lists. Do not adopt the set. cairn needs six anatomies, not 27, and cairn's own anatomies are more specific. |
| **Write the Docs principles** | The whole body. | The publication | Named principles: ARID, Skimmable, Exemplary, Consistent, Current, Discoverable, Addressable, Cumulative, Complete, Beautiful. "Consider incorrect documentation to be worse than missing documentation." | Useful vocabulary, no rules with numbers, nothing gateable. Also licensed CC BY-NC-SA, so do not vendor excerpts. Cite, do not adopt. |
| **Google style guide + tech-writing course** | Headings, paragraphs, document structure. | The heading and the paragraph | Heading grammar is stated as a rule: bare infinitive for a task heading, noun phrase for a conceptual heading, no leading -ing form, sentence case, one h1, no skipped levels. Paragraphs of three to five sentences, never past about seven. | Already the Vale floor. Its heading and paragraph rules are the section layer, and they are lintable. Extend rather than replace. |

The gap none of these fills on its own: Diátaxis governs the set and stops at the page boundary. DITA governs the page and assumes a toolchain cairn does not have. Information Mapping governs the section and is proprietary above the principle level. A working system takes one from each level.

---

## 2. Recommended system, in three layers

*(Pasteable into the proposal from here.)*

### The structure standard

Documentation structure is set at three levels. The docs set decides which pages exist. The page decides which sections it carries and in what order. The section decides how one block of text is built. Each level has its own rules and its own gate.

#### Layer 1: the docs set

**Every published page has exactly one track and exactly one page type.** The track says which reader. The page type says which shape. The four tracks stay as they are, with the same names and the same directories.

**A page type is a named shape, not a generic category.** cairn uses six: task guide, tutorial milestone, concept page, reference entry, condition entry, symptom row. Two more cover the pages that route rather than teach: index page and front-door page.

**One page does one job.** Before a page is written, answer two questions. Does it inform action or inform cognition? Does the reader need to acquire a skill or apply one they already have? A page whose answers change halfway down is two pages. Split it.

**A page is written to be read alone.** Readers arrive from search, from the admin Help link, and from npm. No page may depend on the reader having read the page before it. A page that needs an earlier state says which page produces that state and links it.

**A page stays on one level.** A task page does not stop to explain the architecture. It links the concept page instead.

**An index page lists at most nine siblings.** Past nine, group them under named subheadings or split the track. The bound comes from Horn's chunking principle.

**A page belongs to exactly one directory, and its directory's index links it.** This is already gated by `check:arm-indexes`.

#### Layer 2: the page

**Each page type has a fixed section order.** The sections appear as level-two headings, in this order, with no other level-two heading before the last required one. A page may add sections after the required set.

**Task guide** (most admin and extend pages):

1. Title
2. Opening contract, one or two sentences, stating what the reader will have when the page is done
3. `Before you begin`, the preconditions, each linked to whatever produces it
4. `Steps`, numbered, one action per step, at most nine steps
5. `Check it worked`, the observable signal
6. `If it fails`, the failure paths, each pointing at the track's recovery page

Sections 3 through 6 come from the DITA strict task order and Carroll's third principle. A task guide with no failure section fails the gate.

**Tutorial milestone** (the extend track's deep path):

1. Title
2. `What you will build`, the objective
3. `Where you are`, the state the previous milestone produced
4. `Steps`
5. `Before you go on`, the checklist
6. `What's next`

**Concept page** (extend track, and `why-cairn.md` uses an extended form of it):

1. Title
2. Definition, one paragraph, first sentence defines the thing
3. `Why it exists`
4. `How it works`
5. `What it is not`
6. `Limits`
7. `Where to go next`

**Reference entry** (`docs/reference/`):

1. Export name
2. Signature block
3. Summary, one to three sentences of narrative lede
4. `Parameters`
5. `Returns`
6. `Defaults`
7. `Failure modes`
8. `Stability tier`
9. `Example`
10. `See also`

This order matches PostgreSQL (Synopsis, Description, Parameters, Notes, Examples, Compatibility, See Also), MDN (Syntax, Parameters, Return value, Examples, Specifications, Browser compatibility, See also), and Rust std (declaration, summary, Panics or Errors, Examples). All three put the signature first, the prose second, the failure conditions before the example, and the cross-links last. cairn's existing gated template already carries most of this. The order becomes mandatory.

**Condition entry** and **symptom row** keep their current field lists. Their fields become an order, not a set.

**Index page**:

1. Title
2. Who this track is for, and who it is not for, with the route out for the wrong reader
3. The pages, in reading order
4. Where to start

**A page states its type by following it, never by naming it.** No published page names a page type, a track, or a taxonomy. This extends the standing ruling that no published page cites Diátaxis.

**Page length bounds.** A task guide runs to 800 words or fewer. A concept page runs to 1,500 words or fewer. A page past its bound is split or it carries an on-page contents list. Reference entries and the front door carry no word bound, because a reference entry is sized by its export and the front door carries the whole argument.

#### Layer 3: the section

**Each section covers one idea and says so in its first sentence.** The opening sentence of a section, and of each paragraph in it, states that unit's point.

**Paragraphs run three to five sentences.** Seven is the ceiling. A one-sentence paragraph is folded into its neighbour or turned into a list item. This is Google's rule, kept.

**Every list runs to nine items or fewer.** Past nine, group the items under named subheadings. This is Horn's chunking bound, and it is the same number that bounds steps and index siblings.

**Heading grammar is set by what the section does, not by the track.**

- A section that tells the reader to do something starts with a bare infinitive. "Create the repository", not "Creating the repository".
- A section that explains something uses a noun phrase, and it does not start with an -ing form.
- A section in the editors track may use a question when the question is the reader's own. "What if I publish the wrong thing?" is in register there. No other track uses question headings.
- Every heading is sentence case.
- No heading carries two heads. `Cairn.TwoHeadedHeading` already gates this.
- One level-one heading per page. No skipped levels.

**Sibling headings are parallel.** Sibling level-two headings within one page use the same grammatical form. A page that mixes an infinitive heading with a noun-phrase heading at the same level is doing two jobs.

**Each section that carries an instruction ends where the reader can act.** After reading a section the reader can either do the thing or knows which page tells them how. A section that ends without either is unfinished.

---

## 3. The front door

The front door failed on structure as well as prose. `docs/why-cairn.md` currently runs: Why cairn, What cairn actually does, Why this stack, The honest trade-offs, Where this leaves you. It has an argument and no decision procedure, and it never names what cairn is not in its own section.

Three human-written pages in the same job share a shape. SQLite runs Appropriate uses, Situations where SQLite works well, Situations where a client/server RDBMS may work better, Checklist for choosing the right database engine. Kubernetes runs definition, Why you need Kubernetes, What Kubernetes is not, Historical context, What's next. Astro runs definition, Features, Design principles, then names what Astro is not built for. All three put the negative case in its own named section, and SQLite ends with a checklist the reader runs themselves.

**Recommended section list for `docs/why-cairn.md`:**

1. **Definition**, unheaded, the first two sentences. What cairn is, in one sentence, with no claim about it being good. Every one of the three exemplars opens this way. The current page opens with the author's history instead, which is the ratified opener and should stay, but the definition sentence comes first.
2. **Where cairn came from.** The author's own evidence, first person, dated. This is the ratified opener text, now under its own heading. It belongs early because it is the page's only claim the reader cannot check elsewhere.
3. **What cairn does.** The mechanism, concrete, no benefit framing. Present because a reader deciding cannot decide against a description of outcomes.
4. **Where cairn fits.** The situations cairn is built for, stated as situations rather than features. This is SQLite's "Situations where SQLite works well". It replaces a features list, which is a pitch shape.
5. **What cairn is not.** Its own named section. This is the structural piece the current page lacks. Kubernetes, SQLite, and Astro all carry it. It does the work the trade-offs section is currently overloaded with, and it lets the trade-offs section be about costs rather than about scope.
6. **Why this stack.** The three commitments and the fact that none is reversible. Present and correct today.
7. **The honest trade-offs.** The costs of choosing cairn, each one stated with what it would take to escape it. Present today. It shrinks once section 5 takes the scope half.
8. **Should you use cairn?** A short checklist the reader answers themselves, three to five yes-or-no questions, ending in a plain recommendation. This is SQLite's closing device and it is the strongest structural instrument on that page. It converts an argument into a decision the reader makes.
9. **Where to go next.** The routes. Present today as "Where this leaves you".

Heading grammar for this page is noun phrase throughout, with the one question heading at section 8, which is the reader's own question.

The root `README.md` and `docs/README.md` keep the index-page shape from Layer 2, with the five routes and the copyable command above them. Neither carries the argument. Only `why-cairn.md` does.

---

## 4. The gates

**A template per page type.** `docs/internal/templates/` holds one markdown file per page type: `task-guide.md`, `tutorial-milestone.md`, `concept.md`, `reference-entry.md`, `condition-entry.md`, `symptom-row.md`, `index.md`, `front-door.md`. Each template contains the required headings in order and one line of guidance under each. A writer copies the template.

**A page-type registry.** `docs/internal/page-types.json` maps every published page path to its page type. No frontmatter is added to the pages, because these pages render on GitHub and in the tarball, and a marker the reader can see is a marker that leaks the taxonomy.

**`check:anatomy`** (new). It does four things:

1. Every published `.md` file under `docs/` appears in the registry exactly once, and every registry entry names a file that exists. This is a set difference, the same shape as `check:arm-indexes`.
2. For each page, the required level-two headings for its type appear, in the template's order, with no other level-two heading before the last required one. The gate reads the required list from the template file itself, so a template edit and a gate edit cannot drift apart.
3. The chunking bounds hold: at most nine steps in a task guide, at most nine items in any list, at most nine sibling headings under any one heading, at most seven sentences in any paragraph.
4. The word bound for the page's type holds.

**`check:headings`** (new). It lints heading grammar: sentence case, one h1, no skipped levels, no leading -ing form, task sections start with a bare infinitive drawn from a verb list, concept sections do not, sibling headings at the same level share a form, and question headings appear only in `docs/editors/`. It runs alongside the existing `Cairn.TwoHeadedHeading` Vale rule rather than replacing it, because Vale sees one line at a time and parallelism needs the whole page.

**Reviewer duty.** A page review states the page's type and track, then grades the page against its template and against a named corpus entry. A verdict with no page type and no corpus entry beside it is incomplete and is returned.

**`cairn-pass` documentation step.** A pass that adds a published page adds its registry entry in the same pass. A pass that changes a page type changes the template compliance in the same pass.

---

## 5. The gold-standard corpus

*(Pasteable into the proposal.)*

### What the corpus is

The docs are compared against real pages written by people, not only against rules. The corpus is a small set of published pages, saved as text excerpts in the repository, one or two per page type and per track. A review names the page it compared against. A verdict with no named comparison does not count.

### Where it lives

`docs/internal/corpus/` holds one text file per entry and one `manifest.json`. The directory sits in the contributor zone, so nothing in it ships in the npm tarball and nothing in it is published.

Each manifest entry carries: an id, the source URL, the author or organization, the license, the date the excerpt was fetched, the page type it calibrates, the track it calibrates, one sentence saying why it is the exemplar, the measured cadence numbers for the excerpt, and the date the owner approved it.

Excerpts are short. One page section, or at most 400 words, is enough to calibrate a shape and a cadence. Share-alike entries are marked as such in the manifest, and they stay internal and unpublished, which is what keeps a short excerpt inside quotation terms.

### The proposed entries

**Front-door page**

- *Appropriate Uses For SQLite*, sqlite.org, public domain. It builds the positive case, then the negative case, then a checklist the reader runs. It is the closing-checklist exemplar and the honest-limits exemplar in one page.
- *Overview: what is Kubernetes*, Kubernetes authors and CNCF, CC BY 4.0. It carries "What Kubernetes is not" as a named section, which is the section cairn's front door lacks.

**Concept page (extend)**

- *Why Astro*, withastro docs, MIT. Its design-principles section is a thesis sentence followed by reasoning followed by a named non-fit, repeated five times. That is the concept-page shape at its cleanest.
- *Concurrency Control*, PostgreSQL documentation, PostgreSQL License. Definition first, mechanism second, limits third, in flat technical prose with no reader address. It is the register exemplar for a concept page a developer reads to decide something.

**Reference entry**

- *CREATE INDEX*, PostgreSQL documentation, PostgreSQL License. Synopsis, Description, Parameters, Notes, Examples, Compatibility, See Also. The fixed order cairn's reference entries copy.
- *Element: scrollIntoView()*, MDN Web Docs, CC BY-SA 2.5. Syntax, Parameters, Return value, Examples, Specifications, Browser compatibility, See also. The web-facing version of the same order, and the alt-text exemplar the register already cites.

**Task guide (extend and admin)**

- *Get started guide*, Cloudflare Workers developer documentation, CC BY 4.0. Prerequisites first, one action per step, an observable check after each. It is also the vendor cairn's admin track sends readers to, so matching its shape lowers the cost of the handoff.
- A how-to page from GitHub Docs, CC BY 4.0. Written for a reader who is technical but not a developer, which is exactly the admin track's profile.

**Tutorial milestone**

- A unit page from *Build your first Astro blog*, withastro docs, MIT. Objectives, prior state, steps, a checklist before advancing, and the "show me the steps" disclosure device the register already borrows.

**Symptom row and troubleshooting**

- A troubleshooting page from Cloudflare developer documentation, CC BY 4.0. Symptom, cause, fix, in a repeating row shape.
- A troubleshooting page from GitLab documentation, CC BY-SA 4.0, marked share-alike and internal.

**Editors track**

- A GOV.UK guidance page, UK Government, Open Government Licence v3. Plain instructions for a member of the public with no technical vocabulary and no route to ask an expert. It is the strongest published exemplar for the editors register.
- A Mozilla Support knowledge-base article, Mozilla, CC BY-SA 3.0, marked share-alike and internal. It is help written for a person mid-task inside a product, which is the editors track's arrival state.

**Admin track**

- A Cloudflare operational or configuration page, CC BY 4.0. Costs and prerequisites stated before the step that incurs them.

**Index page**

- A Kubernetes documentation section index, CC BY 4.0. It routes a reader out to the right track before listing anything.

Licenses named above should be confirmed at the moment of vendoring, and the confirmed license text goes in the manifest entry.

### How a review cites the corpus

A review report carries a short table beside its verdict:

| Measure | This page | Corpus entry `<id>` | Band |

The measures are the cadence numbers already in the prose proposal, plus the structural ones: section order matched or not, longest list, longest paragraph, word count against the type's bound. The reviewer names the corpus id in the verdict sentence. A review that cites no id is returned as incomplete, the same as a review that cites no rule.

### How the corpus is kept honest

The owner approves each entry, and the approval date goes in the manifest. An entry the owner rejects is deleted, and its id is retired and never reused. A review citing a retired id fails the gate.

Entries are re-fetched and re-measured once a year, and the fetch date in the manifest is updated. A source page that changed enough to move its measures outside the band it set is re-approved or removed.

The corpus stays small. Two entries per page type is the ceiling. A corpus that grows past that stops being a standard and becomes a reading list.

---

## 6. Rejected, and why

**Diátaxis as the docs architecture.** Rejected as a directory structure, kept as a private classification test. Diátaxis classifies by user need and is explicit that it is not an audience split. cairn's four tracks are an audience split, and they are correct for cairn, because cairn's editors and its extending developers are different people with different vocabularies. Reorganizing the docs into tutorial, how-to, reference, explanation directories would break the vocabulary contracts, which are the thing that actually protects each reader. Diátaxis's own guidance supports this: "The structure it proposes is not intended to be a plan... It's a guide", and "don't create empty structures". It also says nothing about section order inside a page, which is where the front door failed.

**DITA as a toolchain.** Rejected. XML authoring, DTDs, specialization, and a build pipeline are a large cost for a repository of markdown files that render on GitHub. Only the strict task element order is taken.

**Information Mapping as a methodology.** Rejected above the principle level. The block-and-label table format makes every page look like a form, which is wrong for the front door and wrong for the extend track's concept pages. The methodology is also commercial and gated behind training and software. The seven principles are freely stated and are taken; the format is not.

**ASD-STE100 as a whole.** Its controlled vocabulary is already rejected in the prose proposal. Its two sentence ceilings stay there. It contributes nothing at the structure layer.

**Good Docs Project as an adopted template set.** Rejected as a set. 27 templates against cairn's eight page types would leave most of them unused, and cairn's own anatomies (condition entry, symptom row) are more specific than any generic template. The how-to template's section list is taken as a source, and the "one logical goal per how-to page" rule is taken directly.

**Write the Docs principles as the standard.** Rejected as a standard, kept as vocabulary. Its principles are named well and none of them has a number, so none is gateable. Its guide is licensed CC BY-NC-SA, so nothing from it is vendored into the corpus.

**Every Page Is Page One as a whole system.** Accepted at the page layer and rejected as the top layer. Baker's model assumes the reader arrives at any page from search and treats the docs set as a linked web with no reading order. cairn's admin track has a real reading order, stated on its index page, and its setup path depends on it. The self-containment, context, one-level, and link-richly principles are taken; the flat web is not.

---

## 7. Sources

- Diátaxis, home: https://diataxis.fr/
- Diátaxis, the compass: https://diataxis.fr/compass/
- Diátaxis, foundations: https://diataxis.fr/foundations/
- Diátaxis, how to use it: https://diataxis.fr/how-to-use-diataxis/
- DITA 1.3, task elements (OASIS): https://docs.oasis-open.org/dita/dita/v1.3/csd01/part2-tech-content/langRef/containers/task-elements.html
- DITA 1.3, strict task topic (OASIS): https://www.oxygenxml.com/dita/1.3/specs/archSpec/technicalContent/dita-task-topic.html
- Minimalism (Carroll), overview: https://en.wikipedia.org/wiki/Minimalism_(technical_communication) and https://www.instructionaldesign.org/theories/minimalism/
- Baker, "What is Minimalism?": https://everypageispageone.com/2013/07/02/what-is-minimalism/
- Every Page Is Page One, the seven principles: https://everypageispageone.com/the-book/
- Information Mapping methodology: https://informationmapping.com/pages/information-mapping-methodology
- Horn's chunking bound: https://informationmapping.com/blogs/news/writing-for-the-web-the-magical-number-seven-plus-or-minus-two
- Good Docs Project templates: https://www.thegooddocsproject.dev/template
- Good Docs Project how-to template: https://www.thegooddocsproject.dev/template/how-to
- Write the Docs, documentation principles: https://www.writethedocs.org/guide/writing/docs-principles/
- Google style guide, headings and titles: https://developers.google.com/style/headings
- Google technical writing, paragraphs: https://developers.google.com/tech-writing/one/paragraphs
- Google technical writing, organizing large documents: https://developers.google.com/tech-writing/two/large-docs
- SQLite, Appropriate Uses For SQLite: https://www.sqlite.org/whentouse.html
- Kubernetes, Overview: https://kubernetes.io/docs/concepts/overview/
- Astro, Why Astro: https://docs.astro.build/en/concepts/why-astro/
- PostgreSQL, CREATE INDEX: https://www.postgresql.org/docs/current/sql-createindex.html
- MDN, Element.scrollIntoView(): https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- Rust std, Vec: https://doc.rust-lang.org/std/vec/struct.Vec.html
- Cloudflare docs license (CC BY 4.0): https://github.com/cloudflare/cloudflare-docs/blob/production/LICENSE
- GitLab docs license (CC BY-SA 4.0): https://docs.gitlab.com/
- GitHub content licensing policy (CC BY 4.0 for docs): https://github.com/github/github-ospo/blob/main/policies/licensing.md
- Mozilla website content licensing (CC BY-SA): https://www.mozilla.org/en-US/foundation/licensing/website-content/
- Open Government Licence v3: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

---

Repo files read: `/var/home/glw907/Projects/cairn-cms/docs/internal/docs-register.md`, `/var/home/glw907/Projects/cairn-cms/docs/README.md`, `/var/home/glw907/Projects/cairn-cms/docs/editors/README.md`, `/var/home/glw907/Projects/cairn-cms/docs/admin/README.md`, `/var/home/glw907/Projects/cairn-cms/docs/reference/README.md`, `/var/home/glw907/Projects/cairn-cms/docs/extend/README.md`, `/var/home/glw907/Projects/cairn-cms/docs/why-cairn.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/front-door-net-failure.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, `/var/home/glw907/Projects/cairn-cms/.vale.ini`, `/var/home/glw907/Projects/cairn-cms/scripts/checks/check-arm-indexes.mjs`, `/var/home/glw907/Projects/cairn-cms/scripts/checks/check-admin-prose.mjs`. Nothing was edited.
