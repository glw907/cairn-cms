package testharness

import "os/exec"

// ownGroup is a no-op off Linux (the Darwin and Windows files are identical): the harness runs its cases on Linux only (NewCase skips
// elsewhere), and this file exists so the package builds on every platform the tool does.
func ownGroup(*exec.Cmd) {}
