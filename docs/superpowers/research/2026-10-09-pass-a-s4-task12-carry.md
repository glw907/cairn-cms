# Task 12 carry from S4 (Tasks 11 and 6), engine pass pre-2b A

Sources: s4a-run.json (Task 11 round 1, escalated on bd614101), task11-fix-notes.md (fix round d716ec89, accepted), s4a-task6-run.json (Task 6, c2409fdc then a8156613, accepted after one fix round). Nothing here is filed in the friction log (its S4 hunks are commit 0c2f3272 on main).

Conductor ratified Task 6's extension of Decision 15: a present key that fails signing also skips the live mint (pinned by a test).

## Task 11 (nested images in where-used, replace, manifest verify; bd614101 then d716ec89)

**Consumers must / may (drafts)**
- Consumers must: Regenerate the content manifest (`npx cairn-manifest`) and commit it. A site that declares an image nested in an object or an array (array(image), object holding an image, array of objects holding an image) and has not regenerated fails its build at upgrade with the stale-manifest message. A site that calls verifyManifest itself passes its adapter as the third argument to get the nested-shape rule.
- Consumers may: Pass the adapter to verifyManifest to opt into the nested-image rule in a hand-rolled build script; omitting it keeps the pre-field allowance.
- CHANGELOG also needs (fix notes): the widened unions (RepointPlacement.kind, AltPlacement.kind and bucket, counts.nestedSkipped).

**Fix round d716ec89 (conductor-ruled after escalate)**
- New alt bucket `nested-skipped`; `MediaAltPreviewPlan.counts.nestedSkipped`.
- New `data-cairn-alt-nested` well in MediaAltFillDialog. Copy: "In a gallery or card" / "Alt for these images is set where each one sits in the entry. They are left as they are."
- MediaReplaceDialog counts "N in a gallery or card" (replaces counting a nested image as "in the body").
- sveltekit.md got one sentence on the bucket.
- Round 1 had put a nested image in the "decorative-skipped" bucket with before === after; that is superseded.
- Review of the fix: accept (Opus).

**2a extend pages falsified (not edited)**
- None. The implementer's grep over docs/extend, docs/admin, docs/editors, why-cairn.md found no mention of verifyManifest or mediaRefs.

**Fact ids edited or minted**
- f:n0laoh (docs/internal/facts/extend.md:271) edited in place: text and source ranges for the third argument and the nested rule.
- f:3vndvj: inboundIncludes line pointer repaired (473 to 499) because check:facts failed on it.
- No new fact bullet minted; a later docs task owns one.
- Task 12 repair owed: f:n0laoh cites src/lib/vite/internal.ts:53-80 for virtualSource; it starts at :67 and the verify resultExpr is near :81 (:84 per the fix notes).

**Reference pages edited**
- docs/reference/core.md (verifyManifest declaration, prose, snippet) and docs/internal/api-surface.md: declaration typed as `Pick<CairnAdapter, "content">` (double quotes; check:reference:signatures normalizes to the compiler's spelling). Fix round added the sveltekit.md sentence above.
- Owed to a later docs task: the full f:n0laoh-family fact bullet for the nested rule.

**Reviewer nonBlocking (round 1, accepted ones carried)**
- src/lib/content/media-rewrite.ts:195-205: replace and alt propagation detect images from parsed YAML shape while extractMediaRefs follows declared descriptors, so an undeclared object holding an image-shaped {src} would be rewritten by replace though where-used never counted it. Harmless for the four admitted shapes.
- src/lib/content/frontmatter-region.ts:62: boundary regex change is shared with the references rewriter; a zero-indent `- key:` line now stays inside the block above it. No test exercises the references rewriter over a zero-indent sequence.
- src/lib/content/media-rewrite.ts:517: hero arm takes only the first src line in a key's range (`[0]`); correct for a top-level image.
- Fix-round review: the nested well's chip shows the raw kind as an uppercase "NESTED" pill (close's a11y/copy review; Geoff's read).
- Round 1 blocking test gap (nested-shape fail rows for object({image}) and array(object({image})) in manifest-verify-nested-media.test.ts:30): carried as a blocking item into the fix; confirm it closed at the Task 12 read.

**Unspecified choices to know**
- frontmatterKeyRange treats a zero-indent `- ` line as inside its key (frontmatter-region.ts:62), which also changes rewriteFrontmatterReference's range.
- A top-level key holding both a hero match and nested ones classifies as hero.
- declaresNestedImage inspects one container level.
- imageFieldKeys is shape-based; verifyManifest's third argument is Pick<CairnAdapter, 'content'>; the pre-field allowance is whole-manifest and for mediaRefs only (references, tags, includes keep per-entry drops).
- The showcase manifest needed no regeneration (npm run cairn:manifest produced no diff).

**User-facing copy added**
- "In a gallery or card"; "Alt for these images is set where each one sits in the entry. They are left as they are."; "N in a gallery or card" (all above).
- Stale-manifest error still says `npm run cairn:manifest` (manifest.ts:402); ROADMAP.md:396 already tracks the script name, left for a later pass.

## Task 6 (opt-in live key check and fingerprint; c2409fdc then a8156613)

**Consumers must / may**
- Consumers must: none stated.
- Consumers may: use the new optional HealthData members (`checks.githubAppToken`, `checks.githubAppSigning.fingerprint`) and the opt-in `/healthz?live=1`.

**2a extend pages falsified (not edited)**
- docs/extend/rotate-the-github-app-key.md lines 7, 65-67, 85, 125, 129: still prescribes the 55-minute confirming publish and the shell-record diagnosis; the /healthz fingerprint and ?live=1 supersede both. Feeds the 2a stage's inputs.
- docs/extend/scaffolded-site-files.md:366: names the /healthz payload as `{ ok, checks: { githubAppSigning } }`; incomplete now that ?live=1 adds githubAppToken and signing gains fingerprint.

**Fact ids edited or minted**
- f:paotzb amended (the /healthz payload).
- Nine path:line pointers hand-remapped in docs/internal/facts/extend.md: signing.ts:77, :105-121, :130-138, :44,67,132; health.ts:24-32, :10-32, :1-32. Fact ids other than f:paotzb are not named in the record.

**Reference-page sentences a later docs task owes**
- Fleet residual: at most one mint per isolate per minute, summed over the fleet (health.ts:97-98 says "at most once per isolate per minute however often it is asked").
- /healthz?live=1 outcomes: `githubAppToken.detail` is `key_refused`, `installation_not_found`, `installation_suspended`, or `unreachable` (health.ts:24-26). Present only on a ?live=1 request that had a GitHub App and a key to mint with.
- `data.ok` composes the signing check and, when present, the live check (a 401 fails ok even when signing passes).

**GitHub documented status codes (POST installation access token; gh-apps.md:855-863) and the classifier (health.ts:66-73)**
- Documented: 201 Created; 401 Requires authentication; 403 Forbidden; 404 Resource not found; 422 Validation failed, or the endpoint has been spammed.
- Classifier: 401 -> key_refused; 404 -> installation_not_found; 403 -> installation_suspended; everything else (including 422, 429, 5xx, network, timeout) -> unreachable. 5 s mint timeout.

**Web Crypto step and fingerprint (signing.ts:187-199)**
- Fingerprint is `SHA256:` + padded base64 of the SHA-256 of the public key's SPKI DER, matching GitHub's documented `openssl rsa -in PATH_TO_PEM_FILE -pubout -outform DER | openssl sha256 -binary | openssl base64` (gh-keys.md:57).
- Built by reading only the RSA modulus and exponent from the PKCS#8 DER, `importKey('jwk', ..., { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['verify'])` as a public key, then `exportKey('spki')` and `digest('SHA-256')`; no private key is ever exported (the pkcs8 private import stays `extractable: false`). The fingerprint is omitted when it cannot be computed.
- Reviewer checked the fixture: fingerprint 5z5Cept4XNaRREookuldVFx7RXKxMehr+7p4/DWtbeo= matches openssl.

**Fix round a8156613 (test only)**
- Row under "loadHealth with ?live=1" in src/tests/unit/health-live-check.test.ts: key `btoa('not a key')` with live=1 asserts no fetch, no githubAppToken, githubAppSigning.ok false, data.ok equals githubAppSigning.ok. Mutation (dropping `&& githubAppSigning.ok` at the live guard) fails it.

**Reviewer nonBlocking**
- src/lib/sveltekit/health.ts:168: the live branch skips when a key is present but fails signing (Decision 15 named only a missing key or non-GitHub provider); ratified, see top.
- src/tests/unit/health-live-check.test.ts: the independent gate receipt records head c2409fdc while HEAD is a8156613; the implementer's own gate on a8156613 exited 0 and the change is test-only.

**User-facing copy added**
- None as UI copy. New wire values only: detail classes `key_refused`, `installation_not_found`, `installation_suspended`, `unreachable`; the `SHA256:` fingerprint string.
