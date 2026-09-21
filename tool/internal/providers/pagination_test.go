package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
)

// Every getPaginated caller is covered here against a body recorded from the live API on
// 2026-09-21, one per route, because a hand-written fixture is what let the defect through: the
// old fixtures all carried a total_pages, the field the walk read, and three of the six real
// routes do not send one at all. The routes and what each proves:
//
//   - /accounts/{id}/workers/domains: per_page and total_count, no total_pages. Seven domains at
//     one per page, which the old rule read as one page and one domain.
//   - /accounts/{id}/workers/scripts: no result_info at all.
//   - /zones and /zones/{id}/dns_records: total_pages.
//   - /zones/{id}/settings and /zones/{id}/email/sending/subdomains: no result_info.

// corpusPageRoundTripper serves one recorded body for page 1 and another for every later page,
// so a route whose real first page carries only part of the result can be walked to the end.
type corpusPageRoundTripper struct {
	first []byte
	rest  []byte
	// requested records every "page" value the walk asked for, in order.
	requested []string
}

func (rt *corpusPageRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	page := req.URL.Query().Get("page")
	rt.requested = append(rt.requested, page)
	body := rt.rest
	if page == "1" || rt.rest == nil {
		body = rt.first
	}
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(bytes.NewReader(body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// corpusBody reads one recorded fixture's body, failing the test when it is missing.
func corpusBody(t *testing.T, name string) []byte {
	t.Helper()
	status, body, err := Corpus("cloudflare", name)
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusOK {
		t.Fatalf("%s: recorded status %d, want 200", name, status)
	}
	return body
}

// resultInfoOf decodes the result_info a recorded body carries, so a test asserts against the
// live pagination metadata rather than against numbers retyped into the test.
func resultInfoOf(t *testing.T, body []byte) resultInfo {
	t.Helper()
	var env struct {
		ResultInfo *resultInfo `json:"result_info"`
	}
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatal(err)
	}
	if env.ResultInfo == nil {
		return resultInfo{}
	}
	return *env.ResultInfo
}

// TestWorkerDomainsWalksEveryPageOfTheLiveShape is the defect's own regression. The recorded
// first page reports per_page 1 and total_count 7 and no total_pages, which the walk used to read
// as a single page; discovery then saw one of the account's seven custom domains, and every
// production site but the one on page 1 failed to adopt.
func TestWorkerDomainsWalksEveryPageOfTheLiveShape(t *testing.T) {
	first := corpusBody(t, "workers_domains.page1.200.json")
	info := resultInfoOf(t, first)
	if info.TotalPages != 0 {
		t.Fatalf("the recorded body carries total_pages %d; the fixture no longer shows the live shape", info.TotalPages)
	}
	if info.PerPage != 1 || info.TotalCount < 2 {
		t.Fatalf("recorded result_info = %+v, want per_page 1 and a total_count above 1", info)
	}

	rt := &corpusPageRoundTripper{first: first, rest: first}
	cf := NewCloudflare("acct123", Credential{}, rt)

	domains, err := cf.WorkerDomains(context.Background())
	if err != nil {
		t.Fatalf("WorkerDomains: %v", err)
	}
	if len(domains) != info.TotalCount {
		t.Errorf("WorkerDomains returned %d domains, want the total_count %d the live body reports", len(domains), info.TotalCount)
	}
	if len(rt.requested) != info.TotalCount {
		t.Errorf("the walk requested %d pages (%v), want %d", len(rt.requested), rt.requested, info.TotalCount)
	}
}

// TestWorkerDomainsStopsOnTheEmptyPagePastTheEnd covers the stop that holds even when every count
// is wrong: Cloudflare answers the page after the last with an empty result rather than an error.
func TestWorkerDomainsStopsOnTheEmptyPagePastTheEnd(t *testing.T) {
	rt := &corpusPageRoundTripper{
		first: corpusBody(t, "workers_domains.page1.200.json"),
		rest:  corpusBody(t, "workers_domains.page-past-end.200.json"),
	}
	cf := NewCloudflare("acct123", Credential{}, rt)

	domains, err := cf.WorkerDomains(context.Background())
	if err != nil {
		t.Fatalf("WorkerDomains: %v", err)
	}
	if len(domains) != 1 {
		t.Errorf("WorkerDomains returned %d domains, want the 1 the non-empty page carried", len(domains))
	}
	if len(rt.requested) != 2 {
		t.Errorf("the walk requested %v, want it to stop on the first empty page", rt.requested)
	}
}

// TestASingleBodyRouteIsReadOnce covers the three routes whose live response carries no
// result_info at all, plus the two that report total_pages 1: each returns everything it has in
// one body, and the walk must not ask for a second page it would only re-read.
func TestASingleBodyRouteIsReadOnce(t *testing.T) {
	tests := []struct {
		name    string
		fixture string
		read    func(*Cloudflare) (int, error)
	}{
		{"workers scripts", "workers_scripts.list.200.json", func(cf *Cloudflare) (int, error) {
			out, err := cf.ListWorkers(context.Background())
			return len(out), err
		}},
		{"zones", "zones.list.200.json", func(cf *Cloudflare) (int, error) {
			out, err := cf.ListZones(context.Background())
			return len(out), err
		}},
		{"dns records", "zone_dns_records.list.200.json", func(cf *Cloudflare) (int, error) {
			out, err := cf.DNSRecords(context.Background(), "zone-1")
			return len(out), err
		}},
		{"zone settings", "zone_settings.list.200.json", func(cf *Cloudflare) (int, error) {
			out, err := cf.ZoneSettings(context.Background(), "zone-1")
			return len(out), err
		}},
		{"email sending subdomains", "zone_email_sending_subdomains.list.200.json", func(cf *Cloudflare) (int, error) {
			out, err := cf.EmailSendingSubdomains(context.Background(), "zone-1")
			return len(out), err
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := corpusBody(t, tt.fixture)
			rt := &corpusPageRoundTripper{first: body}
			cf := NewCloudflare("acct123", Credential{}, rt)

			got, err := tt.read(cf)
			if err != nil {
				t.Fatalf("read: %v", err)
			}
			if got == 0 {
				t.Error("the recorded body decoded to no entries at all")
			}
			if len(rt.requested) != 1 {
				t.Errorf("the walk requested %v, want one page", rt.requested)
			}
		})
	}
}

// TestGetPaginatedStopsAtTheHardCap covers a route that keeps claiming another page forever. No
// live route does this; the cap is what keeps a provider bug from becoming an unbounded loop in
// a scheduled run, and without a test it is a constant nothing reads.
func TestGetPaginatedStopsAtTheHardCap(t *testing.T) {
	rt := &corpusPageRoundTripper{first: []byte(fmt.Sprintf(
		`{"success":true,"result":[{"id":"one","tag":"t1"}],"result_info":{"per_page":1,"total_count":%d}}`,
		maxPaginatedPages*10,
	))}
	cf := NewCloudflare("acct123", Credential{}, rt)

	workers, err := cf.ListWorkers(context.Background())
	if err != nil {
		t.Fatalf("ListWorkers: %v", err)
	}
	if len(rt.requested) != maxPaginatedPages {
		t.Errorf("the walk requested %d pages, want it capped at %d", len(rt.requested), maxPaginatedPages)
	}
	if len(workers) != maxPaginatedPages {
		t.Errorf("ListWorkers returned %d workers, want %d", len(workers), maxPaginatedPages)
	}
}

// TestMorePagesReadsWhicheverFieldsArrived covers the decision table directly, including the two
// shapes no recorded route happens to carry: a route reporting per_page with neither total, and
// a short final page.
func TestMorePagesReadsWhicheverFieldsArrived(t *testing.T) {
	tests := []struct {
		name string
		info resultInfo
		page int
		got  int
		want bool
	}{
		{"an empty page ends the walk", resultInfo{TotalPages: 9}, 1, 0, false},
		{"total_pages not yet reached", resultInfo{TotalPages: 3}, 2, 1, true},
		{"total_pages reached", resultInfo{TotalPages: 3}, 3, 1, false},
		{"total_count not yet covered", resultInfo{PerPage: 1, TotalCount: 7}, 6, 1, true},
		{"total_count covered", resultInfo{PerPage: 1, TotalCount: 7}, 7, 1, false},
		{"a full page under per_page alone", resultInfo{PerPage: 2}, 1, 2, true},
		{"a short page under per_page alone", resultInfo{PerPage: 2}, 1, 1, false},
		{"no result_info at all", resultInfo{}, 1, 14, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := morePages(tt.info, tt.page, tt.got); got != tt.want {
				t.Errorf("morePages(%+v, page %d, got %d) = %v, want %v", tt.info, tt.page, tt.got, got, tt.want)
			}
		})
	}
}
