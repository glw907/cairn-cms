# Opus 5.5 as a docs drafter, grader, and reader agent: what is published (as of 2026-09-23)

Key: [A] Anthropic claim. [P] independent practitioner evidence. [thin] one source or anecdote. The model is one day old, so all practitioner evidence is thin.

Your baseline facts hold, with two refinements. First, Anthropic's docs say Opus 5.5 "tends to think more per turn than Claude Opus 5" at a given effort level, especially at `xhigh`/`max`. Second, the four breaking API changes are: thinking cannot be disabled, forced `tool_choice` returns a 400, thinking blocks are bound to the model and the conversation, and `computer_20251124` is dropped. [A] Sources: https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5 and https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5 (both 2026-09-22).

## 1. Writing quality and style

- [A] The launch post says Opus 5.5 "puts the most important information up front, is less likely to use jargon or idiosyncratic phrases," and "follows the writing rules you give it." https://www.anthropic.com/claude-opus-5-5 (2026-09-22)
- [A] On grounding, the docs say it is "much less likely to state an incorrect figure or cite the wrong source," and that its documents "need less editing." A launch-post customer quote says 16 of 18 reports cleared a bar on which "any invented figure or quote would have failed." https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5 ; https://www.anthropic.com/claude-opus-5-5
- [P] Every's Vibe Check found the prose readable (Flesch-Kincaid grade about 6.95, against 7.97 for Opus 5), but the model "buries the point." It took 37 to 39 sentences for an essay opening a human wrote in 21. Dan Shipper: it "can diagnose what a paragraph needs and then produce a revision that ignores its own diagnosis." https://every.to/vibe-check/vibe-check-opus-5-5-is-pulling-our-codex-converts-back-to-claude (2026-09-22); readability figures relayed at https://www.orcarouter.ai/blog/claude-opus-5-5-creative-writing (2026-09-23)
- [P] As an *editor*, it ranked behind Opus 5, GPT-5.6 Sol, and GPT-6 Astra in that test. Artificial Analysis ranked it 95th of 212 models on verbosity. https://www.orcarouter.ai/blog/claude-opus-5-5-creative-writing (2026-09-23) [thin, secondhand]
- [P] It "takes feedback without a fight and builds on material" (Parrott), and "follows the skills and keeps moving" where Opus 5 broke them (Klaassen). https://every.to/vibe-check/vibe-check-opus-5-5-is-pulling-our-codex-converts-back-to-claude
- [P] In a legal benchmark, Opus 5.5 tied Fable 5.1 on accuracy (8.55/10, against 8.18 for Opus 5). Accuracy and completeness moved in opposite directions. https://www.haqq.ai/blog/claude-opus-5-5-legal-benchmark (2026-09)
- Evidence gap: nothing published tests whether it joins neighbouring source entries into one claim (your Sonnet failure mode). Keep your fact-check.

## 2. Prompting changes

- [A] Existing Opus 5 prompts "should perform well without changes," and the Opus 5 patterns remain the starting point. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- [A] Carried over from Opus 5:
  - Remove "double-check" and verification instructions, because they cause over-verification.
  - Constrain scope explicitly.
  - Add length calibration for written deliverables ("do not pad with filler sections, redundant summaries").
  - "Positive examples of the communication style you want tend to be more effective than instructions about what not to do."

  https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- [A] Specific to Opus 5.5:
  - Remove "think carefully" lines. Effort, not the prompt, is the lever.
  - Name the specific patterns to avoid, because a vague "avoid generic" instruction swaps one default for another. Anthropic says this for frontend work; applying it to prose is a reasonable extension.
  - Prompts that push it to write its reasoning into the response can be refused under the `reasoning_extraction` category.

  https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- [A] Cross-model guidance: roles help ("even a single sentence makes a difference"). Use 3 to 5 examples in `<example>` tags that are relevant and diverse. Replace "CRITICAL: You MUST" with plain "Use X when" to avoid overtriggering. Ground responses in quotes before doing a long-document task. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- [A] A literal-following caveat, from Opus 5 review guidance and plausibly still true: "only report high-severity issues" makes the model report less. Ask it to report everything, then filter in a separate pass. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- [A] On Opus 5.5 specifically, instructions inside pasted text get followed more than on earlier models. The system card measured about 2% of attempts at default effort and 7.4% at max after mitigation. Wrap the source material you feed a drafter in `<pasted_content id=…>` tags. https://www.alphaxiv.org/abs/2609.2609-opus-5-5 (summary of the system card); tagging pattern in the prompting guide

## 3. As a judge or grader and as a simulated user

- [A] For code review, Anthropic reports 72% of known bugs caught against 56% for Opus 5 at high effort, "with fewer false alarms." https://www.anthropic.com/claude-opus-5-5
- [P] CodeRabbit measured a smaller gain: recall 63.8% against a 61.3% baseline, precision 38.6% against 39.3%. `max` effort "did not consistently find more bugs." https://www.coderabbit.ai/blog/opus-5-5-model-review (2026-09-22)
- [A] Evaluation awareness appears in up to 36% of audit transcripts. For a reader agent, this suggests it may notice it is in a test scenario. https://www.alphaxiv.org/abs/2609.2609-opus-5-5 [thin: secondhand summary; the 230-page PDF was too large to fetch]
- [P] Judge choice changes winners. HAQQ's two non-Anthropic judges picked different winners from identical answers: https://www.haqq.ai/blog/claude-opus-5-5-legal-benchmark. Earlier blind judges, Opus 4.8 among them, scored their own answers highest: https://ai-crucible.com/articles/llm-as-judge-calibration-test/ (undated, pre-5.5).
- [P] Silently moving a judge to Opus 5.5 through the `opus` alias "resets the monotonic grade baseline." Pin the grader model explicitly. https://github.com/estevanhernandez-stack-ed/Vibe-Prompt/issues/1 (2026-09)
- Evidence gap: I found no published Opus 5.5 data on sycophancy or self-preference, and no Anthropic recommendation to grade with a different model family.

## 4. Effort, cost, and quality

- [A] Start at `medium` and sweep against your own evals. Reserve `xhigh`/`max` for measured gains. Anthropic describes `low` as suited to "subagents." Its per-message effort beta keeps the prompt cache. https://platform.claude.com/docs/en/build-with-claude/effort
- [P] One reviewer recommends drafting "at high effort levels" with your own examples. https://www.orcarouter.ai/blog/claude-opus-5-5-creative-writing [thin]
- Price: Opus 5.5 costs $4/$20 per MTok against $3/$15 for Sonnet 5, so about 1.33x per token. Opus 5.5 tends to use fewer tokens per task (Sonar measured 40% fewer output tokens than Opus 5 on coding), so the effective gap may be smaller. https://www.sonarsource.com/blog/claude-opus-5-5-an-evaluation/ (2026-09) ; https://www.cosmicjs.com/blog/claude-opus-5-5-vs-opus-5
- Evidence gap: no published head-to-head of Opus 5.5 and Sonnet 5 on prose.

## 5. Regressions and quirks

- [A] It can end a turn early with a text report. Keep a checklist, allow a bounded two or three auto-continues, and use a system-prompt block naming the four early-stop patterns. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- [P] In one knowledge-work task, it spent 9 minutes on tangents instead of the deliverable ("no other model he has tested has had the problem"). https://every.to/vibe-check/vibe-check-opus-5-5-is-pulling-our-codex-converts-back-to-claude [thin]
- [A/P] It is more susceptible to instructions inside pasted text (section 2), and the system card notes a refusal-rate dip. https://www.alphaxiv.org/abs/2609.2609-opus-5-5
- [A] Effort saved in Claude Code before `/effort` became per-model does not carry over to Opus 5.5 (Claude Code 2.1.280). https://code.claude.com/docs/en/changelog ; https://x.com/ClaudeCodeLog/status/2102442227033116867

## Implications for a docs-drafting pipeline

1. **Drafter:** use Opus 5.5 at `high`. The effort default is `medium`, but prose structure (point-burial) is its weak spot, and the one practitioner recommendation is `high`. Sweep `medium` against `high` on 2 or 3 pages before committing. Skip `xhigh`/`max`.
2. **Brief style:** write calm, plain instructions with no CAPS and no "think carefully" or "double-check" lines. Name the concrete tells to avoid by pattern. Add an explicit length and no-padding line. State the rule "lead with the point: the first sentence of each section states its answer" outright, because this model will not do it unprompted.
3. **Exemplars matter more than persona profiles.** Anthropic's own guidance favors positive examples over prohibitions, and practitioners report the model follows supplied rules and skills. Give 2 or 3 exemplar pages in `<example>` tags. Keep the persona to one sentence.
4. **Grounding:** put the source facts in tags, and have the drafter cite a source-entry ID per claim so the fact reader can check each sentence against one entry. This targets the neighbour-joining failure directly. Anthropic's grounding claims do not prove this failure mode is gone.
5. **Editor and grader:** do not use Opus 5.5 as the sole register editor. It ranked weakest of four as an editor, and it can diagnose a problem and then ignore its own diagnosis. Keep the editor's findings, and have a different pass (or a person) verify that each redraft applied them.
6. **Model diversity:** if the drafter is Opus 5.5, grade with a different model where you can. Use Fable 5.1 for adjudication, or a non-Anthropic judge if one is available. Pin the grader's model ID so alias upgrades do not shift the baseline. Ask graders to report everything, then filter the findings in a separate pass. Do not ask graders to write out their reasoning chain (risk of a `reasoning_extraction` refusal; untested).
7. **Reader agents:** Opus 5.5 is plausible, but expect evaluation awareness. Frame each job as a real reader's task, with no "you are being tested" wording. A cheaper model (Sonnet 5) as a second reader would better approximate a less capable reader.
8. **Harness:** run long drafting chains with a checklist and a bounded auto-continue. Treat a text-only turn end as a report, not as completion.
