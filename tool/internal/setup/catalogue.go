package setup

import "slices"

// Catalogue returns the sentences this package hands a view to print outside the ruled copy
// deck: the summary's three refusals. cmd/copylist reads it to build the copy golden. The
// waiting sentences are the owner's ruled deck and stay out until copy-standard section 2.5's
// comma rule and the two Cloudflare sentences agree.
func Catalogue() []string {
	out := []string{problemEmail, problemAddress, problemHost}
	slices.Sort(out)
	return out
}
