package store

// setUmask is a no-op on Windows, which has no umask concept.
// TestSaveThenLoadRoundTrip runs on Windows too and calls this no-op stub,
// which exists so the shared test file compiles on every platform.
func setUmask(int) int {
	return 0
}
