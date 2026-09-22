package doctor

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestConfigMediaBucket is table-driven over the four reachable statuses: skip (no binding
// declared), pass (declared binding matches a wrangler r2_buckets entry), fail (declared but
// missing from wrangler), and skip (declared but no wrangler config at all).
func TestConfigMediaBucket(t *testing.T) {
	factsWithBinding := `{"version": 1, "mediaBucketBinding": "MEDIA_BUCKET"}`
	factsNoBinding := `{"version": 1}`

	tests := []struct {
		name       string
		files      map[string]string
		wantStatus Status
		wantDetail string
	}{
		{
			name: "skip: adapter declares no media bucket binding",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsNoBinding,
			},
			wantStatus: StatusSkip,
			wantDetail: skipConfigMediaBucketNone,
		},
		{
			name: "pass: declared binding matches an r2_buckets entry",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsWithBinding,
				"wrangler.jsonc":                     `{"r2_buckets": [{"binding": "MEDIA_BUCKET", "bucket_name": "media"}]}`,
			},
			wantStatus: StatusPass,
			wantDetail: "media bucket MEDIA_BUCKET is declared",
		},
		{
			name: "fail: declared binding is not in wrangler's r2_buckets",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsWithBinding,
				"wrangler.jsonc":                     `{"r2_buckets": [{"binding": "OTHER", "bucket_name": "media"}]}`,
			},
			wantStatus: StatusFail,
			wantDetail: "adapter declares media bucket MEDIA_BUCKET but no matching r2_buckets binding is in wrangler",
		},
		{
			name: "skip: declared binding but no wrangler config found",
			files: map[string]string{
				"src/content/.cairn/site-facts.json": factsWithBinding,
			},
			wantStatus: StatusSkip,
			wantDetail: noWranglerFoundDetail,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := ConfigMediaBucket.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			if result.Detail != tt.wantDetail {
				t.Errorf("Detail = %q, want %q", result.Detail, tt.wantDetail)
			}
		})
	}
}

// TestConfigMediaBucketOwnRemediation asserts config.media-bucket's fail raises its own
// condition, config.media-bucket-missing, and that its registry remediation differs from
// config.bindings-missing's: the defect checks-local.ts:288-291 records, that this check must
// not reproduce.
func TestConfigMediaBucketOwnRemediation(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{
		"src/content/.cairn/site-facts.json": `{"version": 1, "mediaBucketBinding": "MEDIA_BUCKET"}`,
		"wrangler.jsonc":                     `{"r2_buckets": []}`,
	})

	result := ConfigMediaBucket.Run(s)
	if result.Status != StatusFail {
		t.Fatalf("Status = %v, want StatusFail", result.Status)
	}
	if result.Condition != spine.ConditionConfigMediaBucketMissing {
		t.Fatalf("Condition = %q, want %q", result.Condition, spine.ConditionConfigMediaBucketMissing)
	}

	mediaText, ok := spine.TextFor(spine.ConditionConfigMediaBucketMissing)
	if !ok {
		t.Fatal("spine.TextFor(config.media-bucket-missing): no registry entry")
	}
	bindingsText, ok := spine.TextFor(spine.ConditionConfigBindingsMissing)
	if !ok {
		t.Fatal("spine.TextFor(config.bindings-missing): no registry entry")
	}
	if mediaText.Remediation == bindingsText.Remediation {
		t.Error("config.media-bucket-missing's remediation equals config.bindings-missing's; it must print its own")
	}
}
