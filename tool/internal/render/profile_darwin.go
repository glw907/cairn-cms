package render

// enableVirtualTerminal is a no-op on macOS: a real terminal here already interprets ANSI
// escapes, so there is nothing to enable. Windows is the one platform with an opt-in mode
// (profile_windows.go).
func enableVirtualTerminal(_ uintptr) bool {
	return true
}
