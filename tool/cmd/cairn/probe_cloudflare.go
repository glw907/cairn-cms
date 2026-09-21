package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// probeCloudflare hits the account-scoped Cloudflare endpoints a health check uses with no
// per-site zone or worker to target, and returns the worst state among them. Zone-scoped
// endpoints (settings, DNS, Email Sending) need a zone id no registry record carries before the
// adopt command exists; tool/docs/credentials.md records those as verified separately.
func probeCloudflare(ctx context.Context, out io.Writer, cf *providers.Cloudflare, accountID string, rec *recordingRoundTripper) spine.State {
	_, _ = fmt.Fprintln(out, "Cloudflare:")
	worst := spine.OK

	run := func(endpoint, method, path string, call func() error) {
		v := providerVerdict(call())
		worst = spine.CombineState(worst, v.state)
		printEndpoint(out, endpoint, v, rec.lookup(method, path))
	}

	run("user/tokens/verify", http.MethodGet, "/client/v4/user/tokens/verify", func() error {
		_, err := cf.VerifyToken(ctx)
		return err
	})
	run("accounts/{id}/workers/scripts", http.MethodGet, "/client/v4/accounts/"+accountID+"/workers/scripts", func() error {
		_, err := cf.ListWorkers(ctx)
		return err
	})
	run("accounts/{id}/workers/domains", http.MethodGet, "/client/v4/accounts/"+accountID+"/workers/domains", func() error {
		_, err := cf.WorkerDomains(ctx)
		return err
	})
	run("accounts/{id}/workers/observability/telemetry/query", http.MethodPost, "/client/v4/accounts/"+accountID+"/workers/observability/telemetry/query", func() error {
		now := time.Now()
		_, err := cf.ObservabilityQuery(ctx, map[string]any{
			"queryId": "cairn-probe-token",
			"timeframe": map[string]any{
				"from": now.Add(-time.Hour).UnixMilli(),
				"to":   now.UnixMilli(),
			},
			"view":       "events",
			"limit":      1,
			"parameters": map[string]any{"datasets": []string{}},
		})
		return err
	})

	return worst
}
