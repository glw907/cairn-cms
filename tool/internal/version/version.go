// Package version reports the cairn binary's build identity.
//
// The version resolves in one precedence, checked in order: the value a
// repository build sets on Version through its ldflags, then the main
// module version runtime/debug.ReadBuildInfo reports for a `go install`
// build, then the literal "dev" when neither is available.
package version

import "runtime/debug"

// Version is the binary's version, set by a repository build via -ldflags.
var Version = "dev"

// Commit is the binary's short commit SHA, set by a repository build via -ldflags.
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
	if Version != "dev" {
		return Version
	}
	if v, ok := mainModuleVersion(); ok {
		return v
	}
	return "dev"
}
