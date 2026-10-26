---
page: Add cairn to a SvelteKit app
type: tutorial milestone
exemplar: extenders/astro-tutorial-2-pages-1
---

# Add cairn to a SvelteKit app

:::reader
**Who reads it.** A Svelte-fluent web developer who adds cairn to a SvelteKit app by hand, in one of these situations:
- An existing-app developer, who wants cairn's admin in an app they already run. They arrive from a search such as "add cms to sveltekit" or from the extend README's Start list. They know SvelteKit and their app. They don't know that the setup command can't help them, because it refuses a target directory that already holds files, or which pieces cairn adds. :fact[9slxqf]
- An own-design developer, arriving from the front door or the extend README, who wants a new cairn site without Waymark. They know SvelteKit. They don't know that the npm package carries no theme or chassis, so building by hand is the bare route. :fact[rxj43c]
- A curious developer or evaluator, arriving from Architecture, after running the setup command, or from a search, who wants to understand what cairn does underneath or what the scaffold wired. They may know the scaffolded tree. They lack the model: the engine as an npm package, the SvelteKit wiring points, the Cloudflare bindings, and the GitHub App.
- A misrouted newcomer, arriving from a search or the extend README's Start list, where this page sits second, who wants a cairn site by any route and knows little. They don't know that the setup command is the usual, much easier route. :fact[kldwss]

**Why they arrive:**
- To put cairn's admin into a SvelteKit app they already run, which the setup command never adds cairn to. :fact[9slxqf]
- To start a cairn site without Waymark, since the package carries no theme. :fact[rxj43c]
- To see what cairn does underneath, or what the setup command wired into a scaffolded site, by reading the tutorial through without building anything.
- To start any cairn site, in which case the introduction sends them to the setup command first. :fact[kldwss]

**What they already know.** Working knowledge of SvelteKit (routes, layouts, server hooks, and the Vite config that carries the kit config), TypeScript, git, and a terminal. The tutorial explains each Cloudflare and cairn step it uses and assumes the SvelteKit basics. A reader who starts from an existing app works through the same milestones, and the tutorial says where that app skips a step.

**What the page does for them:**
- It opens in second person on a statement about cairn, never on the page. The model comes first: a cairn site is a SvelteKit app that installs the engine's npm package and wires it in through files the app owns. The admin mounts as SvelteKit routes at `/admin`, and a server hook guards every request to it. A Vite plugin, `cairnManifest`, checks the committed index of the markdown content on every build. :fact[rxj43c] :fact[dqe7ij] :fact[f21bcz] :fact[xluud1]
- The model goes on: editors sign in from a link the engine emails them, and each publish commits the editor's change to the site's repository through a GitHub App the site registers. In production the site runs as a Cloudflare Worker, and the engine keeps its auth store in a D1 database bound as `AUTH_DB` and sends sign-in mail through the Worker's Email Sending binding, `EMAIL`. :fact[lbetsq] :fact[5f4kmk] :fact[ntdafg]
- A second paragraph names the usual route: the setup command, `create-cairn-site`, is much easier than building by hand, and in one run it creates the GitHub App, the repository, and the Cloudflare bindings and deploys the site. It links [Scaffolded site files](scaffolded-site-files.md) for the tree the command writes. :fact[kldwss]
- A third paragraph says why this page exists. An existing app can't take the setup command, because it refuses any target directory that already holds files. A scaffolded site ships Waymark, cairn's reference reading theme, and the engine's package carries no theme, so a site without Waymark starts from a bare SvelteKit app. A curious reader can read the tutorial through without building anything, since each file the engine needs arrives in the milestone that needs it, with the reason it exists. :fact[9slxqf] :fact[rxj43c]
- A fourth paragraph names the running example, Field Notes, a site with one post, and the end state: the reader signs in to the deployed site as its first editor, edits the post, and publishes the edit. It states the assumed knowledge and says an existing app works through the same milestones.
- A numbered list under a complete lead-in names the milestones in order, each linked to its section and each with the check that ends it. The first ends with the plain site loading at the address the deploy prints. The second ends with the first post rendered at its permalink on the dev server. The third ends with the reader signed in to the admin on the dev server, with no sign-in email. The fourth ends with an edit published from the deployed admin and showing on the deployed page.
- One line names the closing section, [Customize the sign-in email](#customize-the-sign-in-email), which changes the email the engine sends, and points the curious reader to [Architecture](architecture.md) for the model in full.
- It ends with the topics it leaves to other pages, as a bulleted list under a complete lead-in, each item subject first and its page last.

**What it leaves to other pages:**
- The faster path, the setup command, and the tree it writes file by file, in [Scaffolded site files](scaffolded-site-files.md#file-tree).
- Every adapter option, in [Define an adapter and schema](define-an-adapter-and-schema.md).
- The security reasoning behind the GitHub App's repository-wide write and the CSRF design, in [Security model](security-model.md).
- The delivery routes beyond the entry catch-all, in [Build the public routes](build-the-public-routes.md).
- Rotating the App's private key later, in [Rotate the GitHub App key](rotate-the-github-app-key.md).
- A custom sender's code, in the [SvelteKit reference's types section](../reference/sveltekit.md#types).
- Deploying each push automatically, in Cloudflare's [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) docs, since this tutorial's site deploys by hand.
- The retired JavaScript doctor and the removed `/components` subpath, which the page doesn't name.

**Background.**
- The argument: a developer can add cairn to a SvelteKit app by hand in four milestones, each ending with a check the reader runs. They are a bare site deployed to Cloudflare, a post on disk rendered at its permalink, the admin signed in on the dev backend over that post, and the production site publishing an edit through the developer's GitHub App. Content comes before the admin because the dev backend serves the site's content from the working tree. The `cairnManifest` plugin also supplies the build-time flag the dev backend's hook reads. A reader who builds in this order therefore never wires a step whose prerequisite does not exist yet. Each file the engine needs arrives in the milestone that needs it, with the reason it exists. A reader who only wants to see what cairn does underneath can read the page through without building anything.
- The order: the sections run so that each step's prerequisite exists before the step. The prerequisites come first, then four milestones (a bare deploy, an entry rendered from content on disk, the admin on the dev backend, and production). Customizing the sign-in email follows, then the summary and next steps the tutorial anatomy requires. Content precedes the admin, since the admin needs the runtime the adapter feeds. The dev backend reads the content, the manifest, and the define that the content milestone supplies. Each milestone runs its objectives and starting state, steps, verification, failure paths, a try-it-yourself prompt with a disclosure answer, and a checklist, per the tutorial milestone anatomy.
- The place in the doc set: second page under Start, after Architecture, which gives the model in full. Scaffolded site files explains the setup command's output; this page is its by-hand twin. The milestones carry the steps, and the introduction carries the model and the route choice.
- Where each platform fits, for the introduction's model: cairn is embedded in a SvelteKit site on Cloudflare Workers. :fact[4zpvor] :fact[i74t7g]
- SvelteKit's part: the npm package installed, the admin mounted as routes, a server hook as the guard, and the Vite manifest plugin at build. :fact[ew4uk7] :fact[dqe7ij] :fact[f21bcz] :fact[9xthnq] :fact[n0laoh]
- Cloudflare's part: the D1 auth store and the Email Sending binding. :fact[u77pea] :fact[i74t7g]
- GitHub's part: a per-site App, and publishes as commits. :fact[gyu7jc] :fact[qehbx3]
- The usual route: `npx create-cairn-site`, which starts from Waymark and creates the App, the repository, and the bindings and deploys in one run. :fact[yvfzr2] :fact[u705t5] :fact[rxj43c] :fact[kldwss]
- The front-matter exemplar, the Astro tutorial, gives the objectives stated before any step, the check that ends nearly every step (the page loads at its URL), the "Try it yourself" prompt with its collapsed "Show me the steps." answer, and the closing checklist of "I can" statements before the reader advances. Each unit ends live, as each milestone here ends deployed or running. The page leaves its beginner register, its VS Code and Netlify specifics, and its MDX components.
- A second exemplar, `extenders/django-custom-management-commands` (Extenders, Task guide), gives the one running example carried through every milestone and the file-location tree before each file's code. The page leaves its appended API reference.
- The state the steps start from: Node 24, a GitHub account, a Cloudflare account, the Workers Paid plan, and a domain zone. An existing app also brings its project, its local repository, and, when it is already on GitHub, its pushed repository, which is why the steps that create those say an existing app skips them.
:::

:::constraints
- Where the dev backend's behavior and its neighbors land. The working-tree default, the in-memory overlay, and the fixtures mode sit in Wire the dev backend. The admin notice sits in Verify the dev sign-in, and the in-memory exercise in Edit the post in memory. The dev package's `ssr.noExternal` entry sits in Wire the dev backend, with the 500 as a failure row in Verify the dev sign-in. The one declaration is `{ runtime }` on both handles, and the access map is declared once on the adapter. The branding merge sits in Rebrand the email. The engine-supplied define sits in Wire the dev backend, so the page shows no hand-written define plugin and no `app.d.ts` declaration. The stale-manifest message sits in Resolve a content build failure. :fact[p1v88s] :fact[cgt4tk] :fact[2fqe3l] :fact[dqjkci] :fact[7qwrb9] :fact[2pv4r5] :fact[4xrx5f] :fact[7cv105] :fact[iwf4nu] :fact[f21bcz] :fact[v72g9z] :fact[2gtftn] :fact[xluud1] :fact[n52h8f] :fact[fdtgh5]
- No `cf-typegen` step is placed (see the `f:n0fg3w` line below), and `seedContent` is named nowhere on the page.
- Each reference entry is linked at its identifier's first mention, and no separate "The [x] entry lists/documents ..." sentence follows it. A separate pointer sentence stays only where it says what the reader finds there, as the App's reach link in Register the GitHub App does.
- Each try-it section opens on its objective, stated as what the exercise shows, never as imperatives outside a step.
- No coding assistant is assumed (register). The page names no coding agent, addresses none, and mentions neither `CLAUDE.md` nor `.claude/`.
- Never on the page: the removed `/components` subpath, the retired JavaScript doctor or its `github.app` check, `seedContent`, a hand-written `devBuildDefine` plugin, a `declare const __CAIRN_DEV_BUILD__` in `app.d.ts`, a hook handle called without `{ runtime }` or given a `roles` or `access` option, or an `admin.action.misconfigured` warning about the dev backend.
- The running example and the names the reader creates: the project and Worker `field-notes`, the database `field-notes-auth`, the domain `notes.example.com`, the GitHub account placeholder `your-account`, and the post `2026-08-14-first-light.md` titled First light. The modules are `src/lib/site.config.yaml`, `src/lib/cairn.config.ts`, `src/lib/content.ts`, `src/lib/cairn.server.ts`, `src/routes/[...path]/`, `src/routes/admin/`, and `src/hooks.server.ts`, imported across directories as `#lib/<file>.js`. The two hand-off lines, the runtime line that closes Install the engine and let Vite compile it and the refusal line that closes Store the App's credentials, name no path.
- Milestone shape (tutorial milestone anatomy): each milestone's level-2 section opens with its objectives and the state it starts from. Its level-3 sections run steps, a verification whose check is the page or admin loading, failure rows, a try-it prompt, and a checklist of "I can" statements. Each try-it's steps sit inside a collapsed `<details>` block whose summary reads "Show me the steps", never under a fourth-level heading. Milestone headings carry no "Milestone N:" prefix, and the introduction's numbered list names the four milestones in order.
- Every `vite.config.ts` sample keeps the scaffold's `compilerOptions` as a comment and never shows a define plugin. The admin layout sample imports no style sheet. The tutorial runs the dev backend under `vite dev` only, and `wrangler dev` appears only in the fixtures sentence.
- Form: every step names its location before its action and holds one action, except the shell forms nested in the first step of Verify the dev sign-in. Step and list sentences stay under 26 words. Every list and code block takes a complete-sentence lead-in, and each step list takes "To <task>, follow these steps:" ("follow this step:" for a single step, which then sits as a bullet). Each file's code follows its file-location tree, as the Django exemplar does. No em dash, no heading carries a link, and task headings start with a bare infinitive.
- Names (register "Names"): cairn is lowercase. The library is the engine, and `@glw907/cairn-cms` where the reader types it. `create-cairn-site` takes its name on first mention, then the setup command. The CLI is the `cairn` CLI with its verb (`cairn doctor`), and `cairn-manifest` goes by name. The rest are the GitHub App, the Worker, and the admin, with `/admin` for the path.
- The introduction's model paragraph draws only on facts the body places, and its setup-command sentences on the setup-command facts the reader block cites. :fact[dqe7ij] :fact[f21bcz] :fact[xluud1] :fact[lbetsq] :fact[5f4kmk] :fact[ntdafg] :fact[kldwss] :fact[9slxqf] :fact[rxj43c]
- Cut `f:t4pwpw`: the page states the Workers Paid requirement through `f:75hawi` in two deliberate places, the prerequisites, so a reader has the plan before starting, and the refusal step, the first deploy that carries the admin and so the one that needs it. A site carrying the admin needs the plan from that first deploy, which already covers a second person's sign-in mail, and the free-to-yourself clause would suggest a site with the admin can run without the plan.
- Leave `f:gglwt4` to Security model's [limits of the installation token](security-model.md#limits-of-the-installation-token) section, which the page links. The repository-wide write is placed once, with its consequence for this site's repository, through `f:l5gx1t` in Register the GitHub App. The limits section states the same property and the reasoning the outline puts out of scope.
- Leave `f:xyizai` to [Scaffolded site files](scaffolded-site-files.md#viteconfigts), which the page links after the first `vite.config.ts` sample: what the scaffold builds with is that page's subject, and this page's adapter step rests on `f:mhsere`.
- Leave `f:fekvhi` to the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry, linked from Create the auth database: the audit sink's wiring belongs there, and the tutorial site wires no audit sink.
- Cut `f:dzmj90`: a synthetic case in the engine's slug contract test, with no reader-facing claim, and the page carries no "Milestone 1:" heading.
- Leave `f:2sd4if` to the [admin routes reference](../reference/admin-routes.md#the-guard-and-the-ambient-type), which Wire the dev backend links: the split between the guard's subtree gate and per-route authorization matters to a site with its own admin routes or an access map, and this tutorial builds neither.
- Cut `f:35s2dk`: an engine-repository CI gate on the dev package's manifest, which a site developer never runs or sees.
- Cut `f:3z1uxv`: it states the scaffold's and the example site's access declarations, neither of which the tutorial's site has, and Restrict admin access owns declaring a map.
- Cut `f:8ciz2s`: access-map validation at composition is diagnosis for a site that declares a map, which this tutorial's site does not. Restrict admin access, in Next steps, owns declaring a map, and the page carries no pointer to the debugging event.
- Leave `f:b857di`, `f:bpk8gc`, and `f:thbxvf` to the [`verifyTurnstile`](../reference/cloudflare.md#verifyturnstile) entry, which Next steps links: Turnstile's limits, logging, and log reasons belong there, and the tutorial site uses no Turnstile.
- Leave `f:cvzb8z` and `f:gun084` to the [`createAuthGuard`](../reference/sveltekit.md#createauthguard) entry: which readers see the adapter's `access` member, and which `locals` each handle sets, are the handles' and the access map's contract. The page places the one-declaration rule through `f:iwf4nu` and the required `runtime` through `f:4xrx5f` and `f:7cv105`.
- Leave `f:ditn3e` to the [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) entry, which Next steps links: the auth channel's database type belongs there, and the tutorial adds no second sign-in group.
- Leave `f:hwffph` to the [`cairn doctor` checks table](../reference/cli-cairn-doctor.md#the-checks): it is a condition for a site that declares custom roles, which this tutorial's site does not.
- Cut `f:mbx6q1`: `createEditorRoutes` is per-route wiring the single-mount admin forwards for the site, and the tutorial never uses it, so the page carries no pointer to it.
- Cut `f:mou1li`: when the access-map warning appears in Workers Logs is diagnosis for a site with a map, which this tutorial's site does not declare, and the page carries no pointer to it.
- Leave `f:n0fg3w` to [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-sveltekit-3), which carries the `wrangler types` command: the page places no `cf-typegen` step, because the fact gives the scaffold's and the Deploy-button tree's scripts, neither of which the hand-built site carries, and the tutorial's code reads no generated binding type.
- Leave `f:pfy9cw` to the [log events reference](../reference/log-events.md): log-record fields belong there, and none of those events arises on the tutorial's site.
- Leave `f:qlgggh` to [Scaffolded site files](scaffolded-site-files.md#file-tree), which the introduction links: the scaffold's root listing is that page's subject.
- Leave `f:tycp7k` to [Arrange the admin sidebar](arrange-the-admin-sidebar.md#declare-the-layout), which Mount the admin routes links: the scaffold's and the example site's `navLayout` belong to the sidebar guide, and the tutorial's adapter declares no layout.
- Cut `f:u78zg6`: with both handles taking `{ runtime }`, the event can't fire on the tutorial's site, so the page carries no warning about it and no pointer to it.
- Cut `f:zzjrza`: the scaffold's and the example site's hooks are not this site's, the tutorial's hooks pass no `content` option, and the page states the default through `f:p1v88s`. The page carries no pointer to the migration notes, whose Unreleased anchor moves at each release.
- Cut `f:47v0r9`: the dev package's built form adds nothing a step needs, and the `ssr.noExternal` entry rests on its `cloudflare:workers` import through `f:2pv4r5`.
- Cut `f:if45on`: the database steps show the create command, the `AUTH_DB` binding, and `migrations_dir`, so a sentence narrating them would restate the steps.
:::

## Before you begin

*List the accounts and tools every milestone draws on, so they come before the first step. The introduction already routes a reader who wants the faster route to the setup command.*

- The section opens on the lead-in "You need the following accounts and tools:" and gives one bulleted item per need.
- Node 24 or later. :fact[75hawi]
- A GitHub account.
- A Cloudflare account, with the note that the first milestone's bare deploy runs on Cloudflare's free tier. :fact[75hawi]
- The Workers Paid plan, which a cairn site needs from the first deploy that carries the admin, with Cloudflare's pricing page linked in the item. :fact[75hawi]
- See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- A domain whose zone is on your Cloudflare account, for real sign-in mail, with the `workers.dev` clause from the Email Sending fact: a `workers.dev` subdomain has no zone to onboard. :fact[75hawi] :fact[xhwl32]
- TypeScript on major version 6, as a list item: `svelte-check` can't run on TypeScript 7 until the 7.1 compiler API lands (never "yet"), `npx sv create` already pins major version 6, and an existing app keeps its `typescript` dependency on 6. The item leaves out the advisory workflow. :fact[yegr67]
- The `cairn` CLI, as the last list item: the production milestone runs it as `cairn doctor`, linked at that mention, and it is a separate Go module, installed once per machine with `go install` and not part of the npm package. The item leaves out the release archive, which no published page covers. :fact[1dhk1a]
- See [`cairn doctor`](../reference/cli-cairn-doctor.md).
- Inside the same item, on a machine with a Go toolchain (linked), the reader installs the CLI with `go install` in a command block. :fact[1dhk1a]
- See [Go toolchain](https://go.dev/doc/install).
- Code: the CLI's install command.

```sh
go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
```

## Deploy a bare SvelteKit site

*Prove the deploy path before any engine code exists to blame for a failure, and hold what an existing app does to meet SvelteKit 3 before the engine install.*

- The milestone opens: it ends with a plain SvelteKit site, with no cairn code, answering at its `workers.dev` address, and deploying it first proves the deploy path before the engine is installed. :fact[9ug9mo]
- A bulleted list of the milestone's objectives follows the lead-in "In this milestone, you do the following:": create the project under version control; name the Cloudflare adapter in the kit config; describe the Worker to Wrangler, and deploy it.
- The milestone starts from an empty directory. An existing app skips creating the project and starting its repository, and first makes the changes for SvelteKit 3 that a bulleted list names. :fact[skeche]
- The first change has the app upgrade `@sveltejs/kit` from `^2` to SvelteKit 3 before the next milestone, because the engine's peer range is `^3` and an app still on `^2` stops at the engine install with `ERESOLVE`. :fact[skeche]
- The second has the app move its kit options from `svelte.config.js` into the `sveltekit()` call in `vite.config.ts` and delete the file, which SvelteKit 3 no longer supports. :fact[979v0a] :fact[ifuvcl]
- The third has the app delete any `csrf.checkOrigin` setting, which fails the SvelteKit 3 build. The CSRF reasoning waits for Wire the dev backend. :fact[3cekcy]
- The fourth has the app move each `$lib` import to `#lib`, which the `imports` field in `package.json` maps, because SvelteKit 3 throws on a `$lib` import. :fact[pgeeq3]
- See [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-sveltekit-3) for the whole upgrade.

### Create the project on the Cloudflare adapter

*Write the project and the kit config every later step builds on, with the Cloudflare adapter named explicitly.*

- A self-deployed site names `@sveltejs/adapter-cloudflare` explicitly, because the scaffold's `adapter-auto` guesses the deploy target at build time. :fact[mhsere]
- The scaffold has no `svelte.config.js`, so the kit config, the adapter included, sits inline in the `sveltekit()` call in `vite.config.ts`. :fact[ifuvcl]
- That call carries two keys: `compilerOptions`, whose `runes` setting forces runes mode, and `adapter`, imported from `@sveltejs/adapter-auto`. Each `vite.config.ts` sample on the page keeps `compilerOptions` as a comment. :fact[87hc1y]
- The lead-in reads "To create the project and swap its adapter, follow these steps:".

1. In a terminal, create a minimal TypeScript project named `field-notes` with no add-ons, and change into its directory. An existing app skips this step. :fact[7e1t0j]

- Code: the create command and the change into the new directory. :fact[7e1t0j]

```sh
npx sv create --template minimal --types ts --no-add-ons field-notes
cd field-notes
```

- The project's `package.json` carries the `dev`, `build`, `preview`, and `check` scripts. :fact[7e1t0j]

2. In the project directory, start a git repository on the `main` branch, and commit the scaffold. An app that is already a repository skips this step.

- Code: the commands that start the repository and commit the scaffold.

```sh
git init -b main
git add -A
git commit -m "Scaffold Field Notes"
```

- The production milestone names this branch in the adapter's GitHub App config and reads the publish commit from it. :fact[0w7jar] :fact[m0ouh8]

3. In the project directory, uninstall `@sveltejs/adapter-auto`, and install `@sveltejs/adapter-cloudflare` as a development dependency. :fact[mhsere]

- Code: the two npm commands that swap the adapter.

```sh
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-cloudflare
```

4. In `vite.config.ts`, import the Cloudflare adapter, and pass it as the `adapter` key of the `sveltekit()` call. :fact[979v0a] :fact[ifuvcl]

- The call takes the kit options and the Svelte plugin options as sibling keys, so `adapter` sits beside the scaffold's `compilerOptions` in the one `sveltekit()` call. :fact[979v0a] :fact[87hc1y]
- Code: the file-location tree of `field-notes/` with `src/`, `package.json`, and `vite.config.ts`.

```text
field-notes/
├── src/
├── package.json
└── vite.config.ts
```

- Code: `vite.config.ts` with the adapter imported from `@sveltejs/adapter-cloudflare` and a comment saying `compilerOptions` stays as `sv create` wrote it. It leaves out the template's Tailwind, preprocess, prerender, and `cairnManifest` entries. :source[/templates/waymark/vite.config.ts] :fact[979v0a] :fact[87hc1y]

```ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as `sv create` wrote it.
      adapter: adapter(),
    }),
  ],
});
```

- See [Scaffolded site files](scaffolded-site-files.md#viteconfigts) for the scaffold's version of this file.

### Describe the Worker and deploy it

*Describe the Worker to Wrangler and deploy it, which needs the adapter that Create the project on the Cloudflare adapter names.*

- The minimal `wrangler.jsonc` names the Worker, sets a compatibility date, and points `main` and the `ASSETS` binding at the adapter's build output. :fact[q13lck]
- `npx wrangler login` signs Wrangler in to your Cloudflare account, and `npx wrangler deploy` uploads the built Worker. The address waits for Verify the deployed site. :fact[9ug9mo]
- The lead-in reads "To describe the Worker and deploy it, follow these steps:".

1. In the project root, create `wrangler.jsonc` beside `vite.config.ts`. :fact[q13lck]

- Code: the file-location tree adding `wrangler.jsonc` at the root.

```text
field-notes/
├── src/
├── package.json
├── vite.config.ts
└── wrangler.jsonc
```

- Code: `wrangler.jsonc` with four keys, under a lead-in that names them as the keys the adapter's build output needs: `name` set to `field-notes`, a `compatibility_date`, `main` set to `.svelte-kit/cloudflare/_worker.js`, and `assets` with `directory` `.svelte-kit/cloudflare` and `binding` `ASSETS`. :source[/templates/waymark/wrangler.jsonc] :fact[q13lck]

```jsonc
{
  "name": "field-notes",
  "compatibility_date": "2026-08-21",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "assets": {
    "directory": ".svelte-kit/cloudflare",
    "binding": "ASSETS"
  }
}
```

2. In the project directory, sign in to Cloudflare with `npx wrangler login`. :fact[9ug9mo]
3. In the project directory, build the site and upload the Worker.

- Code: the build command and the deploy command. :fact[9ug9mo]

```sh
npm run build
npx wrangler deploy
```

- The deploy can fail, and Verify the deployed site holds its failure row.

### Verify the deployed site

*End the milestone with a check the reader runs, the deployed address loading the scaffold's page, with the failure rows after the steps they diagnose.*

- The deploy output ends with an address of the form `<worker name>.<account subdomain>.workers.dev`, which serves the site with no domain purchase or DNS change. :fact[9ug9mo]
- At that address, the scaffold's home page, `src/routes/+page.svelte`, shows a "Welcome to SvelteKit" heading and one paragraph. :fact[ibis7z]
- The section's one step is a bullet under the lead-in "To check the deploy, follow this step:": in a browser, open the address the deploy printed, and confirm that the "Welcome to SvelteKit" page loads. :fact[ibis7z]

:::row
**Symptom.** The deploy fails.
**Cause.** Wrangler isn't signed in to the account, or the build output isn't where the Worker config points. :fact[9ug9mo] :fact[q13lck]
**Fix.** Work through the ordered checks below.
:::

:::row
**Symptom.** The address doesn't load the scaffold's page.
**Cause.** The kit config still names another adapter, or `wrangler.jsonc` points at the wrong output. :fact[mhsere] :fact[q13lck]
**Fix.** Work through the ordered checks below.
:::

- The page joins both rows into one lead-in, "If the deploy fails or the address doesn't load the scaffold's page, check the following in order:", followed by a numbered list of checks.

1. `npx wrangler login` completed for the account you deploy to. :fact[9ug9mo]
2. The kit config in `vite.config.ts` names `@sveltejs/adapter-cloudflare` and no other adapter. :fact[mhsere] :fact[ifuvcl]
3. In `wrangler.jsonc`, `main` and the `assets` directory point at `.svelte-kit/cloudflare`. :fact[q13lck]

### Deploy a change

*Practice the build-and-deploy loop the later milestones repeat, as the milestone's try-it-yourself prompt.*

- The section opens on its objective: this exercise confirms that a second deploy carries a change to the same `workers.dev` address. :fact[9ug9mo]
- The answer sits in a collapsed `<details>` block whose summary reads "Show me the steps", as a numbered list, so a reader can try first and check after.

1. In `src/routes/+page.svelte`, change a line of text. :fact[ibis7z]
2. In the project directory, build the site and deploy it again.
3. In a browser, reload the `workers.dev` address, and confirm that the page shows the change. :fact[9ug9mo]

### Checklist before the engine

*Close the milestone with "I can" statements, so the reader confirms the deploy path before the engine joins it.*

- The lead-in reads "Before you continue, confirm that each of the following statements holds:", followed by the bulleted statements.
- I can name the Cloudflare adapter explicitly in the `sveltekit()` call in `vite.config.ts`. :fact[mhsere] :fact[ifuvcl]
- I can deploy the Worker and load it at its `workers.dev` address. :fact[9ug9mo]

## Install the engine and render an entry

*Install the engine, declare a site with one posts concept, and render its first post, before the admin: the dev backend in Mount the admin on the dev backend reads the site's entries and committed manifest, `createCairnAdmin` needs the runtime the adapter feeds, and the `cairnManifest` plugin this milestone adds supplies the define the dev backend's hook reads.*

- The milestone opens: it installs the engine, declares a site with one posts concept, and ends with the site's first post rendered at its permalink on the dev server.
- A bulleted list of the milestone's objectives follows the lead-in "In this milestone, you do the following:". The reader installs the engine and lets Vite compile it, then writes the site config and a minimal adapter. Next the reader puts an entry on disk and commits the manifest that each build checks. Last, the reader renders the entry at its permalink. :fact[xluud1]
- The milestone starts from the deployed bare site the previous milestone left.
- Content comes before the admin because the dev backend that the next milestone wires reads the site's entries and its committed manifest from the working tree. :fact[cgt4tk]
- The Vite plugin this milestone adds also supplies the flag that the dev backend's hook reads. :fact[xluud1]

### Install the engine and let Vite compile it

*Install the package, its compile setting, and its ambient types, which every later module that imports the engine needs before any config or route.*

- Before any route exists, the engine needs its package with the `@cloudflare/workers-types` peer, a `noExternal` entry under `ssr` in the Vite config, and an ambient import that types `App.Locals`. :fact[26kuvx] :fact[c8efq5] :fact[vvgpr5]
- `@cloudflare/workers-types` at `^5` is a required peer, because the engine's shipped types import `D1Database` and `R2Bucket` from it. The optional peers wait for Verify the rendered entry. :fact[26kuvx] :fact[ew4uk7]
- A scaffolded site lists the engine under `dependencies` and `@cloudflare/workers-types` under `devDependencies`, and this site does the same. :fact[ew4uk7]
- The engine ships its `.svelte` files from source under its `svelte` export condition. Vite must compile them with the site's Svelte plugin, and without the `noExternal` entry the admin components fail to build. :fact[c8efq5]
- The ambient import, `@glw907/cairn-cms/ambient`, linked to the ambient reference at its first mention, augments `App.Locals` with the five fields the engine reads and writes on each admin request. No separate pointer sentence follows. :fact[vvgpr5]
- See [`@glw907/cairn-cms/ambient`](../reference/ambient.md).
- In one sentence with its cause first: version 8 of `@sveltejs/adapter-cloudflare` declares no `App.Platform`, so a custom route that needs a Worker binding reads it from `cloudflare:workers`, typed by the `Env` that `wrangler types` generates. The page leaves out the clause that `src/app.d.ts` references the generated file. :fact[vvgpr5] :fact[mhsere]
- The lead-in reads "To install the engine, follow these steps:".

1. In the project directory, install `@glw907/cairn-cms`, and install `@cloudflare/workers-types` as a development dependency. :fact[ew4uk7]

- Code: the two npm install commands. :fact[ew4uk7]

```sh
npm install @glw907/cairn-cms
npm install -D @cloudflare/workers-types
```

:::row
**Symptom.** npm stops the install with `ERESOLVE`. :fact[skeche]
**Cause.** The app's `package.json` still requires `@sveltejs/kit` `^2`. :fact[skeche]
**Fix.** Upgrade it as [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-sveltekit-3) describes, and run the install again. The page places this recovery inside the install step, addressed to the reader.
:::

2. In `vite.config.ts`, add an `ssr` block that lists `@glw907/cairn-cms` under `noExternal`. :fact[c8efq5]
3. In `src/app.d.ts`, add `import '@glw907/cairn-cms/ambient';` above the scaffold's `declare global` block. :fact[vvgpr5]

- Code: the file-location tree for `src/app.d.ts`, under a lead-in saying the file sits at the root of `src`.

```text
src/
├── routes/
└── app.d.ts
```

- Code: `src/app.d.ts` as `sv create` wrote it with the one ambient import line added. No `/// <reference>` lines, no `__CAIRN_DEV_BUILD__` declaration, and no `PageData` or `Cloudflare.Env` members. :source[/templates/waymark/src/app.d.ts] :fact[vvgpr5]

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
```

- The section hands off in one line: the admin and the content index both read a runtime, and the runtime reads an adapter and a site config. :fact[d0sp1t]

### Write the site config and a minimal adapter

*Write the site config and the adapter, which come before the content: the admin and the content index both read a runtime built from them, and the adapter's concept names the directory the entry goes in.*

- The site config is a YAML mapping whose one required key, `siteName`, names the site. :fact[em69ru]
- In two sentences: the adapter declares one posts concept, a renderer, and placeholder backend and sender values, and the dev backend stands in for both until production. :fact[d0sp1t] :fact[dujlzg]
- `parseSiteConfig`, linked to its reference entry at its first mention, requires a non-empty `siteName` and rejects any top-level key outside a fixed set. No separate pointer sentence follows. :fact[em69ru]
- See [`parseSiteConfig`](../reference/core.md#parsesiteconfig).
- The site-config check in `cairn doctor` tries four paths, and `src/lib/site.config.yaml` is one of them. The sentence leaves out the scaffold's path. :fact[em69ru] :fact[m0ouh8]
- The nav editor, the **Settings** screen's save, and the **Tags** screen read and commit the site-config file that `editor.siteConfigPath` names, with the screen names in bold and `editor.siteConfigPath` linked at its first mention. :fact[shv6wv]
- See [`editor.siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member).
- It defaults to `src/theme/site.config.yaml`, the scaffold's path, so this site's adapter sets it to `src/lib/site.config.yaml`. :fact[shv6wv] :fact[em69ru]
- The adapter is built from the root barrel's helpers. `defineAdapter`, linked at its first mention, takes the concepts. Each concept comes from `defineConcept` with a `dir`, a `label`, a `singular`, a `routing`, and a `defineFieldset` of field descriptors. `defineRegistry` with no components gives an empty registry. `createRenderer` returns the `renderMarkdown` that `rendering.render` calls with the body and the three resolvers it forwards. The `email` group is a sender with a `from` address. `composeRuntime` waits for Compose the runtime and the admin. :fact[d0sp1t]
- See [`defineAdapter`](../reference/core.md#defineadapter).
- `createGithubApp` makes no network call and validates nothing, and the dev backend replaces the provider for every request it serves, so placeholder values serve until production. The page leaves out the request-path expression. :fact[dujlzg]
- The lead-in reads "To write both files, follow these steps:".

1. In `src/lib`, create `site.config.yaml` with `siteName: Field Notes` and a one-line `description`. :fact[em69ru]

- Code: the two-line site config.

```yaml
siteName: Field Notes
description: Notes from the field, published with cairn.
```

2. In `src/lib`, create `cairn.config.ts`, the adapter module, which exports the adapter as `cairn` beside the parsed `siteConfig`. :fact[fj28xs]

- Code: the file-location tree under `src/lib`, under a lead-in saying the files sit side by side.

```text
src/lib/
├── cairn.config.ts
└── site.config.yaml
```

- Code: `src/lib/cairn.config.ts`, importing from `@glw907/cairn-cms` and `./site.config.yaml?raw`. It takes `renderMarkdown` from `createRenderer(defineRegistry({ components: [] }))`. `defineAdapter` holds a `posts` concept (`dir: 'src/content/posts'`, `label`, `singular`, `routing: 'feed'`, and the fields `title` required, `date`, and `description`). A placeholder `createGithubApp` (`owner: 'your-account'`, `repo: 'field-notes'`, `branch: 'main'`, `appId: '0'`, `installationId: '0'`) sits under a comment that marks both placeholders. Then come `email: { from: 'cms@example.com' }`, `rendering.render` forwarding the body and the three resolvers, and `editor: { siteConfigPath: 'src/lib/site.config.yaml' }`. The file ends with `export const siteConfig = parseSiteConfig(siteYaml)`. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[d0sp1t]

```ts
import {
  createGithubApp,
  createRenderer,
  defineAdapter,
  defineConcept,
  defineFieldset,
  defineRegistry,
  fields,
  parseSiteConfig,
} from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      singular: 'post',
      routing: 'feed',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
  },
  // Placeholders: the dev backend stands in for the GitHub App and the sender until production.
  backend: createGithubApp({
    owner: 'your-account',
    repo: 'field-notes',
    branch: 'main',
    appId: '0',
    installationId: '0',
  }),
  email: { from: 'cms@example.com' },
  rendering: {
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
  },
  editor: { siteConfigPath: 'src/lib/site.config.yaml' },
});

export const siteConfig = parseSiteConfig(siteYaml);
```

- See [Define an adapter and schema](define-an-adapter-and-schema.md) for growing the adapter past this minimum.

### Add the first entry

*Put the posts concept's first entry on disk, since nothing can be indexed or rendered until it exists.*

- Content is markdown files with YAML frontmatter, one directory per concept, named by the concept's `dir`. :fact[gj96px]
- The entry's frontmatter carries `title`, `date`, and `description`, the fields the posts concept declares. The page leaves out the scaffold's seeded entries. :fact[gj96px] :fact[d0sp1t]
- The section's one step is a bullet under the lead-in "To add the entry, follow this step:": in `src/content/posts`, create `2026-08-14-first-light.md` with `title: First light`, a `date`, a `description`, and one line of markdown body. :fact[gj96px]
- Code: the file-location tree to `src/content/posts/2026-08-14-first-light.md`, under a lead-in saying the entry sits in the directory the posts concept names. :fact[gj96px]

```text
src/
├── content/
│   └── posts/
│       └── 2026-08-14-first-light.md
└── lib/
```

- Code: the entry, with the three frontmatter keys and one body sentence. :source[/templates/waymark/src/content/posts]

```md
---
title: First light
date: 2026-08-14
description: The first post on Field Notes.
---

The first entry, written by hand and committed with the site.
```

### Index the content and commit its manifest

*Build the site index the entry route reads and commit the manifest each build checks, both before the route.*

- The content module passes `createSiteIndexes`, linked at its first mention in this opening sentence, one literal `import.meta.glob` per concept. :fact[pdgkex]
- See [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes).
- In one sentence: Vite needs the pattern written at the call site, and `createSiteIndexes` throws at build time for a declared concept with no glob. :fact[pdgkex]
- As the first paragraph's last sentence: the module also exports `origin`, which holds the local dev origin until the production milestone changes it to the deployed origin. :fact[7bch04]
- A second paragraph opens on the plugin: the `cairnManifest` plugin, linked at its first mention, checks the committed manifest, at its default path `/src/content/.cairn/index.json`, against the markdown on every build. The define it supplies waits for Wire the dev backend. :fact[xluud1] :fact[fj28xs]
- See [`cairnManifest`](../reference/vite.md#cairnmanifest).
- In one sentence: its `configModule` option names the module that exports `cairn` and `siteConfig`, and its `content` option maps each concept id to that concept's glob. The page leaves out the other optional path. :fact[fj28xs]
- The lead-in reads "To index the content and commit the manifest, follow these steps:".

1. In `src/lib`, create `content.ts`, the content module, which passes the posts glob to `createSiteIndexes` and exports the site index and `origin`. :fact[pdgkex] :fact[7bch04]

- Code: the file-location tree under `src/lib`, under a lead-in saying the module sits beside the adapter module.

```text
src/lib/
├── cairn.config.ts
├── content.ts
└── site.config.yaml
```

- Code: `src/lib/content.ts`, with one eager `import.meta.glob('/src/content/posts/*.md', { query: '?raw', import: 'default' })`, `createSiteIndexes(cairn, siteConfig, { posts })` from `@glw907/cairn-cms/delivery`, `export const site`, and `export const origin = 'http://localhost:5173'` under a comment that production changes it. :source[/templates/waymark/src/chassis/content.ts] :fact[pdgkex] :fact[7bch04]

```ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const posts = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, { posts });

export const site = indexes.site;

// The production milestone changes this to the deployed origin.
export const origin = 'http://localhost:5173';
```

2. In `vite.config.ts`, add the `cairnManifest` plugin after `sveltekit()`, with `configModule` naming `/src/lib/cairn.config.ts` and `content` mapping `posts` to its glob. :fact[fj28xs] :fact[979v0a] :fact[87hc1y]

- Code: the whole `vite.config.ts` at this point: `sveltekit({ adapter: adapter() })` with the `compilerOptions` comment, `cairnManifest({ configModule: '/src/lib/cairn.config.ts', content: { posts: '/src/content/posts/*.md' } })`, and `ssr.noExternal` listing the engine alone. No define plugin. :source[/templates/waymark/vite.config.ts] :fact[fj28xs]

```ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as `sv create` wrote it.
      adapter: adapter(),
    }),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

3. In the project directory, write the manifest with `npx cairn-manifest`, which writes `src/content/.cairn/index.json` and, in the same run, `src/content/.cairn/site-facts.json`. :fact[z61ibp] :fact[yio35u] :fact[fj28xs]

- The command is linked to its CLI reference at its mention in the step. The same run writes `site-facts.json` beside the content manifest, so the commit step carries both files, and the build failure a stale copy causes waits for Resolve a content build failure. :fact[yio35u]
- See [`npx cairn-manifest`](../reference/cli-cairn-manifest.md).

4. In the project directory, commit every uncommitted file, the entry, its manifest, and `site-facts.json` included. :fact[yio35u]

- Code: the commands that stage and commit the content.

```sh
git add -A
git commit -m "Add the first post and its manifest"
```

### Render the entry

*Render the entry on a prerendered catch-all route, which gives the content milestone a check of its own and needs the content module Index the content and commit its manifest writes.*

- The entry route is a prerendered catch-all built on the engine's public routes loader. :fact[pkt8i6]
- In one sentence that links `createPublicRoutes` at its first mention: it returns `entryLoad`, which resolves one entry by request path and throws a 404 on a miss, and `entries`, which enumerates every routable entry for the prerenderer. :fact[pkt8i6]
- See [`createPublicRoutes`](../reference/delivery.md#createpublicroutes).
- The route imports the site's modules as `#lib/<file>.js`, through the `#lib/*` mapping in the `imports` field of the `package.json` that `sv create` wrote, because SvelteKit 3 throws on a `$lib` import. An existing app whose `package.json` lacks the mapping adds it. :fact[pgeeq3]
- The lead-in reads "To render the entry, follow these steps:".

1. In `src/routes/[...path]`, create `+page.server.ts`, which exports `prerender = true`, the loader's `entries`, and its `entryLoad` as `load`. :fact[pkt8i6]

- Code: the file-location tree showing `src/routes/[...path]/` beside the scaffold's `+page.svelte` and root `+layout.svelte`. :fact[ibis7z]

```text
src/routes/
├── [...path]/
│   └── +page.server.ts
├── +layout.svelte
└── +page.svelte
```

- Code: the route module, importing `cairn` and `siteConfig` from `#lib/cairn.config.js` and `origin` and `site` from `#lib/content.js`; `createPublicRoutes({ site, render: cairn.rendering.render, origin, siteName: siteConfig.siteName, description: siteConfig.description ?? '' })`; `prerender = true`; and `entries` and `load` typed from `./$types`. :source[/templates/waymark/src/routes/(site)/[...path]/+page.server.ts] :fact[pkt8i6]

```ts
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from '#lib/cairn.config.js';
import { origin, site } from '#lib/content.js';
import type { EntryGenerator, PageServerLoad } from './$types';

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin,
  siteName: siteConfig.siteName,
  description: siteConfig.description ?? '',
});

export const prerender = true;

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

2. In the same directory, create `+page.svelte`, and render the load's `html` inside an `<article>`.

- Code: the page component that renders the entry's HTML.

```svelte
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<article>{@html data.html}</article>
```

- See [Build the public routes](build-the-public-routes.md) for the other delivery routes.

### Verify the rendered entry

*End the milestone with a check the reader runs: a clean build and the post at its permalink.*

- The post renders at its default permalink, `/posts/first-light`, because every concept except `pages` takes `/<id>/:slug` and the default date prefix strips the filename's date stem. :fact[6ebew3]
- The lead-in reads "To confirm the milestone, follow these steps:".

1. In the project directory, build the site, and confirm that the build exits without an error.

- Code: the build command.

```sh
npm run build
```

2. In the project directory, start the dev server with `npm run dev`. :fact[f21bcz]
3. In a browser, open `http://localhost:5173/posts/first-light`, and confirm that the post's body renders.

- A paragraph after the steps says the entry renders as unstyled markup, because the site loads no style sheet yet, and names the one style sheet that carries the engine's public defaults, `@glw907/cairn-cms/cairn-public.css`. It leaves out the sheet's contents and build paths. :fact[c4nnu9]
- `tailwindcss` and `daisyui` are optional peers of the engine, so a site installs them only when its pages use them. :fact[26kuvx]
- See [Theme your public site](theme-your-public-site.md#theme-a-hand-built-site) for styling a hand-built site.
- See [the public CSS reference](../reference/public-css.md) for the defaults the sheet sets.

### Resolve a content build failure

*Diagnose the content wiring's failures after the verification steps they follow, separating the three that stop the build from the one that doesn't.*

- The content wiring has four common failures, and the first three stop the build. :fact[pdgkex] :fact[n0laoh] :fact[eqlssz]
- The plugin has two failure modes: drift is a hard build error, and a concept missing from the plugin's `content` option produces zero manifest rows with no error. The page leaves out the migration-tolerant normalization. :fact[n0laoh]
- The drift error is the stale-manifest message, which names `npx cairn-manifest`. :fact[fdtgh5]
- The page gives the failures as a bulleted list, each item stating the symptom, the cause, and the fix in turn, and the 404 as a paragraph after the list.

:::row
**Symptom.** The build throws that a concept has no glob passed. :fact[pdgkex]
**Cause.** A declared concept has no glob in the content module's `createSiteIndexes` call. :fact[pdgkex]
**Fix.** Pass that concept's literal glob in the content module. :fact[pdgkex]
:::

:::row
**Symptom.** The build stops with the stale-manifest message, which names `npx cairn-manifest`. :fact[fdtgh5]
**Cause.** The committed manifest has drifted from the markdown on disk. :fact[n0laoh]
**Fix.** Write the manifest again with `npx cairn-manifest`, and commit it. :fact[fdtgh5] :fact[n0laoh]
:::

:::row
**Symptom.** The build stops with an error that names `site-facts.json` and `npx cairn-manifest`. :fact[eqlssz] :fact[z61ibp]
**Cause.** The committed `site-facts.json` no longer matches the adapter. :fact[eqlssz]
**Fix.** Run `npx cairn-manifest`, which rewrites `site-facts.json`, and commit the result. :fact[z61ibp] :fact[yio35u]
:::

:::row
**Symptom.** The manifest that `cairn-manifest` writes holds no rows for a concept, and no error names it. :fact[n0laoh] :fact[fh6kod]
**Cause.** The concept is missing from the plugin's `content` option, which `cairn-manifest` reuses. :fact[n0laoh] :fact[fh6kod]
**Fix.** Add the concept's glob to that option. :fact[n0laoh]
:::

:::row
**Symptom.** The permalink answers 404. :fact[pkt8i6]
**Cause.** The requested path matches no routable entry. A path that keeps the date stem or leaves out the concept id is one example. :fact[6ebew3]
**Fix.** Open the entry at the permalink the rule in Verify the rendered entry gives. The page states the cause with its example and leaves the fix to that rule.
:::

### Add a second post

*Have the reader meet the drift failure on purpose, so the manifest step is practiced before the admin depends on it.*

- The section opens on its objective: this exercise shows the drift check at work, a second post failing the build until the manifest is written again. :fact[n0laoh]
- The answer sits in a collapsed `<details>` block whose summary reads "Show me the steps", as a numbered list.

1. In `src/content/posts`, create a second dated entry with a `title` in its frontmatter. :fact[gj96px]
2. In the project directory, build the site, and read the drift error that stops the build. :fact[n0laoh]
3. In the project directory, run `npx cairn-manifest`, and commit the manifest with the new post. :fact[z61ibp]
4. In a browser, open the new post's permalink on the dev server.

### Checklist before the admin

*Close the milestone with "I can" statements before the admin joins the site.*

- The lead-in reads "Before you continue, confirm that each of the following statements holds:", followed by the bulleted statements.
- I can place an entry in the directory its concept's `dir` names. :fact[gj96px]
- I can tell a manifest drift failure from a concept left out of the plugin's `content` option. :fact[n0laoh]
- I can open an entry at its permalink.

## Mount the admin on the dev backend

*Mount the admin over the runtime and content the previous milestone built, on the dev backend, since until production gives the Worker an auth database the admin can run only there.*

- The milestone opens: it mounts the admin at `/admin` and ends with you signed in to it on the dev backend, with no sign-in email, over the post in your working tree. :fact[dqjkci]
- A bulleted list of the milestone's objectives follows the lead-in "In this milestone, you do the following:": compose the runtime and the admin; mount the admin as one catch-all route and a layout; wire the dev backend; sign in. :fact[dqe7ij]
- The milestone starts from the site the previous milestone left, with one post and its manifest committed.
- Until the production milestone gives the Worker an auth database, the guard has nothing to sign anyone in against, so this milestone wires the dev backend before its check. :fact[jbt2hh]

### Compose the runtime and the admin

*Build the runtime and the admin factory, which the admin routes export from, so both come before the routes.*

- `composeRuntime` folds the adapter and the site config into the runtime, and `createCairnAdmin` turns that runtime into the `load`, `actions`, and `shellLoad` the admin routes export, each linked at its first mention. :fact[d0sp1t] :fact[dqe7ij]
- See [`composeRuntime`](../reference/core.md#composeruntime).
- See [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin).
- The admin and the delivery layers both read that runtime. :fact[d0sp1t]
- `createCairnAdmin` takes the runtime and an `auth` config with a `bootstrapOwner`, and a single-mount admin exports the three functions it returns. :fact[dqe7ij]
- While the dev backend is active, `bootstrapOwner` does nothing. In production it inserts the first real owner row when its email submits the sign-in request form, before any link is sent. The log event waits for Verify the production site. :fact[f2vudv]
- The section's one step is a bullet under the lead-in "To compose both, follow this step:": in `src/lib`, create `cairn.server.ts`, the server module, with your email and name in `bootstrapOwner`. :fact[dqe7ij]
- Code: the file-location tree under `src/lib`, under a lead-in saying the server module sits beside the adapter module.

```text
src/lib/
├── cairn.config.ts
├── cairn.server.ts
├── content.ts
└── site.config.yaml
```

- Code: `src/lib/cairn.server.ts`, with `export const runtime = composeRuntime({ adapter: cairn, siteConfig })` and `export const admin = createCairnAdmin({ runtime, auth: { bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' } } })`, importing from `./cairn.config.js`. :source[/templates/waymark/src/chassis/cairn.server.ts] :fact[d0sp1t] :fact[dqe7ij]

```ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

export const admin = createCairnAdmin({
  runtime,
  auth: { bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' } },
});
```

### Mount the admin routes

*Mount what Compose the runtime and the admin builds as a catch-all page and a layout, before the dev backend that serves them.*

- The admin mounts as one catch-all page under `src/routes/admin` and one shared layout, and the catch-all exports `prerender = false`. :fact[dqe7ij] :fact[exxsvk]
- A site that prerenders by default would otherwise bake a build-time snapshot of a session-gated page. :fact[exxsvk]
- `CairnAdmin` and `CairnAdminShell` import from `@glw907/cairn-cms/admin`. The page never names the removed subpath. :fact[jzb3d0]
- The page passes `CairnAdmin` the route's `data` and `form` and the adapter's `render`, and the layout renders `CairnAdminShell` over the layout load's `shell` data. :fact[dqe7ij]
- This site's adapter declares no sidebar layout, and Arrange the admin sidebar shows how to declare one.
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md#declare-the-layout).
- Code: the file-location tree of `src/routes/admin/` with `[...path]/+page.server.ts`, `[...path]/+page.svelte`, `+layout.server.ts`, and `+layout.svelte`, beside the root `src/routes/+layout.svelte`, under the lead-in "The admin adds four files under `src/routes/admin`:". No `+error.svelte`. :source[/templates/waymark/src/routes/admin] :fact[exxsvk]

```text
src/routes/
├── admin/
│   ├── [...path]/
│   │   ├── +page.server.ts
│   │   └── +page.svelte
│   ├── +layout.server.ts
│   └── +layout.svelte
├── [...path]/
├── +layout.svelte
└── +page.svelte
```

- The lead-in reads "To mount the admin, follow these steps:".

1. In `src/routes/admin/[...path]`, create `+page.server.ts`, which exports `prerender = false` and the admin's `load` and `actions` from `#lib/cairn.server.js`. :fact[exxsvk]

- Code: the catch-all's server module.

```ts
import { admin } from '#lib/cairn.server.js';

export const prerender = false;

export const load = admin.load;
export const actions = admin.actions;
```

2. In the same directory, create `+page.svelte`, and render `CairnAdmin` in it. :fact[dqe7ij] :fact[jzb3d0]

- Code: the page, with `CairnAdmin` from `@glw907/cairn-cms/admin`, `AdminData` from `@glw907/cairn-cms/sveltekit`, `cairn` from `#lib/cairn.config.js`, `ActionData` from `./$types`, and `<CairnAdmin {data} {form} render={cairn.rendering.render} />`. :source[/templates/waymark/src/routes/admin/[...path]/+page.svelte] :fact[dqe7ij] :fact[jzb3d0]

```svelte
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/admin';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '#lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} />
```

3. In `src/routes/admin`, create `+layout.server.ts`, and export the admin's `shellLoad` from it as `load`. :fact[dqe7ij]

- Code: the layout's server module.

```ts
import { admin } from '#lib/cairn.server.js';

export const load = admin.shellLoad;
```

4. In the same directory, create `+layout.svelte`, and render `CairnAdminShell` around the page. :fact[dqe7ij] :fact[jzb3d0]

- Code: the layout, with `CairnAdminShell` over `data.shell`, rendering `children`. It imports no style sheet, unlike the template, whose `.cairn/admin.css` import serves the scaffold's admin screens. :source[/templates/waymark/src/routes/admin/+layout.svelte] :fact[dqe7ij]

```svelte
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/admin';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```

- A paragraph after the steps: the root layout that `sv create` wrote, `src/routes/+layout.svelte`, sits above `src/routes/admin`, and SvelteKit renders the admin inside it. :fact[ibis7z] :fact[exxsvk]
- Visible chrome in that layout around `/admin`, such as a header, a footer, or a width cap, keeps the admin shell from filling the viewport. In development, the engine logs one console error for a width cap and leaves the layout as it is, never "changes nothing", which would read as contradicting the chrome's effect. An existing app with chrome in its root layout moves it as the linked reference shows. The page leaves out the function names. :fact[g7zuji]
- See [the admin routes reference](../reference/admin-routes.md#the-root-layout-must-be-chrome-free).

### Wire the dev backend

*Wire the hooks module, which needs the admin's runtime, the dev package, and the define the `cairnManifest` plugin supplies, all of which exist by this point.*

- The dev backend is `devBackendHandle` from `@glw907/cairn-cms-dev`. It replaces the GitHub backend, the auth database, and the media bucket with in-memory fakes, and it signs you in as an owner, so the admin runs before any credential exists. :fact[dqjkci]
- Its state lasts as long as the server process, so no save or publish leaves the machine. :fact[dqjkci]
- Its `content` option takes `'repository'` or `'fixtures'` and defaults to `'repository'`, which serves the site's content from the working tree. The page never names the removed option. :fact[p1v88s] :fact[cgt4tk]
- The `cairnManifest` plugin already in `vite.config.ts` defines `__CAIRN_DEV_BUILD__`, the flag the hooks module reads. The flag is `true` under `vite dev` and under a `VITE_CAIRN_E2E=1` build, and `false` in a default build. The site sets no define for the flag, because a site define would override the plugin's. :fact[xluud1]
- Under `vite dev`, the dev package also needs an entry in `ssr.noExternal`: it ships built JavaScript that imports `cloudflare:workers`, a scheme Node's loader rejects, and without the entry `/admin` answers 500. :fact[2pv4r5]
- The lead-in reads "To wire the dev backend, follow these steps:".

1. In the project directory, install `@glw907/cairn-cms-dev` and `@types/node` as development dependencies. :fact[4lcto0] :fact[9mx680]

- Code: the npm command that installs both packages.

```sh
npm install -D @glw907/cairn-cms-dev @types/node
```

- Inside the install step: on a fresh SvelteKit 3 scaffold, the hooks module's `process.env` read fails `svelte-check` until `@types/node` is installed and named, and because `$app/tsconfig` turns off automatic `@types` inclusion, the hooks module names it with a `/// <reference types="node" />` line. :fact[4lcto0]

2. In `vite.config.ts`, add `@glw907/cairn-cms-dev` to `ssr.noExternal` beside the engine. :fact[2pv4r5]

- Code: the final `vite.config.ts`: `sveltekit({ adapter: adapter() })` with the `compilerOptions` comment, the `cairnManifest` call from the content milestone, and `ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] }`. No define plugin. :source[/templates/waymark/vite.config.ts] :fact[2pv4r5]

```ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as `sv create` wrote it.
      adapter: adapter(),
    }),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] },
});
```

3. In `src`, create `hooks.server.ts` beside `app.d.ts`. :fact[f21bcz] :fact[vvgpr5]

- Code: the file-location tree adding `src/hooks.server.ts` beside `src/app.d.ts`.

```text
src/
├── lib/
├── routes/
├── app.d.ts
└── hooks.server.ts
```

- Code: the hooks module, with `/// <reference types="node" />`, `Handle` from `@sveltejs/kit/hooks`, `createAuthGuard` from `@glw907/cairn-cms/sveltekit`, and `runtime` from `#lib/cairn.server.js`. `if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1')` dynamically imports `devBackendHandle` and sets `handle = devBackendHandle({ runtime })`, else `handle = createAuthGuard({ runtime })`, then `export { handle }`. No `content` option. :source[/templates/waymark/src/hooks.server.ts] :fact[f21bcz]

```ts
/// <reference types="node" />
import type { Handle } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#lib/cairn.server.js';

let handle: Handle;
if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle({ runtime });
} else {
  handle = createAuthGuard({ runtime });
}

export { handle };
```

- Opening the paragraph after the hooks code: the opt-in reads `process.env` because `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. The paragraph never restates the code's `if`, its two reads, or the handle it exports, and it leaves out the Worker-env read that the scaffold's helper adds, the scaffold's paths, and its `dev-gate` helper. :fact[f21bcz]
- In the same paragraph: every call site names `__CAIRN_DEV_BUILD__` directly, never through a shared exported constant, because Vite folds the define only in the module that names it, and an imported constant survives the fold and ships the dev-backend import in the deployed Worker. :fact[72mctx]
- The module imports `devBackendHandle` dynamically inside the gated branch, so a default build never carries it. :fact[eiaqkh]
- In one sentence that links `createAuthGuard` at its first mention: `createAuthGuard` and `devBackendHandle` both require `runtime`, so one declaration serves both, and a call that passes none is a type error. The page leaves out the earlier versions. :fact[4xrx5f] :fact[7cv105]
- See [`createAuthGuard`](../reference/sveltekit.md#createauthguard).
- A pointer sentence sends a reader who wants the difference between the guard and per-route authorization to the admin routes reference.
- See [the admin routes reference](../reference/admin-routes.md#the-guard-and-the-ambient-type).
- A bulleted list, with no fence figure, follows the lead-in "The dev package must never reach a deployed site, and three layers keep it out:". Each item ties a layer to where this page meets it. The layers are the build-time flag that the hooks code names, the `devDependency` boundary that the install step set, and the runtime tripwire that the guard enforces. :fact[9mx680]
- See [Security model](security-model.md#the-dev-backend-flags-two-refusals) for the flag's two refusals.
- In one sentence: `@glw907/cairn-cms/ambient`, already imported in `src/app.d.ts`, declares `__CAIRN_DEV_BUILD__` as a boolean global, so the site needs no declaration. :fact[n52h8f]
- In `'repository'` mode nothing is written to disk. An edit lives in an in-memory overlay that wins until the dev server restarts, and the admin's list reads the manifest on disk until a dev publish commits an overlay copy. The page leaves out branches and tombstones. :fact[cgt4tk]
- The `'repository'` mode throws under workerd, so a site that runs the dev backend under `wrangler dev` passes `content: 'fixtures'`. This tutorial runs the dev backend under `vite dev` only. :fact[2fqe3l]
- In a paragraph on the `createAuthGuard` branch the hooks code shows, stated of this site's config: SvelteKit's default Origin check runs ahead of every handle, `/admin` included, because the site's kit config sets no `csrf` key, and the guard adds a double-submit token on top. :fact[7rehzh]
- Under `vite dev`, SvelteKit skips the Origin check, named as the Origin check, never a bare "the check". The paragraph leaves out the `csrf.checkOrigin` removal, which Deploy a bare SvelteKit site places for an existing app, so it gives no circular reason for the missing `csrf` key. :fact[3cekcy]
- See [Security model](security-model.md#csrf-protection) for the CSRF design.

### Verify the dev sign-in

*End the milestone with a check the reader runs, `/admin` opening signed in over the post, with the failure rows after the steps they diagnose.*

- With `CAIRN_DEV_BACKEND` set to `1`, the dev server opens `/admin` signed in as an owner, listing the post from your working tree. :fact[dqjkci] :fact[f21bcz]
- The lead-in reads "To confirm the milestone, follow these steps:".

1. In the project directory, start the dev server with `CAIRN_DEV_BACKEND` set to `1`, using the form for your shell. :fact[e8dr5r] :fact[f21bcz]

- The step nests a bulleted list of the shell forms: `CAIRN_DEV_BACKEND=1 npm run dev` in a POSIX shell, `set "CAIRN_DEV_BACKEND=1" && npm run dev` in `cmd.exe`, and `$env:CAIRN_DEV_BACKEND=1; npm run dev` in PowerShell. One sentence follows: the quotes in the `cmd.exe` form keep a trailing space out of the value that the `=== '1'` test reads. :fact[e8dr5r]

2. In a browser, open `/admin` on the dev server, and confirm that the admin opens signed in as an owner and lists First light. :fact[dqjkci]

- The admin also shows the in-memory notice, one persistent alert that reads "Edits are held in memory. They're discarded when the dev server stops." The page leaves out how the shell derives it. :fact[7qwrb9]

:::row
**Symptom.** `/admin` doesn't open signed in.
**Cause.** The hooks module took the guard branch. :fact[f21bcz]
**Fix.** Work through the ordered checks below.
:::

- The page states the row in one lead-in, "If the admin doesn't open signed in, the hooks module took the guard branch. Check the following in order:", followed by a numbered list of checks.

1. The dev server started with `CAIRN_DEV_BACKEND` set to `1` in your shell's form. :fact[e8dr5r] :fact[f21bcz]
2. The hooks module names `__CAIRN_DEV_BUILD__` itself, with no imported constant in its place. :fact[72mctx]
3. `vite.config.ts` still lists the `cairnManifest` plugin, which defines the flag. :fact[xluud1]

:::row
**Symptom.** `/admin` answers 500 under `vite dev`.
**Cause.** `@glw907/cairn-cms-dev` is missing from `ssr.noExternal`. :fact[2pv4r5]
**Fix.** Add the dev package to `ssr.noExternal` beside the engine, as Wire the dev backend shows. The page states this row as one sentence, symptom and cause.
:::

- See [Debug your site](debug-your-site.md) for other failures.

### Edit the post in memory

*Show where a dev-backend edit lives, in memory and never on disk, before production makes edits real, as the milestone's try-it-yourself prompt.*

- The section opens on its objective: this exercise shows where a dev-backend edit lives.
- The sentence after the opening, outside the disclosure: the admin shows the edit while the file on disk stays unchanged, and a restart of the dev server discards it. The disclosure holds no explanation. :fact[cgt4tk]
- The answer sits in a collapsed `<details>` block whose summary reads "Show me the steps", as a numbered list.

1. In the admin, open First light, change a line, and save.
2. In `src/content/posts`, open the entry file, and confirm that it is unchanged. :fact[gj96px]
3. In the terminal, restart the dev server with `CAIRN_DEV_BACKEND` set to `1`. :fact[e8dr5r] :fact[f21bcz]
4. In the admin, reopen First light, and confirm that the edit is gone. :fact[cgt4tk]

### Checklist before production

*Close the milestone with "I can" statements before the site moves to production.*

- The lead-in reads "Before you continue, confirm that each of the following statements holds:", followed by the bulleted statements.
- I can sign in at `/admin` on the dev backend with no sign-in email. :fact[dqjkci]
- I can trace the runtime from the adapter through `composeRuntime` to the admin and both handles. :fact[d0sp1t] :fact[7cv105]
- I can say why every call site names `__CAIRN_DEV_BUILD__` directly. :fact[72mctx]
- I can say where an edit made on the dev backend lives.

## Move the site to production

*Replace each fake the dev backend supplied, as the last milestone, with its sections in the order their outputs are consumed.*

- The milestone opens: it replaces the dev backend's fakes with a GitHub App you register, a D1 auth database, and the Worker's bindings and secret, and it ends with an edit published from the deployed admin to the public page. :fact[7bch04] :fact[e5vm42]
- A bulleted list of the milestone's objectives follows the lead-in "In this milestone, you do the following:". The objectives are to push the site to GitHub and to confirm that a production build refuses the admin without its bindings. Then the reader registers a GitHub App, stores its credentials, and creates and migrates the auth database. Last, the reader adds the Email Sending binding on a domain they control, publishes an edit, and follows it to the deployed page. :fact[jbt2hh]
- The milestone starts from the dev-backend site in its local repository.
- A bulleted list names three edits to files the site already has, framed as standing beside the App, the secret, and the database the sections create. The adapter's `backend` and `email` take real values. `wrangler.jsonc` gains the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries. The `origin` constant in the content module names the deployed origin. :fact[7bch04]
- The App's private key lives in a Worker secret, `GITHUB_APP_PRIVATE_KEY_B64`, which `wrangler.jsonc` never lists. With its condition first: on a production build `__CAIRN_DEV_BUILD__` is `false`, and the build drops the dev-backend branch, so `hooks.server.ts` stays as it is. :fact[7bch04]
- In two sentences, the order the values arrive in: the bindings come last, and each section edits a file only once the value it needs exists. :fact[e5vm42]

### Push the site to GitHub

*Put the site's repository on GitHub before the App, which is installed on the account that owns that repository and covers it.*

- The GitHub App you register next is installed on the account that owns the site's repository and covers that repository, so the repository exists on GitHub first. :fact[rp65d2]
- A cairn site needs one installation, and the adapter names its repository as `owner` and `repo`. The registration form's choices wait for the next section. :fact[rp65d2]
- An app already on GitHub skips this section and uses that repository and its default branch in the adapter's GitHub App config. :fact[0w7jar]
- The lead-in reads "To push the site, follow these steps:".

1. In the project directory, commit every uncommitted file, so the push carries the admin routes, the hooks module, and the dev-backend wiring.

- Code: the commands that stage and commit the admin work.

```sh
git add -A
git commit -m "Mount the admin on the dev backend"
```

2. On GitHub, create an empty repository named `field-notes` with no starter files, following GitHub's Creating a new repository guide.

- See [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

3. In the project directory, add the repository as the `origin` remote, and push the `main` branch.

- Code: the commands that add the remote and push.

```sh
git remote add origin https://github.com/your-account/field-notes.git
git push -u origin main
```

- After the code, the step tells the reader to replace `your-account` in the remote URL with their GitHub username.

4. On GitHub, confirm that the repository lists the post under `src/content/posts` and the manifest at `src/content/.cairn/index.json`. :fact[gj96px] :fact[fj28xs]

### Deploy the production build and read the refusal

*Deploy before the App, the database, and the bindings exist, so the reader sees the failure the remaining sections remove.*

- A production build with no dev backend and no `AUTH_DB` binding runs the real guard, which answers every `/admin` path with a branded 500 page headed **Wrangler bindings are missing**. :fact[jbt2hh]
- The sign-in path gets the same page instead of a form that could never succeed, and the page names the `EMAIL` and `AUTH_DB` bindings to declare. :fact[jbt2hh]
- A bulleted list under the lead-in "The engine reads the following values from the Worker env:" names four values. They are `AUTH_DB`, the D1 database binding, and `EMAIL`, the Email Sending binding. Then come `PUBLIC_ORIGIN`, the canonical origin for sign-in links, and `GITHUB_APP_PRIVATE_KEY_B64`, the GitHub App's private key. :fact[ntdafg]
- A missing `AUTH_DB` throws nothing at the guard: the guard logs `guard.refused` and returns the branded 500 page for the condition `config.bindings-missing` itself. The page leaves out the `requireDb` throw, and the `PUBLIC_ORIGIN` throw waits for Add the Email Sending binding and name the origin. :fact[ntdafg]
- This deploy is the first to carry the admin, and it needs the Workers Paid plan. :fact[75hawi]
- The lead-in reads "To see the refusal, follow these steps:".

1. In the project directory, build the site and deploy it.

- Code: the build command and the deploy command.

```sh
npm run build
npx wrangler deploy
```

2. In a browser, open `/admin` at the deployed address, and confirm that the page shows the heading **Wrangler bindings are missing**. :fact[jbt2hh]

### Register the GitHub App

*Register and install the App, which yields the App ID, the installation ID, and the private key that Store the App's credentials consumes, so it comes first of the three things production creates.*

- Each site registers a GitHub App, with one repository permission, **Contents** at **Read and write**, and no webhook. :fact[gyu7jc] :fact[vgw8x9]
- The engine ships no App and no shared credential, and it never receives a webhook. :fact[gyu7jc] :fact[vgw8x9]
- The lead-in reads "To register and install the App, follow these steps:".

1. On GitHub, open the App registration form, following GitHub's Registering a GitHub App guide.

- See [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app).

2. In the form, enter any name and homepage URL.

- Inside the step: the engine reads neither, so both are cosmetic. :fact[9yi7fu]

3. In the form, turn the webhook off. :fact[vgw8x9]
4. In the form, grant the repository permission **Contents** at **Read and write**, and grant no other permission. :fact[vgw8x9]
5. In the form, allow installation on the account that owns the site's repository. :fact[rp65d2]

- Inside the step: the form's other choice, installation on any account, isn't needed. :fact[rp65d2]

6. In the form, create the App.
7. On the App's settings page, note the App ID. :fact[02g94x]
8. On the same page, generate a private key, and download its `.pem` file, following GitHub's Managing private keys for GitHub Apps guide. :fact[02g94x]

- See [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps).

9. On the same page, install the App on the account that owns the repository, following GitHub's Installing your own GitHub App guide. :fact[rp65d2]

- See [Installing your own GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app).

10. In the installation form, grant the App access to the site's repository only, not to all repositories. :fact[rp65d2]
11. In the browser's address bar, note the trailing number of the installation settings URL that GitHub opens after the install. :fact[nbnq9c]

- Inside the step: the URL has the form `https://github.com/settings/installations/<installation_id>`, and the number is the installation ID. :fact[nbnq9c]
- A paragraph after the steps, applied to the repository this tutorial builds: the installation token can write any path in the repository, and only engine code confines writes to the declared content directories. This tutorial's repository also holds the site's code, which therefore sits inside the token's write reach. :fact[l5gx1t]
- See [Security model](security-model.md#the-github-apps-reach) for the App's reach.
- See [limits of the installation token](security-model.md#limits-of-the-installation-token) for the same property stated from the token's side.

### Store the App's credentials

*Put the App's identifiers in the adapter and its private key in a Worker secret, which needs only the registered App and nothing the database or the bindings produce.*

- The App ID and installation ID identify the App and grant nothing, so they pass directly into `createGithubApp` in the adapter source. :fact[zcwf5i]
- The private key lives only as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`, because the `.pem` file is the credential that signs the App's requests for installation tokens, so it stays out of the repository. :fact[7dtrwy]
- The lead-in reads "To store the credentials, follow these steps:".

1. In the adapter module, set `owner` to your GitHub account, and set `appId` and `installationId` to the values you noted. :fact[0w7jar]

- Code: the adapter's `backend` member alone, labeled as one member of the object the content milestone shows whole, with your values in place of these: `createGithubApp({ owner: 'your-account', repo: 'field-notes', branch: 'main', appId: '123456', installationId: '7890123' })`. A snippet-check skip comment sits above it. :source[/templates/waymark/src/theme/cairn.config.ts#createGithubApp] :fact[0w7jar]

<!-- snippet-check-skip: one member of the adapter object that the content milestone shows whole -->
```ts
  backend: createGithubApp({
    owner: 'your-account',
    repo: 'field-notes',
    branch: 'main',
    appId: '123456',
    installationId: '7890123',
  }),
```

- `createGithubApp`, linked at its first mention: its types require all five strings, and `branch` is the repository's default branch. This is a type requirement, since Write the site config and a minimal adapter already says `createGithubApp` validates nothing at runtime. The page leaves out the scaffold. :fact[0w7jar]
- See [`createGithubApp`](../reference/core.md#creategithubapp).

2. In the project directory, encode the downloaded key onto one line, and pipe it into Wrangler's secret command, replacing the filename with your key's path.

- Code: the command that encodes the key and stores it as the secret. :fact[vpieos]

```sh
base64 < your-app.private-key.pem | tr -d '\n' | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
```

- The engine expects the secret to hold the PEM's contents base64-encoded onto one line, and it decodes the secret with `atob()` before signing. :fact[vpieos]

3. In a terminal, move the `.pem` file to a directory outside every repository, so git never tracks it. :fact[7dtrwy]

- See [Rotate the GitHub App key](rotate-the-github-app-key.md) to replace the key later.
- The section hands off in one line: a deploy at this point still shows the refusal page, because the auth database doesn't exist yet. :fact[jbt2hh]

### Create the auth database

*Create and migrate the auth database, whose create output carries the id the `AUTH_DB` entry needs, before the bindings that need it.*

- The engine keeps its editors, sign-in tokens, and sessions in the D1 database bound as `AUTH_DB`, and every site applies two of the five migrations the package ships, named once here: `0000_auth.sql` and `0004_login_nonce.sql`. :fact[gffvfd] :fact[hft8s8]
- `0000_auth.sql` creates the three tables behind those records. The page leaves out the other table details. :fact[gffvfd]
- The nonce column from `0004_login_nonce.sql` binds a sign-in token to the browser that requested it. The missing-column error waits for Resolve a production failure. :fact[hft8s8]
- The package ships its migrations under `migrations/`, and a site copies the ones it needs into its `migrations_dir`. :fact[xxtooz]
- The lead-in reads "To create and migrate the database, follow these steps:".

1. In the project directory, create the database, and note the database id in its output. :fact[e5vm42]

- Code: the command that creates the database.

```sh
npx wrangler d1 create field-notes-auth
```

2. In the project directory, copy `0000_auth.sql` and `0004_login_nonce.sql` from the package into a new `migrations` directory. :fact[hft8s8] :fact[xxtooz]

- Code: the commands that make the directory and copy the two migrations from `node_modules/@glw907/cairn-cms/migrations/`. :fact[xxtooz]

```sh
mkdir migrations
cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/
```

3. In `wrangler.jsonc`, add a top-level `d1_databases` entry that binds the database as `AUTH_DB`, with the id from the create output and its `migrations_dir` set to `migrations`. :fact[jbt2hh] :fact[7bch04] :fact[xxtooz]

- Code: the `d1_databases` entry.

```jsonc
"d1_databases": [
  {
    "binding": "AUTH_DB",
    "database_name": "field-notes-auth",
    "database_id": "<the id from the create output>",
    "migrations_dir": "migrations"
  }
]
```

4. In the project directory, apply the migrations to the remote database.

- Code: the apply command with `--remote`. :fact[xxtooz]

```sh
npx wrangler d1 migrations apply field-notes-auth --remote
```

- A paragraph after the steps says the other migrations are opt-in: `0001_roles.sql` serves a role vocabulary beyond owner and editor, and `0003_preview.sql` serves draft-preview links. It leaves out the scaffold history and the rebuild detail. :fact[rn62i1]
- See [Build the public routes](build-the-public-routes.md#mount-the-draft-preview-route) for mounting the draft-preview route.
- `0002_audit.sql` is optional, and the `createD1AuditSink` entry, linked at its first mention, recommends applying it on a separate D1 database, bound with its own `migrations_dir`, which keeps audit writes from contending with session and token lookups. The sentence never says "never contend" and never uses the passive "is recommended". :fact[pkrwom]
- See [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink).

### Add the Email Sending binding and name the origin

*Add the bindings, which consume the database id and come last of the production edits, and name the origin before the production build in Verify the production site.*

- Sign-in mail leaves through the `EMAIL` binding on a domain you control, and that domain also supplies the sender address and the origin the site names in two places. :fact[xhwl32]
- The binding needs the domain's zone onboarded for Email Sending, and a `workers.dev` subdomain has no zone to onboard, so the production site runs on the onboarded domain. :fact[xhwl32]
- `PUBLIC_ORIGIN` is the canonical origin for sign-in links, and an unset or invalid value throws `config.public-origin-invalid`. :fact[ntdafg]
- The lead-in reads "To add the binding and name the origin, follow these steps:".

1. In the project directory, onboard the domain for Email Sending, following Cloudflare's Email Sending domains page.

- See [Email Sending domains](https://developers.cloudflare.com/email-service/configuration/domains/).
- Code: the onboarding command. :fact[xhwl32]

```sh
npx wrangler email sending enable notes.example.com
```

2. In `wrangler.jsonc`, add the `routes` entry, the `EMAIL` binding, `PUBLIC_ORIGIN` as a variable, and `observability` beside the `AUTH_DB` entry. :fact[thgmpz] :fact[xhwl32] :fact[ntdafg] :fact[txgoyy]

- Inside the step: the `routes` entry declares the domain as a Custom Domain, which the next deploy creates with its DNS record and certificate. :fact[thgmpz]
- Inside the step: with `observability.enabled` unset, the log records go nowhere, and `cairn doctor` raises a warning for it. The page leaves out the condition's id. :fact[txgoyy]
- Code: the whole tutorial `wrangler.jsonc`: the four keys from the first milestone, `routes` with `notes.example.com` as a custom domain, `send_email` with `EMAIL`, the `AUTH_DB` `d1_databases` entry, `vars` with `PUBLIC_ORIGIN` set to `https://notes.example.com`, and `observability: { enabled: true }`. No `r2_buckets` and no `dev` block. :source[/templates/waymark/wrangler.jsonc] :fact[thgmpz] :fact[xhwl32] :fact[ntdafg] :fact[txgoyy]

```jsonc
{
  "name": "field-notes",
  "compatibility_date": "2026-08-21",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "assets": {
    "directory": ".svelte-kit/cloudflare",
    "binding": "ASSETS"
  },
  "routes": [{ "pattern": "notes.example.com", "custom_domain": true }],
  "send_email": [{ "name": "EMAIL" }],
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "field-notes-auth",
      "database_id": "<the id from the create output>",
      "migrations_dir": "migrations"
    }
  ],
  "vars": {
    "PUBLIC_ORIGIN": "https://notes.example.com"
  },
  "observability": { "enabled": true }
}
```

3. In the adapter module, set the `email` group's `from` to an address on the domain. :fact[d0sp1t] :fact[2gtftn]
4. In the content module, set `origin` to the same value as `PUBLIC_ORIGIN`. :fact[7bch04] :fact[ntdafg]

- A prerendered route writes `origin` into the build output, so the content module names the deployed origin before the production build.
- See [The custom sender contract](#the-custom-sender-contract) to send mail some other way.

### Verify the production site

*End the milestone with a check the reader runs: `cairn doctor` confirms the bindings, and a publish carried to the deployed page confirms the App, which no command checks.*

- No command checks the GitHub App, so this section verifies it with a real publish whose commit lands on `main`. :fact[m0ouh8]
- In one sentence that links `cairn doctor` to its checks table at its first mention: run with no flags from the site's directory, it verifies the bindings, and its `config.bindings` check confirms that `AUTH_DB` and `EMAIL` are both wired. :fact[m0ouh8]
- See [`cairn doctor`](../reference/cli-cairn-doctor.md#the-checks).
- The entry route is prerendered, so a published edit reaches the deployed page only after the next build and deploy.
- The first lead-in reads "To check the bindings and deploy the production build, follow these steps:".

1. In the project directory, run `cairn doctor` with no flags, and confirm that the `config.bindings` check passes. :fact[m0ouh8]
2. In the project directory, commit every uncommitted file, and push the `main` branch, so the pull after the publish is a fast-forward.

- Code: the commands that commit the production edits and push.

```sh
git add -A
git commit -m "Move Field Notes to production"
git push
```

3. In the project directory, build the site and deploy it.

- Code: the build command and the deploy command.

```sh
npm run build
npx wrangler deploy
```

- The second lead-in reads "To publish an edit and confirm it on the deployed page, follow these steps:".

1. On the deployed origin, request a sign-in to the admin with the `bootstrapOwner` email. :fact[f2vudv]

- Inside the step: with the allowlist empty, that request inserts the owner row and logs `editor.bootstrapped` before the link is sent, with the event name linked to the log events reference. The page leaves out the restatement that the row exists before the link is opened. :fact[f2vudv]
- See [`editor.bootstrapped`](../reference/log-events.md).

2. In your mail client, open the sign-in link.
3. In the admin, open First light, change a line, and publish the edit.
4. On GitHub, confirm that the commit lands on `main` of the site's repository, with you as its author and the App's bot as its committer. :fact[5f4kmk] :fact[m0ouh8]

- Inside the step: the engine sets the signed-in editor as the author and omits the committer, so GitHub records the App's bot identity. The page leaves out the scaffold's App name. :fact[5f4kmk]

5. In the project directory, pull the published commit.

- Code: the pull command.

```sh
git pull
```

6. In the project directory, build the site and deploy it again.
7. On the deployed origin, open the post's permalink, and confirm that the post shows the edit.

### Resolve a production failure

*Diagnose the production failures after the verification steps they follow, each pointing at a setting this milestone made.*

- The section opens: each of the following failures points at a setting this milestone made.
- The page gives each row as one bulleted item: the symptom and its cause joined by "because", then the fix.

:::row
**Symptom.** The `config.bindings` check fails. :fact[m0ouh8]
**Cause.** `wrangler.jsonc` lacks the `AUTH_DB` or `EMAIL` entry. :fact[m0ouh8] :fact[7bch04]
**Fix.** Declare both entries as the database and Email Sending sections show, then deploy again. :fact[m0ouh8]
:::

:::row
**Symptom.** `/admin` on the deployed site still shows **Wrangler bindings are missing**. :fact[jbt2hh]
**Cause.** The deployed build has no `AUTH_DB` binding. :fact[jbt2hh]
**Fix.** Declare the entry as the database section shows, then deploy again. :fact[jbt2hh]
:::

:::row
**Symptom.** The site throws `config.public-origin-invalid`. :fact[ntdafg]
**Cause.** `PUBLIC_ORIGIN` is unset or invalid. :fact[ntdafg]
**Fix.** Set `PUBLIC_ORIGIN` under `vars` in `wrangler.jsonc` to the deployed `https` origin. :fact[by1dv5] :fact[7bch04]
:::

:::row
**Symptom.** The sign-in email never arrives. :fact[xhwl32]
**Cause.** The domain isn't onboarded for Email Sending. :fact[xhwl32]
**Fix.** Onboard the domain in the `PUBLIC_ORIGIN` zone with `npx wrangler email sending enable`. :fact[xhwl32]
:::

:::row
**Symptom.** A store error names the missing column and `0004_login_nonce.sql`. :fact[hft8s8]
**Cause.** The auth database lacks that migration. :fact[hft8s8]
**Fix.** Copy `0004_login_nonce.sql` into `migrations`, and apply the migrations again with `--remote`. :fact[hft8s8] :fact[xxtooz]
:::

:::row
**Symptom.** The publish fails. :fact[vgw8x9]
**Cause.** The App lacks **Contents** at **Read and write**, isn't installed on the site's repository, or the Worker has no `GITHUB_APP_PRIVATE_KEY_B64` secret, and an unset secret raises the `github.app-unreachable` condition. The page never mentions the retired doctor or its check. :fact[vgw8x9] :fact[rp65d2] :fact[pg2smj]
**Fix.** Check the App's permission and installation on GitHub. If the Worker lacks the secret, set it again as [Store the App's credentials](#store-the-apps-credentials) shows. :fact[vgw8x9] :fact[rp65d2] :fact[pg2smj] :fact[7dtrwy]
:::

- See [Debug your site](debug-your-site.md) for a failure not listed here.

### Apply an opt-in migration locally

*Practice the migration step on an opt-in migration against the local database, so the deployed site stays as it is, as the milestone's try-it-yourself prompt.*

- The section opens on its objective: this exercise applies `0003_preview.sql` to the local development database beside the two migrations every site applies, and the apply output lists it. :fact[rn62i1] :fact[hft8s8]
- The apply command's `--local` form, which backs the exercise, leaves the deployed site as it is. :fact[xxtooz]
- The answer sits in a collapsed `<details>` block whose summary reads "Show me the steps", as a numbered list.

1. In the project directory, copy `0003_preview.sql` from the package's `migrations` directory into `migrations`. :fact[gffvfd] :fact[xxtooz]
2. In the project directory, apply the migrations with `--local` in place of `--remote`. :fact[xxtooz]
3. In the output, confirm that `0003_preview.sql` is among the applied migrations. :fact[gffvfd]
4. Unless the site mints draft-preview links, delete the copied file from `migrations`. :fact[rn62i1] :fact[xxtooz]

### Checklist for production

*Close the last milestone with "I can" statements before the page turns to customizing the working site.*

- The lead-in reads "Before you finish, confirm that each of the following statements holds:", followed by the bulleted statements.
- I can register a GitHub App with one repository permission and no webhook. :fact[vgw8x9]
- I can store the App's private key as a single-line base64 Worker secret. :fact[vpieos]
- I can apply the two migrations every site needs to the auth database. :fact[hft8s8]
- I can read a passing `config.bindings` check from `cairn doctor`. :fact[m0ouh8]
- I can carry a published edit to the deployed page with a build and deploy.

## Customize the sign-in email

*Change the email the engine sends, as a closing section rather than a milestone, because it changes a working site rather than building one.*

- The engine writes the sign-in email, and a site that keeps its defaults needs nothing from this section. :fact[2gtftn]
- The subject reads "Sign in to" followed by the site name, and the body carries the fixed sentence "The link expires in 10 minutes." Both are engine copy. The site name comes from the site config, and the sender comes from the adapter's `email` group. :fact[2gtftn]
- A bulleted list under the lead-in "A site changes the email in one of two ways:" gives the routes, each item linking its section by name. A supplied `auth.branding` overrides the members it names, as Rebrand the email shows. A custom `auth.send` makes any other change, as The custom sender contract describes. No sentence points at the next sections by position. :fact[2gtftn]
- See [Rebrand the email](#rebrand-the-email).
- See [The custom sender contract](#the-custom-sender-contract).

### Rebrand the email

*Override the sender's branding with a config value, the route for the three members it names, which needs no code beyond that value and so comes first.*

- Through `createCairnAdmin`, linked at its first mention, `auth.branding` is a partial of three members, `siteName`, `from`, and `replyTo`. :fact[v72g9z] :fact[2gtftn]
- In one sentence after the opening: it overrides each member it names and leaves the rest at the site config's name and the adapter's sender. The page leaves out `createAuthRoutes`. :fact[2gtftn] :fact[v72g9z]
- See [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin).
- The section's one step is a bullet under the lead-in "To rebrand the email, follow this step:": in the server module, pass `branding` with a `replyTo` address in the admin's `auth` config. :fact[v72g9z]
- Code: `src/lib/cairn.server.ts` as the previous milestone wrote it, with `branding: { replyTo: 'editor@notes.example.com' }` added beside `bootstrapOwner`, so the example shows a partial override that keeps the adapter's `from`. :source[/templates/waymark/src/chassis/cairn.server.ts] :fact[v72g9z]

```ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

export const admin = createCairnAdmin({
  runtime,
  auth: {
    bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' },
    branding: { replyTo: 'editor@notes.example.com' },
  },
});
```

- The override names only `replyTo`, so the email keeps the adapter's `from`. :fact[v72g9z]

### The custom sender contract

*State what a custom sender receives and must not do, for any change branding can't make, after branding. The section holds no steps, so its heading is a noun phrase.*

- A custom `auth.send` is a `SendMagicLink` that replaces the Cloudflare sender and receives the same built message, with `SendMagicLink` linked to the SvelteKit reference's types section at its first mention, in this opening sentence. :fact[lbetsq]
- See [`SendMagicLink`](../reference/sveltekit.md#types).
- `SendMagicLink` is exported from the `/sveltekit` subpath. :fact[lbetsq]
- The message carries `to`, `from`, `subject`, `html`, and `text`, plus the optional `cc`, `bcc`, `replyTo`, and `attachments`, and its `replyTo` takes one address. :fact[1b54g7]
- The text of anything a sender throws reaches the log scrubbed of token values and truncated, so a thrown message must never embed the message body or the sign-in link. :fact[1b54g7]
- One short sentence says this tutorial keeps the Cloudflare sender, and no closing pointer sentence repeats the types link. :fact[lbetsq]

### Verify the sign-in email

*Check the branding change in the next email the deployed site sends, after both routes' sections.*

- The branding change shows in the next sign-in email the deployed site sends.
- The lead-in reads "To confirm the change, follow these steps:".

1. In the project directory, build the site and deploy it.
2. On the deployed origin, request a sign-in to the admin, and confirm that the email carries the values the site set.

:::row
**Symptom.** The email doesn't arrive. :fact[xhwl32]
**Cause.** The domain isn't onboarded for Email Sending. The page leaves this cause inside its fix sentence. :fact[xhwl32]
**Fix.** Onboard the domain in the `PUBLIC_ORIGIN` zone with `npx wrangler email sending enable`, as [Resolve a production failure](#resolve-a-production-failure) describes. :fact[xhwl32]
:::

## Summary

*Sum up what the reader now knows, in different words from the overview's objectives, as the tutorial anatomy requires.*

- The section opens: you added cairn to a SvelteKit app by hand, from the kit config to a GitHub App that commits your editors' work. :fact[5f4kmk]
- Two paragraphs follow. The first says the engine compiles as part of the site and reads one runtime that `composeRuntime` builds from the adapter and the site config. :fact[d0sp1t]
- Every build checks the committed manifest against the markdown on disk. :fact[n0laoh]
- The dev backend works on the site's content in memory, and because the hooks module names the build-time flag directly, it never reaches a production bundle. :fact[cgt4tk] :fact[72mctx]
- The second paragraph says that in production editors sign in against the reader's D1 database and each publish commits through the reader's GitHub App. :fact[5f4kmk]
- Each edit reaches the public page on the next build and deploy.

## Next steps

*Point to the pages that build on the site the tutorial leaves, one sentence each.*

- The section opens on the lead-in "The following pages build on the site this tutorial leaves:", and each bulleted item is the linked page followed by what it does for this site.
- See [Theme your public site](theme-your-public-site.md#theme-a-hand-built-site) for styling the unstyled entry route.
- See [Configure media](configure-media.md) for adding media to the site.
- See [Define an adapter and schema](define-an-adapter-and-schema.md) for growing the adapter past one concept.
- See [Build the public routes](build-the-public-routes.md) for the delivery routes beyond the entry catch-all.
- See [Restrict admin access](restrict-admin-access.md) for declaring an access map, which the guard reads from the runtime with no edit to the hooks module. The page leaves out the earlier versions. :fact[iwf4nu]
- See [Security model](security-model.md) for the reasoning behind the App's reach, the dev backend's exclusion from production, and the CSRF design.
- See [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) for a second sign-in group beside the editors.
- See [`verifyTurnstile`](../reference/cloudflare.md#verifyturnstile) for Turnstile verification on a public form.
