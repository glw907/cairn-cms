# Explanation

These pages explain how cairn works and why it's built that way. Each one works through a design
decision and the reasoning behind it. Several link out to the reference for the exact API details.

- [Why cairn](./why-cairn.md): who cairn is for, why the stack is Cloudflare, SvelteKit, and
  DaisyUI, and why markdown over a WYSIWYG editor.
- [Why the design language is enforced](./enforced-design.md): why the admin's design language
  lives in tokens, norms, a packaged skill, and an audit rather than only in finished screens,
  and what that does and doesn't buy you.
- [Architecture](./architecture.md): what the engine owns and what your site owns, and what
  happens between a save and a redeployed page.
- [The content model](./content-model.md): why content is a fixed set of concepts, how a URL is
  assembled from an id and a date, and how one schema declaration drives a concept's form,
  validator, and type.
- [The security model](./security-model.md): the trust boundaries cairn owns (who may edit, what
  each role may reach once signed in, what a save can write to the repo, what an author's markdown
  can render in a visitor's browser) and what each one guarantees.
- [The auth-channel security model](./auth-channel-security-model.md): the trust boundary behind
  `createAuthChannel`, the rule the design was built from, the threat catalogue naming the test
  that proves each mechanism, and the residual risks the design accepts rather than solves.
- [The render sanitize floor](./render-safety.md): exactly what the render pipeline keeps, strips,
  and rewrites from an author's markdown, and the guarantee your site inherits from it.
- [Reference integrity](./reference-integrity.md): how a reference field stays correct across a
  rename or delete, and why the build fails instead of guessing.
- [Media storage](./media-storage.md): why media bytes live in R2 while the content stays in git.
- [Where each kind of state lives](./data-tiers.md): the rule that places a new kind of state in
  git or in D1, and the precedents already decided by it.
- [The editor copy-edit](./editor-copyedit.md): why spellcheck stays local, why tidy asks before
  it writes, and why git is the durable record.
