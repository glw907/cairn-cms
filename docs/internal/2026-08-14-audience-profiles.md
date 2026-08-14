# The four audience profiles (2026-08-14)

The grading rubric for the four-track documentation. Every published page belongs to
exactly one track, every track serves exactly one profile, and a page review grades the
page against its profile: the vocabulary contract, the arrival state, and the success
criterion below, on top of the register standard
([`docs-register.md`](./docs-register.md)) and the Vale floor. Pass D Task 5 folds these
profiles into the rewritten register standard as the foundation of each track register;
until then this document is their home.

Two rulings shape the set (Geoff, 2026-08-14). Sharp profiles matter for all four
audiences, not only the non-technical two: **the extender and the engine contributor are
different flavors of developer at different experience levels**, and a page graded
against the wrong flavor fails its real reader while looking fine. And the corpus is
graded tight: a profile is also the instrument for killing pages, since a page no
profile claims has no reader.

## How to grade with a profile

For any page, ask in order: (1) which single profile does this page's track claim, and
does every sentence address that reader; (2) does the page respect the vocabulary
contract, with each defined-on-use term actually defined at first use; (3) does the
reader arrive in the state the page assumes, per the track's index order; (4) does the
page end with its profile's success criterion met; (5) would the profile's
counterpart-question (listed per profile) fail it. A page serving two profiles is two
pages or one wrong one.

---

## The editor

**One line:** a non-technical author who writes on a cairn site through `/admin`.

**Who they are.** Competent with a browser, email, and a word processor; no reason to
have met a terminal, git, or markdown before cairn. They did not choose cairn and may
not know its name matters; someone handed them a sign-in link. Their skill band is wide
(a college student, a retiree, an executive director) but the floor is the contract:
assume no technical vocabulary survives from their day job.

**How they arrive.** Through the admin's Help link (cairn.pub/help), usually mid-task
and sometimes mid-frustration: something refused, something looks wrong, or they were
just asked to do a thing they have never done. They read on whatever device the admin is
open on. They never arrive through GitHub, npm, or the repo.

**Jobs, ranked.** Write and edit an entry; add an image with caption and alt text;
publish, and understand what save-versus-publish means; fix a mistake, including
restoring an earlier version; manage shared things when asked (media library, tags);
understand a refusal and what to do about it.

**Vocabulary contract.** Free: your site, the editor, draft, save, publish, entry, page,
post, image, tag, sign-in link. Defined on use: markdown (as "the plain-text formatting
the editor previews for you"), fields (the boxes above the text), the media library.
Banned: repo, commit, branch, merge, deploy, build, frontmatter, markdown syntax names
(say "a heading," not "an H2"), any Cloudflare or GitHub noun. The engine's own promise
is that editors never see the plumbing; the docs keep the same promise.

**Anxieties.** "Did I just break the site?" "Where did my work go?" "Who can see this
before I publish?" "Do I need to ask the developer, or can I do this myself?" A good
page answers the fear before the mechanics.

**Success criterion.** The task is done without opening another tab and without asking a
developer, and the reader can say afterward what state their entry is in.

**Counterpart question (grading):** could a person who has never used a terminal
complete this page's task with only the admin open, and does any sentence assume
otherwise?

---

## The admin

**One line:** a technical non-developer who sets up and runs the default site.

**Who they are.** Comfortable copy-pasting a command into a terminal, clicking through
dashboards, making accounts, and following written steps exactly; has never configured a
development environment and never authors code. Often the organization's most technical
volunteer or its owner. Can own a domain, a credit card decision, and a DNS change when
each step is written down; cannot derive an unstated step, read a stack trace, or judge
which of two errors matters.

**How they arrive.** Through the root README or word of mouth, deciding to create a
site; or they inherit a running site someone else created. The tool
(`create-cairn-site`) is their setup spine; the docs narrate and recover it, never
replace it with hand-authoring.

**Jobs, ranked.** Create the site (either door) and get signed in; understand what they
now own and what it costs; move to their own domain and email, with push-to-deploy;
verify the site is actually ready; invite and manage editors; run the site (updates, key
rotation, logs, troubleshooting); recover a failed or interrupted setup step; know when
a task genuinely needs a developer.

**Vocabulary contract.** Free: command, terminal, account, dashboard, domain, email,
sign in, your repository (glossed once as "where your content lives on GitHub"). Defined
on use: DNS and nameservers, zone, deploy, Workers (as "where your site runs"), D1/R2
only if a step shows them. Banned: adapter, seam, schema, frontmatter, island, runes,
TypeScript, any engine-internal name. Every command shown is copyable as printed and
traces to a recorded run.

**Anxieties.** Money surprises (the paid plan, a domain purchase); "is this mine, or am
I locked in?"; "the setup stopped halfway, what now?"; "what happens if our developer
leaves?"; "did I just take the organization's email down?" The baseline walk showed
these arriving late is the corpus's worst defect; the profile makes early answers a
grading criterion.

**Success criterion.** The default site is live and healthy with zero code authored, and
every failure the reader can hit ends in a named next step classified wait, act, or ask
a developer.

**Counterpart question (grading):** is any step's success dependent on knowledge the
page did not state, and is any cost or prerequisite revealed after the step that incurs
it?

---

## The extender

**One line:** a Svelte-fluent web developer building an organization's site on cairn's
seams.

**Who they are.** A working product developer: SvelteKit, TypeScript, npm, git, and
enough Cloudflare to deploy. They build member signups, rosters, event screens; they
measure cairn by how fast a custom screen ships and whether engine updates break their
work. The flavor matters: an application developer, not a library engineer. They will
read a contract, a snippet, and a worked example; they will not read engine source, and
a doc that requires it has failed them. Experience band: mid-level and up; assume
fluency with their stack, not with cairn's internals.

**How they arrive.** Through npm, GitHub, or the root README, often evaluating cairn
against alternatives; or they take over a scaffolded site and want to know what the tool
wrote and why. They skim first and judge quickly; the Tina evidence (docs confusing
enough to abandon the product) is about this reader.

**Jobs, ranked.** Evaluate the seams and the stability story; stand up a site (the tool,
then the deep path when they want to own every file); declare concepts and schema; build
their first custom screen, island, or second audience; own the design and delivery
surface; upgrade across engine versions by reading `Consumers must:`; debug against the
logs and the reference.

**Vocabulary contract.** Free: the full developer vocabulary, plus cairn's product terms
(concept, adapter, render, seam, island, holding branch, manifest, role) defined once in
the track and used precisely after. Nothing is banned; imprecision is. This reader
resents padding, restated framework docs, and hand-holding on their own stack; a
vendor's specifics get a link, cairn's reasoning gets prose.

**Anxieties.** "Will the next minor break my screens?" (the stability tiers answer);
"am I building on a seam or a coincidence?"; "how much of this admin do I have to adopt
to add one screen?"; "what did the scaffolder write into my repo?"

**Success criterion.** They extend the site without reading engine source, every
documented snippet typechecks against the built package, and an upgrade is a read of the
changelog, not an archaeology session.

**Counterpart question (grading):** does the page state the contract and its stability
tier rather than narrating implementation, and would a competent SvelteKit developer
find any sentence here that their own stack's docs already own?

---

## The engine contributor

**One line:** an experienced library-flavored engineer working on cairn itself.

**Who they are.** A different flavor and a deeper band than the extender: someone at
home in a TypeScript library's internals, export maps and packaging, CI design, test
infrastructure (workerd, Playwright, component tests), and type-system-level work. They
read source as ground truth and docs as the map of intent: what is deliberate, what is
invariant, what is historical accident. Today this is mostly the maintainer and his
agents; the profile is written for the first stranger with a patch.

**How they arrive.** Through `CONTRIBUTING.md`, holding a patch impulse or an issue,
usually already having read some source. Their zone is unshipped (`docs/internal/` and
the specs); nothing they need ships in the tarball.

**Jobs, ranked.** Decide whether an idea is in scope before writing code (the charter
boundary); orient in the repo and its gates; land a change that clears the gates with
tests and docs; understand why an odd-looking thing is deliberate (the durable gotchas,
the design system, the register standards); distinguish living standards from the
historical record.

**Vocabulary contract.** Unrestricted, including internal names (the chassis, the bake,
gate names, the charter), provided the contributor zone's index defines or links each on
first use. The register here is engineer-to-engineer: invariants stated flatly, history
linked not restated.

**Anxieties.** "Is this idea in scope, or am I about to write a rejected PR?"; "which of
these sixty internal files is load-bearing?"; "is there an invariant I cannot see that a
gate will not catch?" The zone's known defect (fourteen live documents buried in dated
sediment) is exactly this profile's cost.

**Success criterion.** A first PR clears the gates without a maintainer explaining an
unwritten rule, and the contributor can answer "is my idea cairn's job?" from the
boundary docs alone.

**Counterpart question (grading):** does the zone separate the living standard from the
record, and is every invariant the contributor could violate either a gate or a written
rule the index surfaces?
