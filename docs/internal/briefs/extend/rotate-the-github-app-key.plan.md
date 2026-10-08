# Page plan: Rotate the GitHub App key

Page: `docs/extend/rotate-the-github-app-key.md`. Page type: task guide. Status: new page, no prior
version on disk. Written 2026-10-07 by the plan step of the docs page chain (stage 2a), and revised
the same day on the structural edit's one blocking finding: Verify's confirming publish now follows
an edit its own steps make, and "Before you begin" names the admin sign-in both depend on. The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and each fact's
placement. The structural edit seat reads it before any prose exists. The plan is Google's outline
written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`rotate-the-github-app-key`: job, covers, out-of-scope list, exemplars); "The page anatomies" and
the developer drafting brief, including "The introduction", in `docs/internal/docs-register.md`;
every fact bullet named below in `docs/internal/facts/`; the two exemplars
(`operators/cloudflare-create-token`, `operators/ghost-install-ubuntu`); the harvest record of the
deleted page, `docs/internal/record/harvest/extend/rotate-the-github-app-key.json`, for context
only; the reference entries each link names (`docs/reference/sveltekit.md` `loadHealth`,
`docs/reference/admin-routes.md` "Why `/healthz` lives at the site root",
`docs/reference/log-events.md`); the sibling pages `docs/extend/add-cairn-to-a-sveltekit-app.md`
("Register the GitHub App", "Store the App's credentials", "Add the Email Sending binding and name
the origin") and `docs/extend/security-model.md` ("The GitHub App's reach"); and the code the
facts cite (`src/lib/github/signing.ts`, `src/lib/sveltekit/health.ts`,
`src/lib/github/credentials.ts`, `src/lib/github/backend.ts`,
`src/lib/sveltekit/content-routes-shell.ts`, `templates/waymark/src/routes/healthz/+server.ts`,
`templates/waymark/wrangler.jsonc`, `templates/waymark/.dev.vars.example`,
`packages/create-cairn-site/src/cloudflare/secret.mjs`,
`packages/create-cairn-site/src/github/manifest.mjs`, `src/lib/diagnostics/conditions.ts`). The
revision also read `src/lib/admin/EditPage.svelte:190-198` (the Publish guard) and the tutorial's
"Verify the production site".

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A GitHub App holds more than one private key at once, and a new key does not invalidate the old
one, so the page's spine is overlap: generate the new key beside the old, push it to the Worker,
prove it, and only then delete the old key. The overlap is what removes the outage, and it is also
what leaves a rollback, which lasts exactly until the deletion. Every section serves that order.
Each verification signal is stated with what it proves and what it does not, because two of them
can pass on a key GitHub would refuse: `/healthz` makes no network call, and a publish inside the
55-minute token cache can run on a token the old key minted.

### The order, argued

Each section holds what the next one depends on.

1. **The two-key model and the order move into the introduction** (cover 1). The reader needs the
   model before step one, or "leave the old key in place" reads as an omission. The anatomy lets
   an introduction say why the thing the guide covers exists, and the order is the page's
   narrative in one sentence.
2. **Before you begin** names the deployed site, the GitHub and Wrangler access, an admin sign-in
   that can publish, Workers Logs, the `/healthz` route, and the old key's file. The sign-in is
   there because Verify's publish and its log query both run from the admin. The last
   precondition carries why a scaffolded site has no rollback copy, so a reader learns it before
   the deletion makes it matter.
3. **Generate a new key** (cover 2) comes first among the steps, because nothing can be pushed
   before it exists, and GitHub requires the new key before the old one can go (`f:zoekqt`).
4. **Push the new key to the Worker** (cover 3) merges the outline's encode and push into one
   section, since every platform's command encodes and pipes in one line. Piping straight into
   Wrangler keeps the value out of a file, which is where Windows PowerShell 5.1's UTF-16LE default
   bites (`f:dbue4k`), so the trap is stated beside the PowerShell form that invites it.
5. **Verify the new key** (cover 4) comes before the deletion. The anatomy puts verification after
   the steps, but here the last step is irreversible (`f:lg2ae8`), and confirming before deleting
   is the page's safety property (`f:ejuoh6`). Its checks produce the state they read: the
   confirming publish follows an edit the reader makes in the same list, so a site with nothing
   pending still has something to publish.
6. **The token cache moves up into Verify's opening paragraph** (cover 6). The cache is the reason
   step 2 waits 55 minutes between `/healthz` and the publish (`f:vg42j3`). Left last, as the
   outline's covers order has it, it would reach the reader after the old key was already deleted.
7. **Delete the old key** (cover 5, first half) follows the checks it depends on.
8. **Recover from a failed key** (cover 5, second half) is the Ghost exemplar's named recovery
   section. Its two H3s separate the recoverable case, rollback while the old key exists
   (`f:sszb7b`), from the case after deletion, a third key (`f:lg2ae8`). It opens with ordered
   diagnostic checks that read the signals Verify produced.
9. **See also** closes the page, per the anatomy.

### Departures from the outline's covers order, with the reason for each

- Cover 1 (two keys and the order) moves into the introduction, as item 1 above argues.
- Covers 2 and 3 keep their order, and cover 3's encode and push become one section with one
  command per platform, as item 4 argues.
- Cover 6 (the token cache) moves from last to the opening of "Verify the new key", where it
  explains the wait before the publish check.
- Cover 5 splits: the deletion is a step section after Verify, and rollback and the third key form
  the recovery section, matching the anatomy's failure-path slot.
- The anatomy's verification section precedes the final step ("Delete the old key"), as item 5
  argues. No verification follows the deletion, since the key the Worker uses was proven before it.

### Exemplar takes, and where each lands

- **Cloudflare, Create API token.** The Warning at the step where the secret is shown once lands in
  "Generate a new key": GitHub keeps only the public portion, so the downloaded `.pem` is the only
  copy of the new private key (`f:zoekqt`). The closing verify call whose response is the success
  signal lands as Verify's step 1, a `curl` of `/healthz` with the expected JSON response shown in
  a code block. Left behind: dashboard screenshots and the token-kind fork.
- **Ghost, Install on Ubuntu.** The named recovery section that separates a total failure from an
  interrupted run lands as "Recover from a failed key", with "Roll back to the old key" and
  "Generate a third key". Left behind: the VPS and NGINX stack.

### Heading policy

Task section headings start with a bare infinitive; "Before you begin" and "See also" are the
anatomy's fixed headings. No page links an anchor on this page today:
`docs/extend/security-model.md` (lines 50, 391, 516) and
`docs/extend/add-cairn-to-a-sveltekit-app.md` (lines 28, 939) link the page itself, so every
heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before
the contract (register, "The introduction"). Two or three paragraphs. The intro-framing step
reasons the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A cairn site publishes through its
   own GitHub App: the App's private key, held as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`,
   signs a JWT that GitHub exchanges for a short-lived installation token, and that token makes
   every commit (`f:kkp5bi`, scoped to this mechanism; `f:i4fg3o` for the secret's name). Rotation
   replaces that key. A GitHub App can hold more than one key at once, a new key does not
   invalidate the old one, and a key never expires but is removed by hand (`f:ixr3ny`). So the
   rotation runs in an order with no gap: generate the new key, push it to the Worker, confirm it,
   then delete the old key (`f:ejuoh6`). Until that deletion the old key still works, which is
   also what leaves a rollback.
2. **Who and why, with the contract.** The reader is the developer who runs an organization's
   site on cairn and can edit its GitHub App and deploy its Worker. Because a key never expires,
   rotation is a deliberate act the reader schedules, by the organization's policy or when a copy
   of the key may have been exposed; state that generically and invent no scenario (Tells, "No
   invented material"). The contract sentence, inside the framing: replace the App's private key
   without a publishing outage, prove the new key before the old one goes, and recover if the new
   key fails.
3. **Prior knowledge.** A terminal on the reader's platform, Wrangler's secret commands, and a
   Workers Logs query. The adapter's `createGithubApp` call is named once in "Push the new key to
   the Worker" and needs no prior knowledge here.
4. **What the page does not cover, with the page that does (wrong-place routing).** Registering
   the App the first time: `docs/extend/add-cairn-to-a-sveltekit-app.md#register-the-github-app`,
   or the setup command for a scaffolded site. Why the key lives only as a Worker secret, and what
   the App's token can write: `docs/extend/security-model.md#the-github-apps-reach`. This
   sentence may name the page, since scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice, and a task-section sentence stays under 26 words); **Facts**,
the ids it draws on ("cited again" marks a fact whose primary home is another section); the
content and steps; and **Hand-off**.

### Before you begin

**First sentence:** The rotation needs a deployed site, access to its GitHub App, its Worker, and
its admin, and the two signals the checks read.

**Facts:** `f:kldwss`, `f:9ug9mo` (scoped to `npx wrangler login`), `f:ln5ug0` (scoped to the
owner row), `f:prb2os`, `f:72yc97`. Cited again: `f:i4fg3o`, `f:paotzb`, `f:zoekqt`, `f:jjava3`.

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- A deployed site whose Worker holds the App's key as `GITHUB_APP_PRIVATE_KEY_B64` (`f:i4fg3o`).
  `create-cairn-site` creates the App and deploys the site in one run (`f:kldwss`); a hand-built
  site reaches the same state through
  `docs/extend/add-cairn-to-a-sveltekit-app.md#store-the-apps-credentials`.
- A GitHub account that can edit the App's settings, where its private keys are managed
  (`f:zoekqt`); link GitHub's "Managing private keys for GitHub Apps"
  (https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
  rather than copying its navigation.
- Wrangler signed in, through `npx wrangler login`, to the Cloudflare account that holds the
  site's Worker (`f:9ug9mo`), and a terminal in the site's directory.
- A sign-in to the deployed site's admin as an editor who can publish an entry, since Verify's
  publish runs there and its log query looks for a record that only an editor's admin visit
  writes (`f:jjava3`). The setup command writes its runner's owner row and opens a sign-in link
  (`f:ln5ug0`); a hand-built site's first owner signs in with the `bootstrapOwner` email, as
  `docs/extend/add-cairn-to-a-sveltekit-app.md#verify-the-production-site` shows (opened and
  confirmed: its step 1 requests a sign-in with that email).
- Workers Logs recording the Worker's logs, which needs `observability.enabled` set to `true` in
  `wrangler.jsonc` (`f:prb2os`). The scaffold sets it; a hand-built site adds it in
  `docs/extend/add-cairn-to-a-sveltekit-app.md#add-the-email-sending-binding-and-name-the-origin`.
- A `/healthz` route at the site root. The scaffold ships one (`f:paotzb`); a hand-built site adds
  the route from `docs/reference/sveltekit.md#loadhealth` (opened and confirmed: the entry shows
  the five-line `src/routes/healthz/+server.ts`, mounted outside `/admin`, with
  `prerender = false`).
- For the rollback, the current key's `.pem` file. A site the setup command created holds the key
  only in the Worker's secret store (`f:72yc97`), so without a copy kept elsewhere the rollback in
  "Roll back to the old key" is unavailable and the recovery is a third key. State this as the
  precondition's consequence, in one sentence, and give no custody advice (out of scope).

**Hand-off:** with access in hand, the new key comes first.

### Generate a new key

**First sentence:** A new key joins the App beside the old one, so generating it changes nothing
until the Worker starts using it.

**Facts:** `f:zoekqt` (scoped; see the dispositions). Cited again: `f:ixr3ny`.

Content:

- One step, a single bulleted item (anatomy item 3), the location first: on the App's settings
  page on GitHub, generate a private key and download its `.pem` file, following GitHub's
  "Managing private keys for GitHub Apps" (link). The settings navigation, the 25-key limit, and
  the PEM's PKCS#1 form stay behind that link, per the register's rule that a vendor's specifics
  get a link, never a copy.
- After the step, one sentence: leave the old key in place, since an App with one key needs the
  new key before the old one can be deleted (`f:zoekqt`) and the old key keeps the site publishing
  until "Delete the old key" (`f:ixr3ny`).
- The page's one Warning notice, placed at this step (the Cloudflare exemplar's take): GitHub keeps
  only the public portion of a key, so the downloaded file is the only copy of the new private key
  (`f:zoekqt`). The notice holds no procedural step.

**Hand-off:** the file holds the key as a PEM, and the Worker reads it as base64.

### Push the new key to the Worker

**First sentence:** The Worker reads the key as one line of base64, so each command encodes the
`.pem` file and pipes it to `wrangler secret put`.

**Facts:** `f:i4fg3o`, `f:olofdb`, `f:z97ilc`, `f:dbue4k`, `f:86h9o6`, `f:9xqudi` (scoped).

Content, in order:

- The form (`f:i4fg3o`): `GITHUB_APP_PRIVATE_KEY_B64` is the PEM base64-encoded with no line
  breaks. State the form and give no reason for it (Drafting constraints).
- One step, a single bulleted item: in the site's directory, run the command for your platform,
  replacing the path with the new `.pem` file's location. A complete sentence introduces the
  three forms, each a short label line and a code block:
  - **Linux or macOS, with Node.** `node -e "process.stdout.write(require('fs').readFileSync('path/to/new-key.pem').toString('base64'))" | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.
    One clause: this is the encoding the setup command writes (`f:olofdb`).
  - **Linux, with GNU `base64`.** `base64 -w 0 path/to/new-key.pem | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.
    One clause: `-w 0` turns off the default wrapping, so the output is one line (`f:z97ilc`).
    Label it Linux only; say nothing about macOS here (the Node form covers it).
  - **Windows, in PowerShell.** `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\new-key.pem')) | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.
    One clause: `[Convert]::ToBase64String` returns unwrapped base64 (`f:dbue4k`). The trap sits
    in the paragraph right after this block: saving the value with `Out-File` first writes the
    file as UTF-16LE under Windows PowerShell 5.1, two bytes per character, unlike the Node form's
    one byte per character, while PowerShell 7 writes UTF-8 without a BOM (`f:dbue4k`). So the
    command pipes the value straight to Wrangler.
- What the push does (`f:86h9o6`): `wrangler secret put` creates a new version of the Worker and
  deploys it immediately, so no build or deploy follows. A site on gradual deployments uses
  `wrangler versions secret put` instead; link Cloudflare's "Secrets" page
  (https://developers.cloudflare.com/workers/configuration/secrets/) for that path, and state
  that the rest of the page assumes `wrangler secret put`.
- What stays (`f:9xqudi`, scoped): the App id and the installation id are non-secret values in the
  adapter's `createGithubApp` call, so only the secret changes and no source edit follows.
- Local development (`f:86h9o6`): `wrangler dev` reads `.dev.vars`, never the deployed secret, so
  a key kept there needs the same replacement. One sentence of explanation, not a step.

**Hand-off:** the deployed Worker now signs with the new key, which the checks prove.

### Verify the new key

**First sentence:** The `/healthz` check proves at once that the new key signs, and a publish after
the token cache expires proves that GitHub accepts it.

**Facts:** `f:paotzb`, `f:5dwnh1`, `f:vg42j3`, `f:jjava3`, `f:9sk0at`, `f:7u49xs` (scoped). Cited
again: `f:prb2os`, `f:ixr3ny`, `f:ejuoh6`.

Content:

- The cache paragraph, tied to the task by its first clause (anatomy: explanation opens with a
  sentence tying it to the task) (`f:vg42j3`): the Worker caches the installation token it mints,
  per isolate, for 55 minutes, minting only on a miss. A warm isolate keeps a token minted with
  the old key until its entry expires, and a cold isolate mints from the current secret. A
  publish in the first 55 minutes after the push can therefore succeed without the new key
  reaching GitHub. The old key keeps working throughout (`f:ixr3ny`), so the wait costs time and
  no availability.
- A complete sentence introducing the checks, then a numbered list of six ordered steps, one
  action each, with the observable result beneath each step that produces one. Steps 3 to 5
  produce the edit the publish needs, in the tutorial's own split
  (`docs/extend/add-cairn-to-a-sveltekit-app.md#verify-the-production-site`, opened: "In the
  admin, open the First light post", "In the editor, change a line", "In the editor, publish the
  edit"), so the list assumes no pending entry:
  1. In a terminal, request `/healthz` on the deployed site with `curl https://<your-site>/healthz`.
     Show the expected response in a code block,
     `{"ok":true,"checks":{"githubAppSigning":{"ok":true}}}` (the shape is `f:paotzb`'s). The
     result lines: the route answers with status 200 even when the check fails, so read the `ok`
     field (`f:paotzb`). `ok: true` proves the secret decodes, imports, and signs; the check makes
     no network call, so it never proves that GitHub accepts the key (`f:5dwnh1`). On `ok: false`,
     point to "Recover from a failed key" by heading.
  2. Wait 55 minutes from the push, so that every cached token was minted from the new key
     (`f:vg42j3`).
  3. In the deployed admin, signed in, open an entry. Opening the admin also runs the shell read
     that step 6 queries (`f:jjava3`).
  4. In the editor, change a line you are ready to publish, since the next step publishes it.
     Publish saves first, so no separate save step follows (`f:9sk0at`).
  5. In the editor, publish the edit. The result: the note reads "Published. The live site is
     rebuilding." (`f:9sk0at`, verbatim), and that completed publish from the deployed Worker is
     the confirmation (`f:ejuoh6`, its confirm clause). If the publish does not complete, point
     to "Recover from a failed key" by heading, and say nothing of what the failure shows (see
     Drafting constraints).
  6. In Workers Logs, query `github.unreachable` over the time since the push. No record with
     `scope: 'shell'` means the Worker minted a token GitHub accepted (`f:jjava3`). The query
     proves this only with observability on, since an empty log proves nothing without it
     (`f:prb2os`). Link Cloudflare's Workers Logs page
     (https://developers.cloudflare.com/workers/observability/logs/workers-logs/) for the query
     interface.
- One sentence after the list, scoped from `f:7u49xs`: `commit.failed` and `publish.failed` come
  only from the commit step, so they are not the query for a key GitHub refuses; the
  `github.unreachable` row in `docs/reference/log-events.md` lists the event's other two scopes
  (opened and confirmed: the row names `shell`, `help`, and `publish_advisories`).

**Hand-off:** with every check passed, the old key can go.

### Delete the old key

**First sentence:** Once every check passes, delete the old key on GitHub, and treat the deletion as
final, since GitHub cannot restore a deleted key.

**Facts:** `f:lg2ae8`. Cited again: `f:ejuoh6`, `f:zoekqt` (keys are removed only by hand).

One step, a single bulleted item, the location first: on the App's settings page on GitHub,
delete the old private key, following GitHub's "Managing private keys for GitHub Apps" (link).
Then one sentence: from here on, a failure of the new key is recovered by a third key, which
"Generate a third key" describes (`f:lg2ae8`). No notice here; the page keeps its one Warning at
the generate step.

**Hand-off:** none to further steps; the recovery section follows.

### Recover from a failed key

**First sentence:** A failed key is rolled back while the old key still exists on GitHub, and
replaced with a third key once the old key is deleted.

**Facts:** Cited again: `f:5dwnh1`, `f:9xqudi` (the missing-key clause), `f:dbue4k`, `f:jjava3`.

A complete sentence introduces ordered diagnostic checks, a numbered list (anatomy item 5), each
reading a signal from "Verify the new key" and pointing at the fix:

1. If `/healthz` reports the detail `GITHUB_APP_PRIVATE_KEY_B64 is not configured`, the Worker
   holds no key (`f:5dwnh1`); the same missing secret fails publishing as `github.app-unreachable`
   on first token use (`f:9xqudi`). Run the push again from the site's directory.
2. If it reports `key import or sign failed` or `malformed JWT`, the secret is not a usable private
   key (`f:5dwnh1`). Check that the path names the new `.pem` file and that no `Out-File` step
   intervened under Windows PowerShell 5.1 (`f:dbue4k`), then push again.
3. If `/healthz` reports `ok: true` but Workers Logs shows `github.unreachable` with
   `scope: 'shell'` and the `error` `Error: GitHub installation token failed: <status>`, GitHub
   refused the signed JWT (`f:jjava3`). Roll back, or generate a third key, by the two subsections
   that follow, named by heading.

Close the list's lead-in or follow it with one sentence linking `docs/extend/debug-your-site.md`
for reading the logs in general (the extend track's recovery surface, anatomy item 5). That page's
outline carries no `github.unreachable` row, so the three checks stay inline here.

**Hand-off:** into the two subsections, one per state of the old key.

#### Roll back to the old key

**First sentence:** Until the old key is deleted, pushing its base64 with the same command restores
signing with it immediately.

**Facts:** `f:sszb7b`. Cited again: `f:86h9o6`, `f:ejuoh6` (its rollback clause), `f:72yc97`.

- One step, a single bulleted item: in the site's directory, run the push command for your
  platform from "Push the new key to the Worker" with the old key's `.pem` file (`f:sszb7b`).
- One sentence: the push deploys at once (`f:86h9o6`), so the site publishes on the old key while
  the new key is diagnosed separately (`f:ejuoh6`, its rollback clause).
- One sentence: the rollback needs the old key's file, which a site the setup command created
  never kept (`f:72yc97`); without it, "Generate a third key" applies.

**Hand-off:** after deletion, or without the old key's file, the next subsection.

#### Generate a third key

**First sentence:** GitHub cannot restore a deleted key, so a failure after the deletion is
recovered by generating a third key.

**Facts:** `f:lg2ae8`. Cited again: `f:zoekqt`.

A numbered list of steps, each naming its section by heading:

1. Generate another key, as in "Generate a new key".
2. Push it, as in "Push the new key to the Worker".
3. Run the checks in "Verify the new key".
4. On the App's settings page, delete the key that failed (`f:zoekqt`, keys are removed by hand).

**Hand-off:** none; See also closes the page.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing
sentence, then a bulleted list, each item's link text naming its destination:

- `docs/extend/add-cairn-to-a-sveltekit-app.md#register-the-github-app`, registering the App.
- `docs/extend/security-model.md#the-github-apps-reach`, what the key and its installation token
  can write.
- `docs/reference/sveltekit.md#loadhealth`, the signing self-test behind `/healthz`.
- `docs/reference/log-events.md`, the `github.unreachable` row.
- GitHub's "Managing private keys for GitHub Apps" and Cloudflare's "Secrets", the two external
  pages the steps link.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The outline's 13 fact ids
and the four the page inputs added are all carried, three of them scoped, with the out-of-scope
remainder of each named. The plan adds six container facts, each named where it lands. No fact is
cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:ixr3ny | carried | Introduction (the two-key model); cited again in Generate a new key and Verify the new key |
| f:i4fg3o | carried | Push the new key to the Worker (the one-line base64 form); cited again in Introduction and Before you begin |
| f:sszb7b | carried | Roll back to the old key |
| f:lg2ae8 | carried | Delete the old key (the deletion is final); cited again in Generate a third key |
| f:zoekqt | carried (scoped) | Generate a new key (generate and download, GitHub keeps only the public portion as the Warning, the one-key order); cited again in Before you begin, Delete the old key, Generate a third key. The settings navigation, the 25-key limit, and the PKCS#1 form stay behind the link to GitHub's "Managing private keys for GitHub Apps", the fact's own source, per the register's vendor-specifics rule |
| f:86h9o6 | carried | Push the new key to the Worker (deploys at once, the gradual-deployments command, `.dev.vars`); cited again in Roll back to the old key |
| f:ejuoh6 | carried | Introduction (the order); cited again in Verify the new key (step 5, the confirming publish), Delete the old key, Roll back to the old key |
| f:olofdb | carried | Push the new key to the Worker (the Node form) |
| f:9xqudi | carried (scoped) | Push the new key to the Worker (only the secret changes); cited again in Recover from a failed key (check 1, the missing-key clause) |
| f:prb2os | carried | Before you begin (Workers Logs precondition); cited again in Verify the new key (step 6) |
| f:7u49xs | carried (scoped) | Verify the new key (the shell scope, and that `commit.failed` and `publish.failed` come only from the commit step). The `help` and `publish_advisories` scopes are linked to the `github.unreachable` row of `docs/reference/log-events.md`, which states all three |
| f:dbue4k | carried | Push the new key to the Worker (the PowerShell form and the 5.1 `Out-File` trap); cited again in Recover from a failed key (check 2) |
| f:vg42j3 | carried | Verify the new key (the cache paragraph and step 2) |
| f:5dwnh1 | carried | Verify the new key (step 1, what `ok: true` does not prove); cited again in Recover from a failed key (checks 1 and 2, the detail strings) |
| f:jjava3 | carried | Verify the new key (steps 3 and 6, the shell read and its record); cited again in Before you begin (why the sign-in is needed) and Recover from a failed key (check 3) |
| f:z97ilc | carried | Push the new key to the Worker (the GNU form, Linux only) |
| f:paotzb | carried | Verify the new key (step 1, status 200 and the `ok` field); cited again in Before you begin (the scaffold's route) |
| f:kkp5bi | carried (added, scoped) | Introduction (the key signs a JWT that mints a short-lived installation token). Its custody clauses (never on disk, never logged) stay with `docs/extend/security-model.md` |
| f:kldwss | carried (added) | Before you begin (the setup command creates the App and deploys) |
| f:9ug9mo | carried (added, scoped) | Before you begin (`npx wrangler login`); its deploy clause is not used |
| f:72yc97 | carried (added) | Before you begin (the rollback copy); cited again in Roll back to the old key |
| f:ln5ug0 | carried (added, scoped) | Before you begin (the setup command writes its runner's owner row and opens a sign-in link). Its install, build, and deploy clauses are not used; `f:kldwss` carries the deploy |
| f:9sk0at | carried (added) | Verify the new key (steps 4 and 5: Publish saves first, and the verbatim "Published. The live site is rebuilding." note as the publish's result) |

The page-inputs claim inventory carried six more rows, disposed as it recorded them: the absent
prior page (no claims); the four rejected facts, kept off the page by the drafting constraints
below (`f:bffsa9`, `f:97fxdx`, `f:w78j1b`, `f:4sb2nh`); and registration and custody, routed to
`docs/extend/add-cairn-to-a-sveltekit-app.md` and `docs/extend/security-model.md` from the
introduction and See also.

## Friction filed

The page-inputs step filed one entry on 2026-10-07 (no single signal confirms GitHub accepts a
rotated key before the old one is deleted; `f:5dwnh1`, `f:jjava3`, `f:vg42j3`, `f:ejuoh6`,
`f:bffsa9`), and this plan does not refile it. The `/admin/healthz` wording in the code comments
was filed on 2026-09-30 and is not refiled. This plan filed five entries in
`docs/internal/docs-friction-log.md` on 2026-10-07, the fifth in its structural-edit revision,
none blocking the page:

1. The key needs a per-platform encode command, the tutorial uses a fourth form, and no fact
   verifies the Windows leg end to end.
2. The rollback depends on an old key file that the setup command never leaves on disk, and the
   setup command's closing message points at a re-run that cannot take a regenerated key.
3. The `github.app-unreachable` remediation and `.dev.vars.example` name `GITHUB_APP_ID` and
   `GITHUB_APP_INSTALLATION_ID`, which the engine never reads.
4. No signal says which key the Worker holds, so a push that reaches another Worker leaves every
   check passing on the old key.
5. The rotation's confirming publish has to ship a content edit, since Publish acts only on an
   edit, a held draft, or a new entry, and no container fact states that guard.

## Cross-page notes

- `docs/extend/add-cairn-to-a-sveltekit-app.md:934` encodes the key with
  `base64 < <file> | tr -d '\n'`. This page uses the three forms its outline names. The two pages
  disagree in form, not in result (friction entry 1); this page does not edit the tutorial.
- The hand-built tutorial mounts no `/healthz` route, so the precondition in "Before you begin"
  links the `loadHealth` reference entry for it.

## Drafting constraints

- Never say that a refused key produces `commit.failed` or `publish.failed` (`f:bffsa9` is
  rejected), and never say what the save or publish path shows when the token mint fails; no
  verified fact states it. A publish that does not complete in Verify's step 5 is read through
  `/healthz` and the step 6 query, by way of "Recover from a failed key".
- Never say that `base64 -w 0` works on macOS (`f:97fxdx` is rejected). Label the GNU form Linux
  only and let the Node form serve macOS.
- Never give a reason for the one-line form, and never say that a wrapped value fails to decode
  (`f:w78j1b` is rejected).
- Never say that a PowerShell `Out-File` file matches the Node form's output (`f:4sb2nh` is
  rejected). State `f:dbue4k`'s version difference only.
- Never claim how PowerShell encodes a string piped to a native command, and never claim whether a
  secret change starts fresh isolates; no fact states either (friction entry 1 and the
  page-inputs entry). The 55-minute wait rests on `f:vg42j3` alone.
- Never use the shell's hidden publish-all action as a signal; it also depends on pending entries.
- Never say when the Publish control is available or why the edit in Verify's step 4 is needed;
  no container fact states the guard (friction entry 5). The steps make the edit and publish it,
  as the tutorial's "Verify the production site" does, and never say the edit goes live or
  deploys, since the tutorial's hand-built site reaches its deployed page only after a build and
  deploy the reader runs.
- Write the route as `/healthz` at the site root, never `/admin/healthz`, whatever the code
  comments say.
- Placeholders: `path/to/new-key.pem` in the Node and GNU forms, with no `~` inside the Node
  string, since a JavaScript string does not expand it; a full Windows path in the PowerShell form;
  `<your-site>` for the address. Every command uses `npx wrangler`, as the tutorial does.
- The expected `/healthz` response is exactly `{"ok":true,"checks":{"githubAppSigning":{"ok":true}}}`.
- `create-cairn-site` on first mention, then the setup command (register, "Names").
- Vendor specifics get a link, never a copy: GitHub's settings navigation, key limits, and PEM
  form; Cloudflare's Workers Logs interface and the gradual-deployments deploy command.
- Every section opens on the first sentence decided above. Each step names its location before
  its action and holds one action, a conditional step states its condition first, and a procedure
  of one step is a single bulleted item. A reference names its target by heading, never by
  position.

## Ledger

- 2026-10-07, R5 scoped redraft after the final reader read's `fix` (two blocking findings). The
  first Drafting constraint's ban on saying what the editor sees when the token mint fails is
  lifted for one claim: `f:ogokfy` (filed `[verified]` this redraft from the edit load, the
  publish action's save step, `viewAction`, and SvelteKit's re-render after a full-page action)
  states that opening or publishing an entry ends on an error page with status 500. "Recover from
  a failed key" now opens on rollback-needs-both and third-key-otherwise, names that error page,
  maps it to the signals (step 3 for a refused key), and adds that a failed publish with neither
  signal after the wait is not a key failure, linking `debug-your-site.md`. "Generate a third
  key" now covers the case before the deletion and gains a step 5 that deletes the old key if it
  is still on the App. Advisories taken: "if you have it" on the PEM prerequisite, the `event`
  field in Verify's step 6, and where `github.app-unreachable` surfaces in Recover's step 1. The
  duplicated warm-isolate clause in `f:vg42j3` was cut to one.
