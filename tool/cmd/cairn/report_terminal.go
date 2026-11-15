package main

import (
	"runtime"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// localeIsUTF8 reports whether the environment names a UTF-8 locale. It reads LC_ALL, then
// LC_CTYPE, then LANG, takes the first non-empty value, and answers true when that value names
// UTF-8 or utf8 in any case, so "en_US.UTF-8", "C.utf8", and "UTF-8" all count. With all three
// unset it answers true on Windows, whose console does not use these variables, and false
// elsewhere. The environment arrives as a function so the check reads nothing itself.
func localeIsUTF8(env func(string) string, goos string) bool {
	for _, name := range []string{"LC_ALL", "LC_CTYPE", "LANG"} {
		if v := env(name); v != "" {
			v = strings.ToLower(v)
			return strings.Contains(v, "utf-8") || strings.Contains(v, "utf8")
		}
	}
	return goos == "windows"
}

// reportTerminal is detectTerminal for a report body: the same answer, with the glyph tier
// dropped to ASCII when the locale is not UTF-8, so the checkmarks and dashes a non-UTF-8
// terminal would print as garbage fall back to plain marks. The colour profile stays as
// detectTerminal chose it, because colour is a terminal capability and the locale says nothing
// about it.
func reportTerminal(d deps, rf *rootFlags) style.Terminal {
	return withLocale(detectTerminal(d, rf), localeIsUTF8(d.env, runtime.GOOS))
}

// withLocale sets t.ASCII when the locale is not UTF-8 and leaves a UTF-8 locale's answer as
// detection made it.
func withLocale(t style.Terminal, utf8 bool) style.Terminal {
	if !utf8 {
		t.ASCII = true
	}
	return t
}
