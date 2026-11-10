//go:build cairne2e

// This file exists only under the cairne2e build tag, which the end-to-end harness sets and a
// release build never does. It gives setup the git config pair that sends https://github.com/ to
// the harness's local bare repositories, because setup's git children read no GIT_CONFIG_*
// variable from the environment. CAIRN_E2E_GIT_REMOTES names the directory holding the
// repositories; with it unset, setup gets no pair. It also turns off the domain step's wait on the
// zone's nameserver, which the harness's fake zones cannot answer.

package main

import (
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
)

func init() {
	siteAuthority = func(*providers.Probe) providers.AuthorityLookup { return nil }
	gitConfigPairs = func(env map[string]string) []childenv.Pair {
		remotes := env["CAIRN_E2E_GIT_REMOTES"]
		if remotes == "" {
			return nil
		}
		return []childenv.Pair{{Key: "url." + remotes + "/.insteadOf", Value: "https://github.com/"}}
	}
}
