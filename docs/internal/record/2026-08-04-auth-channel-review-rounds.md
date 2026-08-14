# Auth-channel design: the three adversarial review rounds

Internal process record for the `createAuthChannel` seam. Written 2026-08-04, during the planning
sitting, so the findings survive the sitting's context. This is provenance, not documentation: it
exists so a later reviewer can see what was already attacked and why a mechanism is shaped the way
it is, without re-litigating settled ground. The developer-facing distillation is
[`docs/explanation/auth-channel-security-model.md`](../../explanation/auth-channel-security-model.md);
the design itself is
[the spec](../../superpowers/specs/2026-08-03-auth-channel-factory-design.md).

Three rounds ran, each a read-only Opus 5 reviewer with the design but no implementation. Rounds 1
and 2 returned "do not build" and both were right. The rounds cost roughly 300k subagent tokens in
total and changed the design more than the original sitting did, which is the argument for running
them before the first implementer dispatch rather than at the pass-end gate.

## Round 1 (two reviewers, parallel lenses, against v1)

One reviewer took auth security, one took the Cloudflare and runtime surface. They were dispatched
independently and converged on six of the same defects, which is what made the findings
trustworthy. The auth lens found three criticals.

**The per-code lockout was an unauthenticated permanent account lockout.** `confirm` required
nothing tying a guesser to the browser that requested the code, so an attacker could burn the
victim's attempt budget on whatever row existed, and the silent resend cooldown meant the victim's
recovery attempt reported success and delivered nothing. The design's own reasoning ("nobody is
locked out by mistyping") was about the legitimate user and had silently assumed only they could
reach the counter.

**`confirm`'s error union enumerated the roster in two requests.** Only a known contact had a code
row, so `expired` meant "not on the roster" and `bad-code` meant "on it". The `request` action had
been made meticulously opaque and `confirm` gave the answer away for free.

**The brute-force math did not close.** Five guesses per code with a 60-second reissue is 7200
guesses a day against 10⁶, which is roughly a coin flip over a 90-day season for one targeted
member.

The platform lens independently found that the compare-then-`DELETE` consume was not atomic (two
concurrent confirms both minted), that `confirm` had no defined source for the subject id and was
therefore unimplementable as written, and that three platform claims were factually wrong:
`waitUntil` is present and a no-op that discards the promise under `vite dev` and `vite preview`
rather than absent; `platform.context` is the deprecated alias for `ctx`; and `$app/environment`
would be the first such import in `src/lib` and would break every integration suite.

**The finding that was verified by hand rather than accepted on authority:** the showcase member
fixture would have shipped an unauthenticated OTP-readback route into every scaffolded site.
`scripts/emit-template.mjs` copies `examples/showcase` verbatim minus the four paths in
`.cairn-template.json`, and the plan's mitigation was a code comment. Checking took one command.
This is why the consumer proof became its own pass with the exclusion as a named deliverable.

## Round 2 (one reviewer, against v2)

v2 fixed the consume, the platform claims, the subject binding, and the store-state half of the
confirm oracle. It bound codes to the requesting browser with a nonce cookie and keyed rows on
`(identity, nonce_hash)`, which genuinely closed the v1 lockout and the code-invalidation attack
that survives session binding alone.

Then it reintroduced the same defect one step earlier.

**The per-identity send budget was the lockout, moved.** Charged before the mint and keyed on the
victim's identity, so five requests an hour from any browser left the victim's own request
answering `{sent: true}` with nothing delivered. Worse, v2's move from contact-keyed to
subject-keyed rows, presented as a fix, is what made the lockout total: every spelling of the
contact now collapsed onto one budget row.

**Brute force was still open and the arithmetic was wrong.** Rows keyed on `(identity, nonce_hash)`
with a fresh nonce per request meant a locked row cost the attacker one more request to replace
with a fresh five-attempt pool. The real bound was sends-per-hour times the cap, 25 guesses an
hour, about 5% per targeted member per season. The spec's "decades" claim was not defensible. The
failure budget added to bound this was charged only after a row was already locked and no flow step
read it, so it could have shipped as a write-only counter and passed every acceptance criterion.

**v2 contradicted itself.** The cooldown lived in the mint upsert's `ON CONFLICT` branch, which
can never fire when every request mints a new nonce. The spec specified both, so the 60-second
cooldown did not exist as written.

**`devDelivery`'s runtime refusal was impossible.** Moved off `$app/environment` to read
`platform.env`, with a `deliver(contact, code)` signature that has no access to it.

Lesser findings that shaped v3: the budget table was never swept or indexed and an attacker chose
its row count in the site's production database; identity hashes were unsalted SHA-256 over a 10¹⁰
phone space and therefore reversible, which falsified the "no PII" and "correlates without
identifying" claims; the subject had become a security key with no contract, so an empty subject
would have given every affected member one shared session; blanket response uniformity was applied
to input-independent faults, so a site with a forgotten binding would tell every member "we sent
it" forever; and the session cookie's attributes were never enumerated, so a test could pass while
the cookie shipped without `HttpOnly`.

## What v3 took from it, and the rule that came out

The two rejections had one shape: a control keyed on the victim that denies service. So v3 wrote
the rule down, as "anything that denies service keys on the requester; anything that bounds
guessing keys on the identity and escalates rather than denies". Round 3 then showed that writing
the rule was not enough, because v3 carved out two exceptions to it and both were exploited. The
form that survived, in v3.1, is absolute:

**No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
the requester. Identity-keyed controls either escalate through a channel the site can act on, or
they only log.**

Escalation only counts when it has a wire representation the site can act on, which is what
`challenge-required` in both result unions provides.

The second structural change was raising code entropy to 8 digits (Geoff's call, deviating from the
consumer's spec'd 6). Six digits was the root cause of every hard trade in both rejected versions:
at 10⁶ the only way to bound guessing is an aggressive per-identity throttle, and every such
throttle is a lockout vector. The third was making `challenge` required config rather than
optional, which is cheap on a Cloudflare-only engine where Turnstile is native and free, and which
converts the guessing bound from arithmetic to economics.

## Round 3 (against v3)

Framed as a final round: hunt a third instance of the deny-on-the-victim defect, check the new
mechanisms for the self-consistency failure v2 had, verify the residual-risk arithmetic, and check
that the plan's acceptance criteria would fail when they should. It found the defect a third time,
**inside the mechanism v3 had added to prevent it**.

**Escalation was never a mechanism.** Neither result union carried a way to say "solve a
challenge", so a site could not render one. On `request`, `challenge` already ran unconditionally,
so "demand a fresh challenge" was either a no-op or a second verification of a single-use token
that fails closed. On `confirm`, where the realistic site form carries no token, demanding one
meant `challenge` returned false and the flow failed closed, which is a denial keyed on the victim.
The plan's own acceptance criterion (deep-equal response bodies across an escalated input) required
the mechanism to be inert.

**The live-row cap evicted the victim's code.** The spec said a new nonce deletes "that browser's
prior rows", but rows are keyed on the nonce alone with no browser column, so what the plan
specified pruned by identity. The polarity was backwards in the sharpest possible way: nonce reuse
means a legitimate repeat requester never mints a new nonce and therefore never prunes, so pruning
fired almost exclusively for cookie-clearing attackers and deleted almost exclusively legitimate
rows.

**The anti-spam ceiling denied on the identity**, on a sliding window, so an attacker sustaining 30
requests an hour sustained the denial indefinitely at roughly a dollar a day per victim. The v3
residual described it as bounded "within an hour window", which was wrong.

**`challenge: () => true` was a working insecure channel written through the factory.** v3 required
`challenge` as config and rested its whole economic bound on it, while listing only `normalize` and
`lookup` as carrying correctness obligations.

**The salt could not be per-deployment.** It lived in a static exported constant that a doc test
pins byte-for-byte, so the three reachable outcomes were a public shared salt, an unenforced
placeholder, or a broken test.

The round also confirmed the v3 arithmetic was internally correct while resting on the inert
escalation, so the published figure was eight times low, and that the roster-aggregate number (the
one an operator actually cares about) was missing.

Its own verdict was that these were bounded and local corrections rather than a fourth redesign,
and it scoped them to about seven places. **v3.1 applied that list.** The correction that matters
most is not any single mechanism: it is that the rule became absolute. v3 carved out two exceptions
to "never key a denial on the victim" and both were exploited within one review round.

**v3.1 has not itself been reviewed.** The sitting stopped there by agreement, and the pass-end
gate (Task 8, `web-auth-security-reviewer` mandatory) is where it gets caught if the amendment
introduced something new.

## What to carry forward

- The rule above is the design's load-bearing constraint. A change that violates it is a
  regression regardless of what else it improves.
- Two reviewers on different lenses beat one reviewer twice. Convergence between independent
  lenses was the confidence signal in round 1.
- Verify the concrete claims by hand. The single most severe finding across all rounds rested on a
  file fact and took one command to confirm.
- Expect some findings to be the author's own factual errors about the toolchain. Fix those in the
  spec and record the withdrawn claims, so a later reader does not reinstate them.
