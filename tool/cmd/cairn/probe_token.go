package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"slices"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/spf13/cobra"
)

// engineOwner and engineRepo name the engine repository every registry, beyond its own sites,
// must also grant read access to, for the Engine check's changelog read.
const (
	engineOwner = "glw907"
	engineRepo  = "cairn-cms"
)

// newAuthProbeCmd builds the hidden cairn auth probe subcommand over d, so a test can supply a
// fake environment, a fake keyring, a fake registry directory, a routed RoundTripper, and a
// captured exit without touching a real credential, disk location, or network call.
//
// It stays hidden after the 2026-09-20 grammar cleanup renamed it from probe-token: it is an
// aid for whoever is minting the three credentials, not a verb an operator runs against a site.
func newAuthProbeCmd(d deps) *cobra.Command {
	return &cobra.Command{
		Use:     "probe",
		Short:   shortAuthProbe,
		Long:    longAuthProbe,
		Example: exampleAuthProbe,
		Hidden:  true,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runProbeToken(cmd, d)
		},
	}
}

// verdict pairs one probed endpoint's outcome with the spine.State it contributes: 200 is OK, an
// unauthorized or forbidden credential is Failing, and anything else (a 404, a rate limit, a
// transport failure) is Unknown, since the endpoint simply could not be observed rather than
// proving the credential wrong. spine.ReasonToOutcome is the one place that classification lives;
// this command only carries its State through to an exit code.
type verdict struct {
	status int
	reason string
	state  spine.State
}

// okVerdict returns the verdict a 200 response reports; every endpoint this command probes
// treats 200 as the only success status.
func okVerdict() verdict {
	return verdict{status: http.StatusOK, reason: "ok", state: spine.OK}
}

// providerVerdict reports the verdict a Cloudflare or GitHub call's error carries, or okVerdict
// for a nil err, through the one providers.ProviderError contract both APIError and GitHubError
// implement. An error this package cannot classify reports "unreachable" at spine.Unknown.
func providerVerdict(err error) verdict {
	if err == nil {
		return okVerdict()
	}
	if pe, ok := errors.AsType[providers.ProviderError](err); ok {
		reason := pe.ClassifiedReason()
		return verdict{status: pe.HTTPStatus(), reason: reason.String(), state: spine.ReasonToOutcome(reason).State}
	}
	return verdict{reason: "unreachable", state: spine.Unknown}
}

// markerArray and markerNotJSON label a recordedBody whose top-level shape is not a plain
// object: an empty marker means recordBody found an object.
const (
	markerArray   = "(array)"
	markerNotJSON = "(not JSON)"
)

// recordedBody captures a single 200 response body's shape by key names only, never its values,
// the shape a test's query mock is synthesized from. keys holds the top-level object's own key
// names, or an array's first element's key names when marker is markerArray. resultKeys holds
// the "result" field's own key names, when the top level is an object carrying one: a Cloudflare
// v4 envelope's own four keys (success, errors, result, result_info) carry none of its payload's
// shape, so auth probe prints this alongside the envelope's own keys.
type recordedBody struct {
	marker     string
	keys       []string
	resultKeys []string
}

// recordBody classifies data's top-level JSON shape into a recordedBody.
func recordBody(data []byte) recordedBody {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err == nil {
		rb := recordedBody{keys: slices.Sorted(maps.Keys(obj))}
		if result, ok := obj["result"]; ok {
			var resultObj map[string]json.RawMessage
			if err := json.Unmarshal(result, &resultObj); err == nil {
				rb.resultKeys = slices.Sorted(maps.Keys(resultObj))
			}
		}
		return rb
	}
	var arr []json.RawMessage
	if err := json.Unmarshal(data, &arr); err == nil {
		rb := recordedBody{marker: markerArray}
		if len(arr) > 0 {
			var first map[string]json.RawMessage
			if err := json.Unmarshal(arr[0], &first); err == nil {
				rb.keys = slices.Sorted(maps.Keys(first))
			}
		}
		return rb
	}
	return recordedBody{marker: markerNotJSON}
}

// recordingRoundTripper wraps another RoundTripper, recording every 200 JSON response's
// top-level key shape against the request's method and path before handing the provider a fresh
// copy of the identical body. It keeps key names only: the response bytes are dropped as soon as
// recordBody has classified them, never written to a file or held past this run.
type recordingRoundTripper struct {
	next     http.RoundTripper
	recorded map[string]recordedBody
}

// newRecordingRoundTripper returns a recordingRoundTripper delegating every request to next.
func newRecordingRoundTripper(next http.RoundTripper) *recordingRoundTripper {
	return &recordingRoundTripper{next: next, recorded: map[string]recordedBody{}}
}

// RoundTrip implements http.RoundTripper.
func (rt *recordingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := rt.next.RoundTrip(req)
	if err != nil || resp == nil || resp.StatusCode != http.StatusOK || resp.Body == nil {
		return resp, err
	}
	data, readErr := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if readErr != nil {
		return nil, readErr
	}
	rt.recorded[req.Method+" "+req.URL.Path] = recordBody(data)
	resp.Body = io.NopCloser(bytes.NewReader(data))
	return resp, nil
}

// lookup returns the recorded body shape for a method/path pair, or a zero recordedBody when
// nothing was recorded (a non-200 status, or a path this run never reached).
func (rt *recordingRoundTripper) lookup(method, path string) recordedBody {
	return rt.recorded[method+" "+path]
}

// printEndpoint writes one probed endpoint's line, and its recorded body shape on a 200, to out.
func printEndpoint(out io.Writer, endpoint string, v verdict, rb recordedBody) {
	_, _ = fmt.Fprintf(out, "  %-32s %3d  %s\n", endpoint, v.status, v.reason)
	if v.state != spine.OK {
		return
	}
	switch rb.marker {
	case markerNotJSON:
		_, _ = fmt.Fprintln(out, "      body:", markerNotJSON)
	case markerArray:
		_, _ = fmt.Fprintln(out, "      body:", markerArray)
		if len(rb.keys) > 0 {
			_, _ = fmt.Fprintf(out, "      keys (first element): %v\n", rb.keys)
		}
	default:
		if len(rb.keys) > 0 {
			_, _ = fmt.Fprintf(out, "      keys: %v\n", rb.keys)
		}
		if len(rb.resultKeys) > 0 {
			_, _ = fmt.Fprintf(out, "      result: %v\n", rb.resultKeys)
		}
	}
}

// runProbeToken is newAuthProbeCmd's RunE body, split out so it reads as plain sequential
// steps rather than a closure body.
func runProbeToken(cmd *cobra.Command, d deps) error {
	ctx := commandContext(cmd)
	out := cmd.OutOrStdout()
	errOut := cmd.ErrOrStderr()
	_, _ = fmt.Fprintln(errOut, authProbeVerboseNotice)

	resolved, missing := loadEnv(d.env, d.secretProviders()...)
	printCredentialSources(out, resolved)

	rec := newRecordingRoundTripper(d.transport)

	worst := spine.OK
	raise := func(s spine.State) {
		worst = spine.CombineState(worst, s)
	}

	if isMissing(missing, varCFAccountID) || isMissing(missing, varCFReadToken) {
		_, _ = fmt.Fprintln(out, authProbeCFSkipped)
		raise(spine.Unknown)
	} else {
		raise(probeCloudflare(ctx, out, providers.NewCloudflare(resolved.accountID(), resolved.cfToken(), rec), resolved.accountID(), rec))
	}

	if isMissing(missing, varGHReadToken) {
		_, _ = fmt.Fprintln(out, authProbeGHSkipped)
		raise(spine.Unknown)
	} else {
		raise(probeRegistryGitHub(ctx, out, errOut, providers.NewGitHub(resolved.ghToken(), rec), rec, d.registryDir))
	}

	d.exit(int(spine.ExitCodeFor(worst)))
	return nil
}

// isMissing reports whether missing names the variable name.
func isMissing(missing []providers.Missing, name string) bool {
	return slices.ContainsFunc(missing, func(m providers.Missing) bool { return m.Var == name })
}

// printCredentialSources writes which provider answered each of the three variables loadEnv
// resolves, by name only, never the value.
func printCredentialSources(out io.Writer, e env) {
	_, _ = fmt.Fprintln(out, "Credentials:")
	for _, r := range e.sourceLines() {
		_, _ = fmt.Fprintf(out, "  %-20s %s\n", r.name, r.display)
	}
}
