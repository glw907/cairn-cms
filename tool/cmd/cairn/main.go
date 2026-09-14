// Command cairn is the operator CLI for a cairn-cms production site: registry
// adoption, read-only health checks, log queries, and a scheduled tripwire.
package main

import (
	"fmt"
	"os"
)

func main() {
	cmd := newRootCmd()
	if err := cmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
