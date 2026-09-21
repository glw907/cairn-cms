package main

import (
	"context"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// githubProbe returns the call cairn auth check runs to confirm one GitHub permission label,
// keyed by permissionTable's own labels. Metadata is account-scoped: every fine-grained token
// carries it by default, and a request no repository name reaches (GET /rate_limit) confirms the
// token is usable at all. Contents is repository-scoped and needs owner/repo, which
// checkPermission supplies only when the operator named a site.
func githubProbe(label string, gh *providers.GitHub, owner, repo string) func(ctx context.Context) error {
	switch label {
	case "Contents":
		return func(ctx context.Context) error {
			_, err := gh.FileAtRef(ctx, owner, repo, "package.json", "main")
			return err
		}
	case "Metadata":
		return func(ctx context.Context) error {
			_, err := gh.TokenExpiry(ctx)
			return err
		}
	default:
		return nil
	}
}
