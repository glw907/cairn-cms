package store

// setUmask is a no-op on Windows, which has no umask concept.
// TestSaveThenLoadRoundTrip skips before calling it; this stub exists only
// so the shared test file compiles on every platform.
func setUmask(int) int {
	return 0
}
