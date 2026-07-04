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
someone deliberately enables it and supplies a key.

Nothing that rides along with spellcheck crosses that line either. Alongside misspellings, the
same mechanism flags a doubled word, a double space, and stray repeated punctuation, because
those are deterministic checks a few lines of pattern-matching can make without a model call.
Anything that needs a model's judgment waits for tidy.

## Tidy's remit stops at the wording

Tidy is a light copy-edit. It catches more than a proofreader would, and it stops short of the
line editing that reworks a paragraph's shape. It fixes spelling, grammar that's plainly broken,
doubled words, and stray whitespace. It leaves word choice, sentence rhythm, structure, tone,
and voice alone, on the same terms an editor would leave a colleague's draft alone once the
errors were gone. Deliberately missing from that list is anything resembling a style opinion or
an AI-tell detector: cairn has no view on whether a sentence sounds machine-written, and tidy
never pushes a draft toward one register or away from another. That's deliberate. Cairn is for
people writing prose, and I didn't want a copy-edit reaching past mechanics into voice, because
that works against what the editor is for.

## Tidy proposes; only the author applies

The reason a copy-edit needs a review step, and a spelling fix doesn't, is that a copy-edit
touches wording. A misspelled word has one obvious correction, but a proposed grammar fix is a
judgment call an author has to see before it lands, or there's no way to confirm tidy left their
sentence intact rather than merely different. So I never let tidy write into the draft on its own.
The author's original text stays in the buffer exactly as it was until they accept a change, one
proposal at a time or as a batch, and every accepted round can be undone in a single step. Reject
a proposal and the draft is precisely what it was before tidy ran. The author looks at every
change before it lands, so nothing here rests on the model being reliable.

The review step and cairn's structural checks guard different things. Before a proposal reaches
the author, cairn confirms the result didn't restructure the document. The headings and their
levels, the directive blocks, the frontmatter byte for byte, and every image or media token all
have to survive unchanged, or cairn rejects the proposal. That check is exact, and it catches a
model that rewrote more than it was asked to. Tidy stays out of an author's voice because of how
I instruct the model, not because of a check on its output. Code can't verify voice, so the
restraint has to live in the instruction.

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
change only when the author takes cairn's normal Save. Tidy keeps no history of its own. An
accepted round becomes an ordinary diff in the entry. A rejected one never touched the draft, so
there's nothing to record. Spellcheck's one durable artifact, the per-site dictionary an editor
builds by adding words, is a plain text file committed to the repo, the same way everything else
a site knows is committed. I chose that over a database or a browser's local storage, neither of
which is shared across editors or reviewable the way a git diff is. Cairn's markdown
is already the source of truth for a site's content; both of these features write into that same
ledger instead of inventing a second one.
