# The editor copy-edit

Cairn catches mistakes in a draft two ways. Spellcheck runs in the browser and costs nothing, so
it's on by default. Tidy sends the draft to a model and costs money, so a site has to turn it on
deliberately. This page explains why the split falls where it does, and why tidy stops short of
things it could plausibly do. [Write in the editor](../guides/write-in-the-editor.md#checks-as-you-type) covers
using both day to day, and [Enable tidy](../guides/enable-tidy.md) covers turning tidy on for a
site.

## Local versus remote decides what runs by default

Spellcheck runs entirely in the browser: a compiled dictionary in a Web Worker checks words as
an editor types, and nothing leaves the machine. That makes it free per keystroke and private by
construction, so it defaults on, the same way a text editor's built-in spellchecker does. Tidy
is a different shape of thing. It sends a draft to the Anthropic API and spends tokens on a model
call, so it can't default on without a site owner's knowledge, and it stays off until
someone deliberately enables it and supplies a key. The two features don't compete for the same
slot; they sit on either side of a line between what costs nothing to run always and what costs
enough to need a decision.

Nothing that rides along with spellcheck crosses that line either. Alongside misspellings, the
same mechanism flags a doubled word, a double space, and stray repeated punctuation, because
those are deterministic checks a few lines of pattern-matching can make without a model call.
Anything that would need judgment, rather than a rule, waits for tidy.

## Tidy's remit stops at the wording

Tidy is a light copy-edit: one notch above proofreading, one notch below the kind of line
editing that reworks a paragraph's shape. It fixes spelling, grammar that's plainly broken,
doubled words, and stray whitespace. It leaves word choice, sentence rhythm, structure, tone,
and voice alone, on the same terms an editor would leave a colleague's draft alone once the
errors were gone. Deliberately missing from that list is anything resembling a style opinion or
an AI-tell detector: cairn has no view on whether a sentence sounds machine-written, and tidy
never pushes a draft toward one register or away from another. That's deliberate. Cairn is for
people writing prose, and a copy-edit that reached past mechanics and into voice would work
against what the editor is for.

## Tidy proposes; only the author applies

The reason a copy-edit needs a review step, and a spelling fix doesn't, is that a copy-edit
touches wording. A misspelled word has one obvious correction, but a proposed grammar fix is a
judgment call an author has to see before it lands, or there's no way to confirm tidy left their
sentence intact rather than merely different. So tidy never writes into the draft on its own.
The author's original text stays in the buffer exactly as it was until they accept a change, one
proposal at a time or as a batch, and every accepted round can be undone in a single step. Reject
a proposal and the draft is precisely what it was before tidy ran. Nothing about the mechanism
depends on trusting the model to have gotten it right; it depends only on the author looking at
what changed.

The review step and cairn's structural checks guard different things. Before a proposal ever
reaches the author, cairn confirms the result
didn't restructure the document: the same headings at the same levels, the same directive
blocks, frontmatter untouched byte for byte, and every image or media token exactly as it was.
That check is exact, and it catches a model that rewrote more than it was asked to. Tidy stays
out of an author's voice because of how the model is instructed, not because of a check on its
output. Code can't verify voice; the instruction is where the restraint lives.

## Style is a setting the author picks, never a guess tidy makes

A site can turn on specific style conventions, an Oxford comma, a number format, an em-dash
style, and tidy applies exactly the ones a site has turned on and nothing else. It does not
infer a preference from how an author already writes. A model asked to harmonize a draft to its
author's own habits does exactly that, and the result reads as a correction while actually
erasing a choice, rewriting "fifteen centimetres"
to "15 cm" because most of the surrounding sentences used numerals, and taking a British spelling
down with it in the same pass. Regional spelling in particular is never tidy's to normalize
under any setting; it's a property of the site's declared dialect, the same one spellcheck reads,
not a style tidy could ever have an opinion on. With no conventions configured at all, tidy
leaves every style choice precisely as the author wrote it.

## Git is the durable record for both

Neither feature keeps its own store. When tidy's proposals are accepted, the result is ordinary
text sitting in the draft, exactly where any other edit would leave it, and it becomes a real
change only when the author takes cairn's normal Save. There's no tidy history separate from the
entry's own history: an accepted round is a diff like any other, and a rejected one leaves no
trace at all. Spellcheck's one durable artifact, the per-site dictionary an editor builds by
adding words, is a plain text file committed to the repo, the same way everything else a site
knows is committed. That's a deliberate choice over a database or a browser's local storage,
neither of which is shared across editors or reviewable the way a git diff is. Cairn's markdown
is already the source of truth for a site's content; both of these features write into that same
ledger instead of inventing a second one.
