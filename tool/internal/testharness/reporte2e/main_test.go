// Package reporte2e drives the built cairn binary through the report commands, health first, as
// a child process: on a pseudo-terminal where a test needs one, against a proxy that fakes the
// site host, and over a registry in a scratch state directory. It holds tests only.
package reporte2e

import (
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

func TestMain(m *testing.M) {
	testharness.Main(m)
}
