package record

import (
	"fmt"
	"net"
	"regexp"
	"strings"
)

// siteIDShape mirrors the Node CLI's SITE_ID_SHAPE
// (packages/create-cairn-site/src/state.mjs): a slug of lowercase
// alphanumeric segments followed by a six-character lowercase alphanumeric
// suffix.
var siteIDShape = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$`)

// domainLabel is one dot-separated label of a bare LDH domain name: letters,
// digits, and interior hyphens only, never a leading or trailing hyphen.
var domainLabel = regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$`)

// ValidateSiteID checks that id matches the Node CLI's site id shape: one or
// more lowercase-alphanumeric segments joined by hyphens, ending in a
// six-character lowercase-alphanumeric suffix. It returns an error when id
// does not match.
func ValidateSiteID(id string) error {
	if !siteIDShape.MatchString(id) {
		return fmt.Errorf("record: site id %q does not match the required shape", id)
	}
	return nil
}

// ValidateDomain checks that domain is a bare LDH DNS name: no scheme,
// userinfo, port, path, query, fragment, or IP literal, and every
// dot-separated label is letters, digits, and interior hyphens only. It
// returns an error when domain does not match.
//
// ValidateDomain is resolution-free by design: it checks shape, not whether
// the name resolves or where it resolves to. A record's domain reaching a
// private or loopback address is a live check against the network, and
// belongs to Adopt, not this parser.
func ValidateDomain(domain string) error {
	if domain == "" {
		return fmt.Errorf("record: domain is empty")
	}
	// A scheme, userinfo, port, path, query, or fragment all introduce one
	// of these characters into a bare hostname; rejecting them here also
	// rejects an IPv6 literal, which cannot appear in a bare LDH name.
	if strings.ContainsAny(domain, "/@#?: \t\n") {
		return fmt.Errorf("record: domain %q is not a bare hostname", domain)
	}
	if net.ParseIP(domain) != nil {
		return fmt.Errorf("record: domain %q is an IP literal, not a hostname", domain)
	}
	if strings.HasPrefix(domain, ".") || strings.HasSuffix(domain, ".") || strings.Contains(domain, "..") {
		return fmt.Errorf("record: domain %q has an empty label", domain)
	}
	for label := range strings.SplitSeq(domain, ".") {
		if !domainLabel.MatchString(label) {
			return fmt.Errorf("record: domain %q has an invalid label %q", domain, label)
		}
	}
	return nil
}
