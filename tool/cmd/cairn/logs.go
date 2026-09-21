package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/logs"
	"github.com/spf13/cobra"
)

// logsFlags holds cairn logs's own flags.
type logsFlags struct {
	// event narrows the query to one engine event name. Empty means every event.
	event string
	// since is the lookback window, in the grammar logs.ParseSince accepts.
	since string
	// asJSON prints the entries as JSON instead of one line each.
	asJSON bool
}

// newLogsCmd builds cairn logs.
//
// logs is implicitly verbose: an engine log record carries the editor's email on some events,
// so every entry it prints is an identifier and there is no --verbose flag to hide one behind.
func newLogsCmd(d deps, rf *rootFlags) *cobra.Command {
	var f logsFlags

	cmd := &cobra.Command{
		Use:               "logs <site>",
		Short:             "Read one site's engine log records",
		Example:           "cairn logs ecxc-ski-a1b2c3 --since 24h",
		GroupID:           groupSite,
		Args:              cobra.ExactArgs(1),
		ValidArgsFunction: completeSiteIDs(d),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runLogs(cmd, d, rf, f, args[0])
		},
	}

	cmd.Flags().StringVar(&f.event, "event", "", "narrow the query to one engine event name")
	cmd.Flags().StringVar(&f.since, "since", defaultSince, "lookback window: a whole number of m, h, or d")
	cmd.Flags().BoolVar(&f.asJSON, "json", false, "print the entries as JSON")
	_ = cmd.RegisterFlagCompletionFunc("event", completeLogEvents)

	return cmd
}

// completeLogEvents is the flag completion for cairn logs --event, over the engine's own log
// event vocabulary. It reads no network and no registry: the vocabulary is a Go literal, so an
// error is not possible here, and every candidate answers with no directive but plain text.
func completeLogEvents(_ *cobra.Command, _ []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	var matches []string
	for _, event := range logs.Events() {
		if strings.HasPrefix(event, toComplete) {
			matches = append(matches, event)
		}
	}
	return matches, cobra.ShellCompDirectiveNoFileComp
}

// runLogs fetches one site's log entries and prints them newest first.
func runLogs(cmd *cobra.Command, d deps, rf *rootFlags, f logsFlags, site string) error {
	window, err := parseSince(f.since)
	if err != nil {
		return err
	}

	if _, err := fmt.Fprintln(cmd.ErrOrStderr(), pasteNotice); err != nil {
		return err
	}

	st, err := openRegistry(d)
	if err != nil {
		return err
	}
	rec, err := st.Load(site)
	if err != nil {
		return fmt.Errorf("cairn: no site named %q.\nRun `cairn sites list` to see the sites cairn knows", site)
	}

	clients := buildClients(d)
	if !clients.HaveCF {
		return noCloudflareCredentialError()
	}

	ctx, cancel := rf.deadline(commandContext(cmd))
	defer cancel()

	entries, err := logs.Fetch(ctx, clients.CF, logs.Query{
		Worker: rec.Cloudflare.WorkerName,
		Since:  window,
		Event:  f.event,
	}, d.now())
	if err != nil {
		return err
	}

	return writeLogs(cmd, entries, f)
}

// writeLogs writes the fetched entries, as JSON under --json and as one line each otherwise.
// Every field value is printed as the API returned it: the CLI never rewrites or truncates a
// record the engine wrote.
func writeLogs(cmd *cobra.Command, entries []logs.Entry, f logsFlags) error {
	if f.asJSON {
		data, err := json.MarshalIndent(entries, "", "  ")
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "%s\n", data)
		return err
	}
	for _, e := range entries {
		line := fmt.Sprintf("%s\t%s\t%s", e.At.UTC().Format(time.RFC3339), e.Level, e.Event)
		if fields := logFields(e); fields != "" {
			line += "\t" + fields
		}
		if _, err := fmt.Fprintln(cmd.OutOrStdout(), line); err != nil {
			return err
		}
	}
	return nil
}

// logFields joins one entry's non-envelope fields as key=value pairs, in the order the record
// carried them.
func logFields(e logs.Entry) string {
	pairs := make([]string, 0, len(e.Fields))
	for _, field := range e.Fields {
		pairs = append(pairs, field.Key+"="+string(field.Value))
	}
	return strings.Join(pairs, " ")
}
