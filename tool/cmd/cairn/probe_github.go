package main

import (
	"context"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// githubProbe returns the call cairn auth check runs to confirm one GitHub permission label,
// keyed by permissionTable's own labels. Metadata is account-scoped: every fine-grained token
// carries it by default, and a request no repository name reaches (GET /rate_limit) confirms the
// token is usable at all. Contents is repository-scoped and needs owner/repo and the site's own
// default branch, which checkPermission supplies only when the operator named a site: a
// repository whose default branch is not main answers 404 at any other ref, and a read permission
// the token holds would report as not-found.
func githubProbe(label string, gh *providers.GitHub, owner, repo, branch string) func(ctx context.Context) error {
	switch label {
	case "Contents":
		return func(ctx context.Context) error {
			_, err := gh.FileAtRef(ctx, owner, repo, "package.json", branch)
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
