package main

import (
	"context"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// cloudflareProbe returns the call cairn auth check runs to confirm one Cloudflare permission
// label, keyed by permissionTable's own labels. The four account-scoped rows need no site; the
// three zone-scoped rows read zoneID, which checkPermission supplies only when the operator
// named a site.
func cloudflareProbe(label string, cf *providers.Cloudflare, zoneID string) func(ctx context.Context) error {
	switch label {
	case "Workers Scripts":
		return func(ctx context.Context) error {
			_, err := cf.ListWorkers(ctx)
			return err
		}
	case "Workers Builds Configuration":
		return func(ctx context.Context) error {
			return cf.BuildsTokens(ctx)
		}
	case "Workers Observability":
		return func(ctx context.Context) error {
			_, err := cf.ObservabilityQuery(ctx, observabilityProbeQuery())
			return err
		}
	case "Zone":
		return func(ctx context.Context) error {
			_, err := cf.ListZones(ctx)
			return err
		}
	case "Zone Settings":
		return func(ctx context.Context) error {
			_, err := cf.ZoneSettings(ctx, zoneID)
			return err
		}
	case "DNS":
		return func(ctx context.Context) error {
			_, err := cf.DNSRecords(ctx, zoneID)
			return err
		}
	case "Email Sending":
		return func(ctx context.Context) error {
			_, err := cf.EmailSendingSubdomains(ctx, zoneID)
			return err
		}
	default:
		return nil
	}
}

// observabilityProbeQuery is the one-hour window cairn auth check queries to confirm Workers
// Observability read access, the same shape the retired auth probe command used.
func observabilityProbeQuery() map[string]any {
	now := time.Now()
	return map[string]any{
		"queryId": "cairn-auth-check",
		"timeframe": map[string]any{
			"from": now.Add(-time.Hour).UnixMilli(),
			"to":   now.UnixMilli(),
		},
		"view":       "events",
		"limit":      1,
		"parameters": map[string]any{"datasets": []string{}},
	}
}
