# Framing A/B: act-on-newly-published-entries

Geoff's ruling (2026-10-11): run the page's intro framing at two efforts, keep both, proceed on
`xhigh`, and judge at the morning read. The page is `act-on-newly-published-entries`, the first
page in run 1's queue.

| File | What it is |
| --- | --- |
| `framing-xhigh.md` | The chain's own framing record (`framingEffort` xhigh), taken from commit `5b50978b7`. |
| `framing-high.md` | The same prompt re-run once at `high`, by `ab-framing-final.js` (run `wf_a86d122d-a9a`). |
| `intro-xhigh.md` | The introduction drafted from the xhigh record (`wf_6f2d0652-f24`). |
| `intro-high.md` | The introduction drafted from the high record (same run). |

Effort is the one intended variable. The framing prompt is the one the chain rendered, with its
output path changed and one paragraph appended (`diff` of the two prompts shows only those two
edits). The framing agent's model and agent type are the runner's: `claude-opus-5-5`,
`general-purpose`.

## Asymmetries

- **Different plans.** The xhigh record was framed on the plan as revised by the chain's plan
  read (`planStep.revised` true). The variant read the plan file as it stood on disk when the A/B
  ran, which is that same revised plan, so the two rest on one plan. (A plan-read escalation in
  this page would break that; this page did not escalate on its plan read.)
- **The variant files no fact.** It was told to list the facts it would file under "Facts this
  record would file". The xhigh run filed its facts live, so its record cites facts already on
  disk (`f:v5qalk` and others), while the variant's one optional clause (`publishedAt` lives in
  the manifest) is listed, not filed, and the intro drafter omits it.
- **The variant could not read the drafted page or the xhigh record.** The xhigh run had the
  same page absent. Nothing else differs in what each could read.
- **One sample each.** A single run per effort cannot separate effort from run-to-run variance.

## What to read

Compare `intro-xhigh.md` against `intro-high.md` for the three introduction parts the page plan
names, then the two framing records' reader lists. Sizes: framing records 18,823 and 16,994
bytes; intros 440 and 436 words.

Tokens: the high framing run used 0.14M, the two intro drafts 0.09M.
