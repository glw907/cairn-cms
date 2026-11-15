package main

import (
	"errors"
	"testing"
)

// TestErrorBytesHold pins the exact bytes each listed error prints off a terminal: every
// messages.go error whose message carries a Run line, and the keyring error no fixture reaches.
// The terminal block may draw these differently, but a pipe, a log file, and a script reading
// stderr must see the same bytes they always have, so both the error and what translateError
// hands main are compared.
func TestErrorBytesHold(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want string
	}{
		{"flag", flagError("cairn health", errors.New("unknown flag: --bogus")),
			"cairn: unknown flag: --bogus.\nRun `cairn health --help` for usage"},
		{"unknown command", unknownCommandError("healt"),
			"cairn: \"healt\" is not a cairn command.\nRun `cairn --help` for the commands"},
		{"auth no subcommand", authNoSubcommandError(),
			"cairn: cairn auth names a subcommand.\nRun `cairn auth --help` for the subcommands"},
		{"unknown site", unknownSiteError("my-site-a1b2c3"),
			"cairn: no site named \"my-site-a1b2c3\".\nRun `cairn sites list` to see the sites cairn knows"},
		{"health arity", healthTooManyArgsError(),
			"cairn: cairn health takes at most one site.\nRun `cairn health --help` for usage"},
		{"doctor arity", doctorTooManyArgsError(),
			"cairn: cairn doctor takes at most one directory.\nRun `cairn doctor --help` for usage"},
		{"adopt no domain", adoptNoDomainError("my-site"),
			"cairn: no Custom Domain attached to Worker \"my-site\".\nRun `cairn adopt --worker my-site --domain <domain>` naming the domain it serves"},
		{"adopt no worker", adoptNoWorkerError(),
			"cairn: cairn adopt names one Worker.\nRun `cairn adopt list` to see the Workers on the account"},
		{"adopt unknown worker", adoptUnknownWorkerError("my-site"),
			"cairn: no Worker named \"my-site\" on this account.\nRun `cairn adopt list` to see the Workers on the account"},
		{"no cloudflare credential", noCloudflareCredentialError(),
			"cairn: no Cloudflare credentials found.\nRun `cairn auth set CAIRN_CF_READ_TOKEN` to store one"},
		{"new requires", newRequiresError("--email", "--plan"),
			"cairn: --email is required with --plan.\nRun `cairn new --help` for the flags"},
		{"new conflict", newConflictError("--plan", "--apply"),
			"cairn: --plan and --apply cannot be used together.\nRun `cairn new --help` for the flags"},
		{"new bad posture", newBadPostureError("maybe"),
			"cairn: --posture takes decline or invite, not \"maybe\".\nRun `cairn new --help` for the flags"},
		{"new usage", newUsageError("cairn: --name: too long"),
			"cairn: --name: too long\nRun `cairn new --help` for the flags"},
		{"new host outside zone", newHostOutsideZoneError("a.example.org", "example.com"),
			"cairn: --host a.example.org must be the zone example.com or a subdomain of it\nRun `cairn new --help` for the flags"},
		{"new unfinished", newUnfinishedError("abc123"),
			"cairn: an unfinished setup exists: abc123.\nContinue it with --resume abc123, or start a new site with --new.\nRun `cairn new --help` for the flags"},
		{"new several unfinished", newSeveralUnfinishedError([]string{"abc123", "def456"}),
			"cairn: several unfinished setups exist: abc123, def456.\nContinue one with --resume <id>, or start a new site with --new.\nRun `cairn new --help` for the flags"},
		{"new no setup", newNoSetupError("abc123"),
			"cairn: no unfinished setup is named abc123.\nRun `cairn new status` to list them"},
		{"new no run for plan", newNoRunForPlanError("run-1"),
			"cairn: the plan's runId is run-1, and no unfinished setup has that run.\nRun `cairn new status` to list them, or run --plan again"},
		{"new plan unreadable", newPlanUnreadableError(errors.New("open plan.json: no such file or directory")),
			"cairn: open plan.json: no such file or directory.\nRun `cairn new --help` for the flags"},
		// new_dryrun.go builds this one at its call site from the bare template.
		{"new bad email", translated(errors.New(tmplNewBadEmail)),
			"cairn: --email must be one email address, such as owner@example.com.\nRun `cairn new --help` for the flags"},
		{"keyring unavailable", keyringUnavailableError("CAIRN_CF_READ_TOKEN"),
			"cairn: the OS keyring did not open.\nSet CAIRN_CF_READ_TOKEN in the environment instead"},
	}
	for _, c := range cases {
		if got := c.err.Error(); got != c.want {
			t.Errorf("%s: Error() = %q, want %q", c.name, got, c.want)
		}
		if got := translateError(c.err).Error(); got != c.want {
			t.Errorf("%s: translateError = %q, want %q", c.name, got, c.want)
		}
	}
	if got, want := commandCrashedMessage("cairn health", "string"),
		"cairn: cairn health crashed with a string.\nThis is a bug in cairn. Report it at https://github.com/glw907/cairn-cms/issues"; got != want {
		t.Errorf("crash line = %q, want %q", got, want)
	}
}
