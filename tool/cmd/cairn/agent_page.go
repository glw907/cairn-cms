package main

import _ "embed"

// agentPage is docs/admin/set-up-with-an-agent.md, the page `cairn new` prints when it has no
// terminal and no mode flag. `make agent-guide` copies it here, because go:embed reaches only the
// package's directory, and TestAgentPageMatchesTheDocsPage fails when the copy drifts.
//
//go:embed set-up-with-an-agent.md
var agentPage string
