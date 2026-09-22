package doctor

import (
	"encoding/json"
	"fmt"
)

// siteFactsRelPath is the committed engine-facts file every facts-dependent check reads,
// resolved under Snapshot.Dir through the same containment ReadUnder enforces on every other
// file. See docs/reference/site-facts.md for the contract it mirrors.
const siteFactsRelPath = "src/content/.cairn/site-facts.json"

// siteFactsSupportedVersion is the only site-facts.json version this reader accepts.
const siteFactsSupportedVersion = 1

// factsAbsentDetail is the exact message every check backed by site-facts.json reports when the
// file does not exist: a site that has not yet run cairn-manifest on the engine version that
// introduced the contract, not a real check failure.
const factsAbsentDetail = "needs engine 0.97.0 or later, and one build"

// SiteFacts is the adapter-derived facts a site's committed site-facts.json carries, the three
// values docs/reference/site-facts.md names. Each Has field distinguishes "declared as this
// value" from "declared nothing", the same optional-field distinction the engine's own writer
// makes by omitting the key.
type SiteFacts struct {
	// HasMediaBucketBinding reports whether the adapter declared cairn.media.bucketBinding.
	HasMediaBucketBinding bool
	// MediaBucketBinding is the declared media bucket binding name. Meaningful only when
	// HasMediaBucketBinding is true.
	MediaBucketBinding string
	// Roles is the adapter's declared role vocabulary, unfiltered: the raw key set of
	// cairn.roles, DEFAULT_ROLES (owner, editor) included when the adapter names them
	// explicitly. Nil for a zero-config site that declares no roles at all.
	Roles []string
	// HasAIPosture reports whether the adapter declared cairn.aiPosture.
	HasAIPosture bool
	// AIPosture is the declared posture, "decline" or "invite". Meaningful only when
	// HasAIPosture is true.
	AIPosture string
}

// siteFactsFile is the on-disk JSON shape site-facts.json carries.
type siteFactsFile struct {
	Version            int            `json:"version"`
	MediaBucketBinding *string        `json:"mediaBucketBinding"`
	Roles              map[string]any `json:"roles"`
	AIPosture          *string        `json:"aiPosture"`
}

// ReadSiteFacts reads and parses s.Dir's committed site-facts.json. found is false when the file
// does not exist, which every facts-dependent check reports as unchecked with factsAbsentDetail
// rather than treating as its own containment or parse error. err is non-nil for a containment
// refusal, a JSON parse failure, or a version other than siteFactsSupportedVersion, each naming
// the file so an operator knows which one to regenerate with cairn-manifest.
func ReadSiteFacts(s Snapshot) (facts SiteFacts, found bool, err error) {
	body, ok, err := s.ReadFile(siteFactsRelPath)
	if err != nil {
		return SiteFacts{}, false, err
	}
	if !ok {
		return SiteFacts{}, false, nil
	}

	var raw siteFactsFile
	if err := json.Unmarshal(body, &raw); err != nil {
		return SiteFacts{}, false, fmt.Errorf("%s: %w", siteFactsRelPath, err)
	}
	if raw.Version != siteFactsSupportedVersion {
		return SiteFacts{}, false, fmt.Errorf(
			"%s: unsupported version %d, want %d", siteFactsRelPath, raw.Version, siteFactsSupportedVersion,
		)
	}

	if raw.MediaBucketBinding != nil {
		facts.HasMediaBucketBinding = true
		facts.MediaBucketBinding = *raw.MediaBucketBinding
	}
	if len(raw.Roles) > 0 {
		facts.Roles = make([]string, 0, len(raw.Roles))
		for name := range raw.Roles {
			facts.Roles = append(facts.Roles, name)
		}
	}
	if raw.AIPosture != nil {
		facts.HasAIPosture = true
		facts.AIPosture = *raw.AIPosture
	}
	return facts, true, nil
}
