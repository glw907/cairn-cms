package render

import (
	"cmp"
	"encoding/json"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// The schema version of each published payload, one integer per payload type rather than one
// number across all five: the payloads change for unrelated reasons, and a single number would
// make every consumer of every payload re-read a schema because one unrelated payload gained a
// field. Each starts at health.Report's own schema version, the number the tool already
// published, so a consumer reading the report's version before this boundary existed is not
// handed a lower number now. tool/docs/reference/json-output.md carries the promise each one
// makes: a key is added within a version, and never removed or retyped within one.
const (
	// SiteSchemaVersion versions the single-site health payload and every per-site NDJSON line.
	SiteSchemaVersion = 1
	// SummarySchemaVersion versions the NDJSON stream's final summary line.
	SummarySchemaVersion = 1
	// SitesListSchemaVersion versions the sites list payload.
	SitesListSchemaVersion = 1
	// LogsSchemaVersion versions the logs payload.
	LogsSchemaVersion = 1
	// AdoptListSchemaVersion versions the adopt candidate list payload.
	AdoptListSchemaVersion = 1
)

// The kind each payload declares, so a consumer reading a mixed stream keys off a field rather
// than off the shape it happens to see.
const (
	kindSite      = "site"
	kindSummary   = "summary"
	kindSites     = "sites"
	kindLogs      = "logs"
	kindAdoptList = "adoptCandidates"
)

// sitePayload is one site's machine-readable health result. It is the whole published shape:
// every key here is under the schema-version promise, and the single-site form is the per-site
// NDJSON line plus exitCode and nothing else, so an agent writes one parser for both.
type sitePayload struct {
	SchemaVersion int    `json:"schemaVersion"`
	Kind          string `json:"kind"`
	Site          string `json:"site"`
	Domain        string `json:"domain"`
	Verdict       string `json:"verdict"`
	// ExitCode is the run's code, never the site's, and is therefore absent from a per-site
	// NDJSON line: a stream's first line is one site of many, and a code sitting on it would be
	// read as the run's own.
	ExitCode     *int           `json:"exitCode,omitempty"`
	CheckedAt    string         `json:"checkedAt"`
	DurationMs   int64          `json:"durationMs"`
	Degraded     bool           `json:"degraded"`
	Acknowledged []string       `json:"acknowledged"`
	Checks       []checkPayload `json:"checks"`
}

// checkPayload is one check's settled result on the wire.
type checkPayload struct {
	CheckID   string `json:"checkId"`
	State     string `json:"state"`
	Reason    string `json:"reason,omitempty"`
	Condition string `json:"condition,omitempty"`
	Code      string `json:"code,omitempty"`
	Tier      string `json:"tier"`
	Detail    string `json:"detail,omitempty"`
	CheckedAt string `json:"checkedAt"`
	// Fields holds the values cairn derived itself, as an object so a consumer indexes a key
	// rather than scanning an array of key-value pairs.
	Fields map[string]json.RawMessage `json:"fields,omitempty"`
	// Observed holds the values copied out of a provider's response, each with the source it
	// was copied from. A site controls those bytes; the mark is what a consumer's own rule
	// about untrusted data keys on.
	Observed map[string]observedValue `json:"observed,omitempty"`
	Fix      *fixPayload              `json:"fix,omitempty"`
	Hold     *holdPayload             `json:"hold,omitempty"`
}

// observedValue is one copied value beside the provider it came from.
type observedValue struct {
	Value  json.RawMessage `json:"value"`
	Source string          `json:"source"`
}

// fixPayload is the structured fix a consumer switches on rather than a sentence it parses.
type fixPayload struct {
	Summary string `json:"summary"`
	Command string `json:"command,omitempty"`
	URL     string `json:"url,omitempty"`
	Actor   string `json:"actor"`
	Outward bool   `json:"outward"`
}

// holdPayload is one acknowledgement on the wire.
type holdPayload struct {
	Until   string `json:"until"`
	Expired bool   `json:"expired"`
}

// summaryPayload is the NDJSON stream's final line. A stream that carries none is UNKNOWN: a
// truncated stream and a complete one are otherwise indistinguishable.
type summaryPayload struct {
	SchemaVersion int            `json:"schemaVersion"`
	Kind          string         `json:"kind"`
	Verdict       string         `json:"verdict"`
	ExitCode      int            `json:"exitCode"`
	CheckedAt     string         `json:"checkedAt"`
	DurationMs    int64          `json:"durationMs"`
	Sites         int            `json:"sites"`
	Counts        map[string]int `json:"counts"`
	WorstFirst    []string       `json:"worstFirst"`
}

// sitesListPayload is cairn sites list's own payload. Every listed site carries enough for a
// consumer to act without a second call.
type sitesListPayload struct {
	SchemaVersion int             `json:"schemaVersion"`
	Kind          string          `json:"kind"`
	Verdict       string          `json:"verdict"`
	ExitCode      int             `json:"exitCode"`
	Sites         []SiteListEntry `json:"sites"`
	Errors        []string        `json:"errors,omitempty"`
}

// SiteListEntry is one registered site in the sites list payload: the id a later command takes,
// the display name, the public domain, and the last step the record recorded.
type SiteListEntry struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Domain string `json:"domain"`
	Step   string `json:"step"`
}

// logsPayload is cairn logs's own payload.
type logsPayload struct {
	SchemaVersion int    `json:"schemaVersion"`
	Kind          string `json:"kind"`
	Verdict       string `json:"verdict"`
	ExitCode      int    `json:"exitCode"`
	Site          string `json:"site"`
	// ContainsPersonalData carries the notice a non-JSON run prints to stderr. Under --json
	// stderr is silent, so the warning has to be in the payload or it reaches nobody.
	ContainsPersonalData bool       `json:"containsPersonalData"`
	Entries              []logEntry `json:"entries"`
}

// logEntry is one engine log record on the wire. Its fields are an object for the same reason a
// check's are, and they are all copied from the site's own record, which is what the payload's
// own containsPersonalData flag and json-output.md say in place of a per-field source.
type logEntry struct {
	At     string                     `json:"at"`
	Level  string                     `json:"level"`
	Event  string                     `json:"event"`
	Fields map[string]json.RawMessage `json:"fields,omitempty"`
}

// adoptListPayload is cairn adopt list's own payload.
type adoptListPayload struct {
	SchemaVersion        int              `json:"schemaVersion"`
	Kind                 string           `json:"kind"`
	Verdict              string           `json:"verdict"`
	ExitCode             int              `json:"exitCode"`
	ContainsPersonalData bool             `json:"containsPersonalData"`
	Candidates           []AdoptCandidate `json:"candidates"`
}

// AdoptCandidate is one discovered Worker in the adopt candidate list payload.
type AdoptCandidate struct {
	Worker    string `json:"worker"`
	Repo      string `json:"repo"`
	Zone      string `json:"zone"`
	Domain    string `json:"domain"`
	AccountID string `json:"accountId"`
	Connected bool   `json:"connected"`
	Adopted   bool   `json:"adopted"`
}

// SiteJSON carries what one site's payload is built from. The caller supplies the report, the
// run's verdict and elapsed time; this package supplies every wire word.
type SiteJSON struct {
	// Report is the settled sweep for this site.
	Report health.Report
	// Verbose keeps every measured field; without it the verbose-only fields are dropped, the
	// same filter the text bodies run.
	Verbose bool
	// Verdict is this site's own verdict.
	Verdict spine.Verdict
	// ExitCode is the run's exit code, written only by MarshalSite.
	ExitCode spine.Verdict
	// Elapsed is the wall time this site's sweep took. It is reported and excluded from any
	// diff: two runs of an unchanged site differ in it by design.
	Elapsed time.Duration
	// Now is the instant the payload is stamped with. This package never reads a clock.
	Now time.Time
}

// MarshalSite writes the single-site payload, the run's exitCode included: for that invocation
// the site's verdict and the run's code are the same thing.
func MarshalSite(in SiteJSON) ([]byte, error) {
	p := siteObject(in)
	code := int(in.ExitCode)
	p.ExitCode = &code
	return json.Marshal(p)
}

// MarshalSiteLine writes one NDJSON line of a many-site stream: the single-site payload less its
// exitCode, so one parser reads both forms.
func MarshalSiteLine(in SiteJSON) ([]byte, error) {
	return json.Marshal(siteObject(in))
}

// siteObject builds the payload both site forms share.
func siteObject(in SiteJSON) sitePayload {
	r := in.Report.ForRender(in.Verbose)
	checks := slices.Clone(r.Checks)
	// Checks sort by id on the wire, not by severity: a machine reader wants the order that
	// does not move when a verdict does, and the text bodies own the severity ranking.
	slices.SortStableFunc(checks, func(a, b health.CheckResult) int {
		return cmp.Compare(a.ID, b.ID)
	})
	acked := slices.Clone(r.Acknowledged)
	slices.Sort(acked)
	if acked == nil {
		acked = []string{}
	}

	p := sitePayload{
		SchemaVersion: SiteSchemaVersion,
		Kind:          kindSite,
		Site:          r.Site,
		Domain:        r.Domain,
		Verdict:       in.Verdict.String(),
		CheckedAt:     instant(in.Now),
		DurationMs:    in.Elapsed.Milliseconds(),
		Degraded:      r.Degraded,
		Acknowledged:  acked,
		Checks:        make([]checkPayload, 0, len(checks)),
	}
	for _, c := range checks {
		p.Checks = append(p.Checks, checkObject(c))
	}
	return p
}

// checkObject builds one check's wire shape. The state word is computed here rather than
// marshalled off spine.State: the type has three values and the wire vocabulary has four, and
// "held" is not a state at all but a failing check an unexpired hold covers.
func checkObject(c health.CheckResult) checkPayload {
	out := checkPayload{
		CheckID:   c.ID,
		State:     spine.StateWord(c.Outcome.State, c.Acknowledged),
		Reason:    string(c.Outcome.Reason),
		Condition: string(c.Outcome.Condition),
		Tier:      c.Tier.String(),
		Detail:    c.Outcome.Detail,
		CheckedAt: instant(c.CheckedAt),
	}
	if c.Outcome.Code != spine.CodeNone {
		out.Code = string(c.Outcome.Code)
	}
	if c.Outcome.Condition == spine.ConditionNone {
		out.Condition = ""
	}
	out.Fields, out.Observed = fieldObjects(c.Outcome.Fields)
	if fix, ok := fixForResult(c); ok {
		out.Fix = &fix
	}
	if !c.AckExpires.IsZero() {
		out.Hold = &holdPayload{Until: instant(c.AckExpires), Expired: !c.Acknowledged}
	}
	return out
}

// fieldObjects splits one outcome's fields into the values cairn derived and the values it
// copied, keyed by name. The split reads each field's declared Source and infers nothing: a
// boundary guessing from a key name or a value's shape would mismark the first field either
// side adds.
func fieldObjects(fs []spine.OutcomeField) (map[string]json.RawMessage, map[string]observedValue) {
	var derived map[string]json.RawMessage
	var observed map[string]observedValue
	for _, f := range fs {
		if f.Source == "" {
			if derived == nil {
				derived = make(map[string]json.RawMessage)
			}
			derived[f.Key] = f.Value
			continue
		}
		if observed == nil {
			observed = make(map[string]observedValue)
		}
		observed[f.Key] = observedValue{Value: f.Value, Source: string(f.Source)}
	}
	return derived, observed
}

// fixForResult returns the structured fix for a check that has one: a failing check's fix comes
// from its declared identity, and a check that could not run at all takes the fix for its
// reason, where the table carries one. A command is carried only for an operator's own fix,
// since that is the one actor whose action is a command line this tool can name.
func fixForResult(c health.CheckResult) (fixPayload, bool) {
	fix, ok := health.FixFor(c.Outcome)
	if !ok && c.Outcome.State == spine.Unknown {
		fix, ok = health.FixForReason(c.Outcome.Reason)
	}
	if !ok {
		return fixPayload{}, false
	}
	out := fixPayload{
		Summary: fix.Text,
		URL:     fixURL(fix),
		Actor:   string(fix.Actor),
		Outward: fix.Outward,
	}
	if fix.Actor == health.ActorOperator {
		out.Command = fix.Command
	}
	return out, true
}

// SummaryJSON carries what a stream's summary line is built from.
type SummaryJSON struct {
	// Reports holds every site the sweep settled, in registry order; this package ranks them.
	Reports []health.Report
	// Verdicts holds each settled site's own verdict, in the same order as Reports.
	Verdicts []spine.Verdict
	// Verdict is the run's combined verdict and ExitCode its process exit code.
	Verdict  spine.Verdict
	ExitCode spine.Verdict
	// Sites is how many sites the run was meant to cover, which exceeds len(Reports) when a
	// budget or a signal cut the sweep short.
	Sites   int
	Elapsed time.Duration
	Now     time.Time
}

// MarshalSummary writes the stream's final line: the run's own verdict and exit code, the count
// by verdict word, and the worst-first ranking of the sites it settled.
func MarshalSummary(in SummaryJSON) ([]byte, error) {
	counts := map[string]int{
		spine.VerdictOK.String():       0,
		spine.VerdictWarning.String():  0,
		spine.VerdictCritical.String(): 0,
		spine.VerdictUnknown.String():  0,
	}
	for _, v := range in.Verdicts {
		counts[v.String()]++
	}
	if missing := in.Sites - len(in.Verdicts); missing > 0 {
		counts[spine.VerdictUnknown.String()] += missing
	}

	worst := make([]string, 0, len(in.Reports))
	for _, r := range rankReports(in.Reports) {
		worst = append(worst, r.Site)
	}

	return json.Marshal(summaryPayload{
		SchemaVersion: SummarySchemaVersion,
		Kind:          kindSummary,
		Verdict:       in.Verdict.String(),
		ExitCode:      int(in.ExitCode),
		CheckedAt:     instant(in.Now),
		DurationMs:    in.Elapsed.Milliseconds(),
		Sites:         in.Sites,
		Counts:        counts,
		WorstFirst:    worst,
	})
}

// MarshalSitesList writes cairn sites list's payload. errs names every registry read the listing
// could not complete, which is also what carried the verdict away from OK.
func MarshalSitesList(entries []SiteListEntry, verdict spine.Verdict, errs []string) ([]byte, error) {
	if entries == nil {
		entries = []SiteListEntry{}
	}
	return json.Marshal(sitesListPayload{
		SchemaVersion: SitesListSchemaVersion,
		Kind:          kindSites,
		Verdict:       verdict.String(),
		ExitCode:      int(verdict),
		Sites:         entries,
		Errors:        errs,
	})
}

// MarshalLogs writes cairn logs's payload. Every record it carries is the site's own, which is
// what containsPersonalData names: the engine logs an editor's email on some events.
func MarshalLogs(site string, entries []logs.Entry) ([]byte, error) {
	out := make([]logEntry, 0, len(entries))
	for _, e := range entries {
		item := logEntry{At: instant(e.At), Level: e.Level, Event: e.Event}
		for _, f := range e.Fields {
			if item.Fields == nil {
				item.Fields = make(map[string]json.RawMessage)
			}
			item.Fields[f.Key] = f.Value
		}
		out = append(out, item)
	}
	return json.Marshal(logsPayload{
		SchemaVersion:        LogsSchemaVersion,
		Kind:                 kindLogs,
		Verdict:              spine.VerdictOK.String(),
		ExitCode:             int(spine.VerdictOK),
		Site:                 site,
		ContainsPersonalData: true,
		Entries:              out,
	})
}

// MarshalAdoptList writes cairn adopt list's payload. A candidate list is identifiers all the
// way down, which is what containsPersonalData names here.
func MarshalAdoptList(candidates []AdoptCandidate) ([]byte, error) {
	if candidates == nil {
		candidates = []AdoptCandidate{}
	}
	return json.Marshal(adoptListPayload{
		SchemaVersion:        AdoptListSchemaVersion,
		Kind:                 kindAdoptList,
		Verdict:              spine.VerdictOK.String(),
		ExitCode:             int(spine.VerdictOK),
		ContainsPersonalData: true,
		Candidates:           candidates,
	})
}

// instant formats t as RFC 3339 in UTC, the one time format every payload uses, and as the empty
// string for the zero time. Nothing on the wire is relative: "3 minutes ago" is a fact about
// when the reader read it rather than about when the tool measured it.
func instant(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}
