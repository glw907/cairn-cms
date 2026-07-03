<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# The editor copy-edit: local spellcheck, voice-preserving tidy

cairn's editor carries two copy-edit features that sit at opposite ends of a spectrum. Spellcheck runs
locally, on every keystroke, and never sends text anywhere. Tidy reads a whole draft once through a
language model, on demand, behind an explicit opt-in. They share a design stance: cairn proposes, the
author decides, and the durable record is git for both. This page explains why each is shaped the way
it is. The editor-facing walkthrough is in [write in the editor](../guides/write-in-the-editor.md),
the developer setup is in [enable tidy](../guides/enable-tidy.md), and the request shapes are in the
[sveltekit reference](../reference/sveltekit.md).

## Why spellcheck is local and markdown-aware

A browser's own spell checker is the obvious default, and cairn deliberately turns it off. Two reasons.
First, a browser checker does not understand markdown. It underlines a word inside a code fence, a slug
in the frontmatter, a directive name, half of a `media:` token. An author writing structured text sees
a field of false underlines and learns to ignore the signal. Second, the native attributes that drive
it (`spellcheck`, `autocorrect`, `autocapitalize`) carry a risk in a source editor: a browser
autocorrect could silently rewrite a `media:` token, a directive name, or a frontmatter key, and the
author would never see the byte change. cairn's surface must keep the author's exact bytes, so all
three native attributes come off.

cairn's own checker replaces them. It runs as a CodeMirror lint source that reads the markdown syntax
tree, so it knows what is prose and what is machinery. Code, links, HTML, frontmatter, directive
fences, and `media:` tokens are never checked; the prose inside everything else is. The dictionary
itself runs on a Web Worker, off the main thread, and the word list ships with the package, so no text
ever leaves the browser. The checker is private by construction. There is no server round trip, no
third party, nothing to log.

A second quiet layer catches the objective slips a dictionary misses: a doubled word, a double space
inside a line, a stray run of punctuation. It runs over the same prose spans the spellcheck source
extracted, so a doubled word inside a code fence is never flagged. It is three well-tested checks, not
an opinion linter. cairn does not ship a style or readability linter that flags passive voice or long
sentences; those are voice, and voice is the author's.

## Why tidy preserves voice and ships no house style

Tidy is the harder feature, because a language model copy-editing a draft is one prompt away from
rewriting it. The whole design is built to stop that.

The core principle is that tidy never harmonizes to the author and never guesses a style. If a draft
uses "fifteen" in one place and "15" in another, and the site has set no number-style convention, tidy
leaves both alone. An undeclared style is the author's choice, not an inconsistency to fix. cairn ships
no house style. A site that wants the Oxford comma, or numerals under ten, or smart quotes, declares it
in the convention config, and only then does tidy apply it. The prompt is built from that config alone:
one rule line per enabled convention, nothing for a disabled one, and a stable always-on core that
carries the never-harmonize instruction so no config can strip it. The author's text rides as data, not
as instructions, so an injection attempt in the content cannot reshape the edit.

The prompt is the first line of voice protection, and the validator is the backstop. tidy reads the
draft and returns a corrected string, and cairn computes the diff locally and validates the result
before showing it. A result that adds, removes, or relevels a heading, that changes the frontmatter,
that alters a `media:` token, that edits a code block, or that diverges from the original by more than a
length-aware bound is discarded with an honest message, and the document is untouched. The bound is a
rewrite-and-injection backstop, not a voice safeguard (the prompt protects voice); it catches the case
where the model returned something other than a proofread.

The model never owns a position. It returns only the corrected string. cairn computes every range,
offset, and line label locally from the diff against the captured original. The review surface, the
because-line that explains a normalization, the category of each change: all of it is computed from the
diff or read from the config, never taken from a model claim. The model proposes wording; cairn owns
every fact about where and why.

## Why the durable record is git for both

Both features write through the same git commit pipeline the content uses. The personal dictionary is a
committed file, not a per-user store in a database. A word one editor adds is shared with every editor,
diffable in a pull request, and recoverable from history. There is no separate dictionary service to
run, back up, or migrate. tidy commits nothing on its own; it proposes edits to the open document, and
the author's ordinary Save and Publish carry them to git the same way any other edit travels. A tidy
that an author applies is just an edit, indistinguishable in the history from one they typed by hand,
which is the point. The author owns the change.

This is the same placement rule the rest of cairn follows: content and the structure around it live in
git, and only true runtime state (auth sessions) lives in a database. See
[where each kind of state lives](./data-tiers.md) for the general rule. The dictionary and the
convention config are content-adjacent site state, so they live in git, edited through the commit
pipeline, versioned with everything else.
