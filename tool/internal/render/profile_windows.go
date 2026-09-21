package render

import "golang.org/x/sys/windows"

// enableVirtualTerminal attempts to turn on ENABLE_VIRTUAL_TERMINAL_PROCESSING on fd, and reports
// whether the console accepted it. DetectProfile calls this rather than only querying the mode,
// because a query-only implementation would ship every conhost operator the ASCII tier and no
// colour even on a console that supports virtual-terminal mode but has not had it turned on
// (criterion 17). x/sys/windows is already a dependency (Task 5's store package), so this adds
// none.
func enableVirtualTerminal(fd uintptr) bool {
	h := windows.Handle(fd)
	var mode uint32
	if err := windows.GetConsoleMode(h, &mode); err != nil {
		return false
	}
	if mode&windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING != 0 {
		return true
	}
	return windows.SetConsoleMode(h, mode|windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING) == nil
}
