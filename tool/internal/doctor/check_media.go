package doctor

import (
	"fmt"
	"slices"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

const (
	// skipConfigMediaBucketNone is config.media-bucket's skip detail: the adapter declares no
	// media bucket binding, the R2 half never added to config.bindings (checks-local.ts:38-41)
	// so a no-media site never fails on a binding it never asked for.
	skipConfigMediaBucketNone = "no media assets configured"
	// tmplConfigMediaBucketFail is config.media-bucket's own fail detail template. It carries
	// its own condition and its own remediation, config.media-bucket-missing's, rather than
	// borrowing config.bindings-missing's, the defect checks-local.ts:288-291 records.
	tmplConfigMediaBucketFail = "adapter declares media bucket %s but no matching r2_buckets binding is in wrangler"
	// tmplConfigMediaBucketPass is config.media-bucket's pass detail template.
	tmplConfigMediaBucketPass = "media bucket %s is declared"
)

// ConfigMediaBucket ports checks-local.ts's configMediaBucket (:42-58): the adapter's declared
// media bucket binding must have a matching r2_buckets entry in the wrangler config. It reads
// SiteFacts for the declared binding, so it reports unchecked with factsAbsentDetail when
// site-facts.json is absent, before it ever reads wrangler.
var ConfigMediaBucket = Check{
	ID:        "config.media-bucket",
	Condition: spine.ConditionConfigMediaBucketMissing,
	Run: func(s Snapshot) Result {
		facts, found, err := ReadSiteFacts(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !found {
			return uncheckedResult(factsAbsentDetail)
		}
		if !facts.HasMediaBucketBinding {
			return skipResult(skipConfigMediaBucketNone)
		}
		wrangler, wranglerFound, err := ReadWranglerConfig(s)
		if err != nil {
			return uncheckedResult(err.Error())
		}
		if !wranglerFound {
			return skipResult(noWranglerFoundDetail)
		}
		if !slices.Contains(wrangler.R2Buckets, facts.MediaBucketBinding) {
			return failResult(spine.ConditionConfigMediaBucketMissing,
				fmt.Sprintf(tmplConfigMediaBucketFail, facts.MediaBucketBinding))
		}
		return passResult(fmt.Sprintf(tmplConfigMediaBucketPass, facts.MediaBucketBinding))
	},
}
