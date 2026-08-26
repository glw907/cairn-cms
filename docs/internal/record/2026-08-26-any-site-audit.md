# The retroactive any-site audit (2026-08-26)

The whole-surface audit mandated by the engine-consultation spec
(`docs/superpowers/specs/2026-08-26-engine-consultation-design.md` §4): every public item
argued against the codified standard, ranked weakest-to-strongest anonymous-consumer case,
verdicted keep / reshape / retire, and independently verified. Per-item entries live in the
rulings ledger ([engine-rulings.md](../engine-rulings.md), audit section); the full
arguments live in this record's artifact directory
([2026-08-26-any-site-audit/](2026-08-26-any-site-audit/)).

## Scope and enumeration

Enumerated mechanically from `api-surface.md` at HEAD (regenerated, zero diff): 18 export
subpaths, 641 symbol lines, 411 unique items (deduped across subpaths, each carrying its
`surfaced at` list; four name collisions kept as flagged items). Two export-less subsystems
enumerated from their contract sources: the log vocabulary (74 events, from
`docs/reference/log-events.md` and `src/lib/log/`) and the CLI surface (50 items across the
four bin commands plus `create-cairn-site` and the supported-toolchain contract). Total:
**535 items in 11 subsystems**, reconciled exactly against the inputs at every stage.

## Method

A workflow implementing spec §4's seven points: per-subsystem forced rankings (no empty
returns, no ties) with provenance per item; verification following the ranking (weakest 15%,
every non-keep, every family-originated or absence-of-objection keep), prompted in both
directions; a second-vantage agent on the six 2026-08-01 suspects asking the wrong-premise
question; a whole-surface coherence read; and a trustworthiness auditor with authority to
condemn. All reviewer roles on `claude-opus-5`.

**Run history.** The first run was condemned by its own trustworthiness auditor on the named
empty-subsystem signature: the CLI ranker nulled on a conductor script bug (an undeclared
identifier in its schema option). The condemnation preserved the ten completed subsystems
explicitly; the run resumed from cache with the CLI ranker fixed and rescoped, an
incremental coherence re-merge, and a fresh trust pass. The second trust verdict:
**trustworthy**, with one repair assigned to the conductor (below).

## Final adjudicated tally

535 items: **384 keep, 57 reshape, 94 retire** (28% non-keep), after 33 verification
overturns and 5 conductor adjudications.

| Subsystem | Items | Keep | Reshape | Retire |
|---|---|---|---|---|
| adapter-concept-model | 118 | 114 | 2 | 2 |
| route-factories (`/sveltekit`) | 130 | 71 | 6 | 53 |
| admin-shell-toolkit | 59 | 36 | 5 | 18 |
| auth-family | 24 | 7 | 12 | 5 |
| cloudflare-audit-sink | 4 | 2 | 2 | 0 |
| media | 7 | 5 | 2 | 0 |
| delivery | 49 | 43 | 0 | 6 |
| render-build-tooling | 8 | 3 | 1 | 4 |
| reproductions | 12 | 7 | 2 | 3 |
| log-vocabulary | 74 | 63 | 11 | 0 |
| cli-surface | 50 | 33 | 14 | 3 |

## The conductor's merge repair and adjudications

The trust pass found that five subsystems received two verification passes and the merge
silently kept only the second, dropping four substantiated overturns and one conflict. The
conductor restored the dissent and adjudicated each on the record:

- **`DEFAULT_ROLES` → keep** (restored pass-1 overturn). `defineAccess` requires a concrete
  `RolesDeclaration` and `docs/extend/restrict-admin-access.md:14` instructs the import
  twice: a documented anonymous-consumer path, and the hand-rolled literal is validation
  input that drifts if the engine widens its defaults. Retire becomes correct only together
  with a `defineAccess` reshape to accept `undefined` (its three siblings do); that reshape
  is filed in remediation, and this entry reopens when it lands.
- **`SelectInput`, `SelectInputOption` → retire** (restored pass-1 overturn). The keep's one
  engine-owned claim is falsified by the shipped artifact: `.select-sm` compiles into
  `dist/components/cairn-admin.css`, whose class inventory `admin-css-safelist.ts:104` names
  a de facto public API. Pass 2's narrower keep rested on family adoption, which constraint
  2 rules insufficient by itself.
- **`TextInput` → retire** (conflict adjudicated: pass 1 retire vs pass 2 reshape). Same
  shipped-sheet ground as `SelectInput`; the xcathletes type-union defect
  (`record/2026-08-21-xcathletes-pass-2-harvest.md:21`) is real but dies with the export.
  The field tier reduces to `FieldLabel`, whose keep is the subpath's strongest (an
  unlayered width rule a consumer cannot outrank from a components-layer rule).
- **`devDelivery` → retire** (pass-2 dissent upheld over pass 1's keep-flip). A site that
  hand-rolls the one-line transport gets no guard at all, which is the discoverability
  class the gate's fails-when line names; the one built consumer gates the call with its
  own identical check before delegating.

## Verification and the second vantage

33 overturns across 9 of 11 subsystems (6.2% overall, up to 17% in auth-family), running in
every direction, including a bucket-wide wrong-premise catch: the auth-family ranking's "no
built consumer" claim was stale (aksailingclub-org and xcathletes both import the surface
today), which re-grounded 15 of its 24 arguments. The second vantage found five of the six
2026-08-01 suspects still requirement-shaped and acquitted `/cloudflare` with reasons (the
engine overrode the filed requirement's shape rather than transplanting it): a probe that
returned a reasoned negative.

**Carried caveat (trust):** adapter-concept-model's 114/118 keep rate leans on the C2
export-rule closure being mechanically closed, and its verifier found three live leaks
(`NavIcon`, `EngineScreenId`, `SlotKind`); the ~22 C2_READDED keeps sit on an unsettled
ground and are re-tested by the remediation's R4 re-derivation. The 15 field arms stand on
the stronger TS4023 ground independently.

## Coherence findings

Fifteen findings, seven structural (see [coherence.md](2026-08-26-any-site-audit/coherence.md)
and [coherence-v2.md](2026-08-26-any-site-audit/coherence-v2.md)); the structural seven feed
remediation directly:

1. No canonical-home rule: one type importable under up to five names; all four flagged
   collisions are drift, not layering.
2. Nine sibling factories, four parameter-bag conventions, violating ratified R1.
3. Two mechanisms for naming a factory's return; the hand-written half drifts.
4. No naming rule beyond the factory verbs: three verbs each for the verify, parse, and
   build jobs.
5. ~15 public functions named as bare nouns, indistinguishable from constants.
6. Five idioms for "what happened" (result unions, booleans, throws, sentinels).
7. The R4 closure over-applied; adapter and route-factories reached opposite dispositions;
   narrowing `ContentRoutes` reconciles them.

Cosmetic but notable: four exports the engine itself declined to use (`checkRateLimit`,
`formatTimestamp`, `normalizeAssets`, `feedView`); consumer vocabulary baked into engine
signatures in three unrelated subsystems; ten exported names for `{error: string}` across
three unruled suffixes.

## Bucket partition notes

The nine export buckets cover the 18 subpath headings exactly once; shared symbols were
assigned to the highest-priority bucket in their `surfaced at` list, one verdict per symbol.
Every `docs/reference/README.md` page maps to one bucket; `supported-toolchain.md` rides
with the CLI/tooling bucket by conductor judgment. `createSectionAction` and
`createD1AuditSink` live under `/sveltekit`, not `/cloudflare`, and were audited there.

## Execution

Verdicts and the remediation plan only; no diffs in this pass. The remediation entry in
`ROADMAP.md` (Now tier) itemizes the 94 retires, 57 reshapes, and the seven structural
coherence families, sequenced before beta, batched into one `Consumers must:` window. No
retire executed inline: every retire has at least a docs consumer, so none met the
trivial-retire bar.
