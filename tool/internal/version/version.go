// Package version reports the cairn binary's build identity.
//
// The version resolves in one precedence, checked in order: the value a
// repository build sets on Version through its ldflags, then the main
// module version runtime/debug.ReadBuildInfo reports for a `go install`
// build, then the literal "dev" when neither is available.
package version

import "runtime/debug"

// devVersion is Version's unset default, and the sentinel String checks before falling back to
// the module version runtime/debug.ReadBuildInfo reports.
const devVersion = "dev"

// Version is the binary's version, set by a repository build via -ldflags.
var Version = devVersion

// Documented is the release the published contract pages describe, the version each one states
// in its own opening line: docs/reference/cli-cairn-exit-codes.md,
// docs/reference/cli-cairn-json-output.md, and docs/reference/cli-cairn-doctor.md.
//
// It is not Version. Version is "dev" in a test binary and carries a git-described value in a
// repository build, so a test holding a page to the release it documents has nothing there to
// compare against. The release session bumps this constant in the same commit that rewrites
// those opening lines, and TestThePagesDescribeTheDocumentedRelease (cmd/cairn) fails when one
// of them is left behind.
const Documented = "1.1.0"

// Commit is the binary's short commit SHA, set only by a repository build via -ldflags: a `go
// install module@version` build carries no VCS stamp to fall back on, so Commit reads "none"
// there by design.
var Commit = "none"

// mainModuleVersion reads the running binary's main module version, as
// runtime/debug.ReadBuildInfo reports it for a `go install` build. A
// package-level var so a test can substitute it without a fake build.
var mainModuleVersion = func() (string, bool) {
	info, ok := debug.ReadBuildInfo()
	if !ok || info.Main.Version == "" || info.Main.Version == "(devel)" {
		return "", false
	}
	return info.Main.Version, true
}

// String reports the resolved version, following the package's stated
// precedence.
func String() string {
	if Version != devVersion {
		return Version
	}
	if v, ok := mainModuleVersion(); ok {
		return v
	}
	return devVersion
}
