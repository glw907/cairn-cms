package doctor

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// detailPublicOriginUnconfigured is config.public-origin's fail detail when the resolved
	// origin is the empty string.
	detailPublicOriginUnconfigured = "PUBLIC_ORIGIN is not configured"
	// tmplPublicOriginNotAURL is config.public-origin's fail detail template for a value that
	// does not parse as an absolute URL.
	tmplPublicOriginNotAURL = "PUBLIC_ORIGIN is not a valid URL, got %s"
	// tmplPublicOriginNotHTTPS is config.public-origin's fail detail template for a
	// non-https, non-local origin.
	tmplPublicOriginNotHTTPS = "PUBLIC_ORIGIN must be https in production, got %s"
	// tmplPublicOriginPass is config.public-origin's pass detail template, naming the
	// resolved value and which source produced it.
	tmplPublicOriginPass = "PUBLIC_ORIGIN is %s (%s)"
	// detailPublicOriginSkip is config.public-origin's skip detail: neither the wrangler vars
	// nor the environment named an origin.
	detailPublicOriginSkip = "no wrangler config found and PUBLIC_ORIGIN is not in the environment"
	// sourceWranglerVars and sourceEnvironment name the two origins Snapshot.PublicOrigin can
	// resolve from, in the pass detail.
	sourceWranglerVars = "wrangler vars"
	sourceEnvironment  = "environment"
)

// validatePublicOrigin ports requireOrigin's three rules (src/lib/env.ts:43-66) applied to an
// already-nonempty origin: it must parse as an absolute URL, and it must be https unless its
// hostname is exactly "localhost" or "127.0.0.1" (matched exactly, so a lookalike host like
// localhost.example.com cannot skip the https requirement). Returns the empty string and true
// when origin satisfies both rules.
func validatePublicOrigin(origin string) (failDetail string, ok bool) {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Sprintf(tmplPublicOriginNotAURL, origin), false
	}
	hostname := u.Hostname()
	isLocal := hostname == "localhost" || hostname == "127.0.0.1"
	if !strings.HasPrefix(origin, "https://") && !isLocal {
		return fmt.Sprintf(tmplPublicOriginNotHTTPS, origin), false
	}
	return "", true
}

// ConfigPublicOrigin ports checks-local.ts's configPublicOrigin (:129-152). Snapshot.PublicOrigin
// is resolved by the command layer, wrangler vars taking precedence over the environment, before
// any check runs; this check reads wrangler.jsonc/wrangler.toml itself only to learn whether a
// wrangler config was found at all, matching the ported skip condition: skip only when no
// wrangler config exists and no origin resolved from either source. A wrangler config found with
// no PUBLIC_ORIGIN in its vars and none in the environment falls through to the same
// empty-origin fail every other unconfigured case gets.
var ConfigPublicOrigin = Check{
	ID:        "config.public-origin",
	Condition: spine.ConditionConfigPublicOriginInvalid,
	Run: func(s Snapshot) Result {
		_, found, err := ReadWranglerConfig(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		origin := s.PublicOrigin
		if !found && origin.Source == OriginAbsent {
			return skipResult(detailPublicOriginSkip)
		}
		if origin.Value == "" {
			return failResult(spine.ConditionConfigPublicOriginInvalid, detailPublicOriginUnconfigured)
		}
		if detail, ok := validatePublicOrigin(origin.Value); !ok {
			return failResult(spine.ConditionConfigPublicOriginInvalid, detail)
		}
		source := sourceEnvironment
		if origin.Source == OriginFromVars {
			source = sourceWranglerVars
		}
		return passResult(fmt.Sprintf(tmplPublicOriginPass, origin.Value, source))
	},
}
