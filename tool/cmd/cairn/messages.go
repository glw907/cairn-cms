// Package main's messages.go is the one reviewable place tool/docs/design/copy-standard.md
// section 4.1 asks for: every string cmd/cairn prints to an operator, as a named constant or a
// named format template plus the function that renders it. No other file under cmd/cairn holds
// operator prose at a call site or in a bare format string; TestNoLongProseLiteralOutsideMessages
// enforces the length half of that rule and this file's own doc comments carry the rest.
//
// A template constant is named `tmplXxx`; the function beside it renders the template and, for
// an error, wraps the result in translatedError so main's own boundary (translateError, in
// main.go) knows the message already carries this table's shape and does not wrap it twice.
// `make copy-list` (cmd/copylist) reads every string-valued const this file declares at the
// package level, by parsing the source rather than importing it: cmd/cairn is package main, and
// Go forbids importing a main package, so the golden generator statically extracts the same
// consts a human reads here rather than calling the functions the way it calls
// internal/health's and internal/spine's own Catalogue. That is why every operator-facing string
// in this file is a named const, even a single word, and no function composes one from a bare
// literal of its own.
//
// This table is the program's own strings, never the published docs. tool/README.md,
// tool/docs/credentials.md, tool/docs/tripwire.md, and the reference pages are documentation an
// operator reads outside the binary: they are not listed by `copy-list`, they are linted by the
// repository's own Vale configuration, and they are read at Task 22a's editorial gate. Do not
// route a doc sentence through this table.
//
// A comment reading "new to this table, owed to Task 22a's editorial gate" marks a string the
// catalogue in copy-standard.md carries no row for: it is drafted to the standard's sections 2.4
// through 2.7 rather than copied, per this task's conductor ruling of 2026-09-21, and reported
// under "New operator-facing strings" so the conductor can batch it into one editorial dispatch.
package main

import (
	"errors"
	"fmt"
	"strings"
)

// translatedError marks an error this file's own constructors built, so translateError (main.go)
// can tell a message that already carries this table's shape from a raw Go error that never
// passed through one of them, and skip wrapping the first kind a second time.
type translatedError struct{ error }

// translated wraps err as a translatedError.
func translated(err error) error {
	return translatedError{err}
}

// The persistent flags' help text, root.go's own PersistentFlags declarations.
const (
	flagVersionHelp = "print the version and exit"
	flagTimeoutHelp = "wall-clock budget for the whole run"
	flagVerboseHelp = "print the identifiers a run otherwise withholds"
	flagQuietHelp   = "print nothing when the run is OK"
	flagColorHelp   = "when to colour the output: auto, always, or never"
	flagAckFileHelp = "path to a JSON file of acknowledgement entries (default: acknowledgements.json in the registry directory)"
	// flagWidthHelp is new to this table, owed to Task 22a's editorial gate: copy-standard.md
	// carries no row for a --width flag, so this is drafted to section 2.4's grammar (what the
	// flag does, in the operator's terms) rather than copied.
	flagWidthHelp = "columns to render at, instead of the terminal's own width"
)

// The root command's own Short and Example.
const (
	shortRoot   = "Operate a cairn-cms production site"
	exampleRoot = "cairn health ecxc-ski-a1b2c3"
)

// pasteNotice is the stderr line the two implicitly verbose commands, adopt list and logs, print
// before their output. Neither command has a --verbose flag to hide behind: the whole of what
// they print is identifiers, so the notice is unconditional. New to this table, owed to Task
// 22a's editorial gate.
const pasteNotice = "cairn: this output carries identifiers and is not safe to paste in public."

// tmplColorInvalid is root.go's refusal of a --color value outside the three.
const tmplColorInvalid = "cairn: --color %q is not %s, %s, or %s"

// colorInvalidError renders tmplColorInvalid for the value the operator gave.
func colorInvalidError(color string) error {
	return translated(fmt.Errorf(tmplColorInvalid, color, colorAuto, colorAlways, colorNever))
}

// sites.go's own Short, Example, and flag help.
const (
	shortSites          = "List the sites cairn knows"
	exampleSites        = "cairn sites"
	exampleSitesList    = "cairn sites list --json"
	flagSitesJSONHelp   = "print the listing as JSON"
	flagExpectSitesHelp = "the number of sites the registry is expected to hold"
)

// health.go's own Short, Example, and flag help.
const (
	shortHealth            = "Run the read-only health checks against one site, or every site when none is named"
	exampleHealth          = "cairn health ecxc-ski-a1b2c3 --json"
	flagHealthJSONHelp     = "print the report as JSON"
	flagErrorThresholdHelp = "error records in the window that still report OK"
	flagHealthSinceHelp    = "lookback window for the error count: a whole number of m, h, or d"
	flagAckHelp            = "acknowledge one check until an expiry date: <check-id>=<YYYY-MM-DD>, repeatable; applies to that check on every site in a sweep"
)

// tmplUnknownSite is health.go's and logs.go's shared refusal of a site id the registry does not
// hold, catalogue section 3.8's "unknown site" row.
const tmplUnknownSite = "cairn: no site named %q.\nRun `cairn sites list` to see the sites cairn knows"

// unknownSiteError renders tmplUnknownSite for id.
func unknownSiteError(id string) error {
	return translated(fmt.Errorf(tmplUnknownSite, id))
}

// tmplInvalidSince is health.go's and logs.go's shared refusal of a --since value ParseSince does
// not accept, catalogue section 3.8's "invalid --since" row.
const tmplInvalidSince = "cairn: --since %q is not a duration.\nUse a whole number of minutes, hours, or days: 90m, 24h, 7d"

// invalidSinceError renders tmplInvalidSince for the value the operator gave.
func invalidSinceError(s string) error {
	return translated(fmt.Errorf(tmplInvalidSince, s))
}

// tmplHealthTooManyArgs is cairn health's refusal of more than one positional site argument,
// catalogue section 3.8's arity example rewritten for this command's own noun. New to this
// table, owed to Task 22a's editorial gate.
const tmplHealthTooManyArgs = "cairn: cairn health takes at most one site.\nRun `cairn health --help` for usage"

// healthTooManyArgsError renders tmplHealthTooManyArgs.
func healthTooManyArgsError() error {
	return translated(errors.New(tmplHealthTooManyArgs))
}

// logs.go's own Short, Example, and flag help.
const (
	shortLogs         = "Read one site's engine log records"
	exampleLogs       = "cairn logs ecxc-ski-a1b2c3 --since 24h"
	flagEventHelp     = "narrow the query to one engine event name"
	flagLogsSinceHelp = "lookback window: a whole number of m, h, or d"
	flagLogsJSONHelp  = "print the entries as JSON"
)

// adopt.go's own Short, Example, and flag help, for both cairn adopt and cairn adopt list.
const (
	shortAdopt            = "Add a Cloudflare Worker to the registry as a site"
	exampleAdopt          = "cairn adopt --worker ecxc-ski"
	flagWorkerHelp        = "the Workers script to adopt"
	flagRepoHelp          = "the repository the Worker deploys from, as owner/name"
	shortAdoptList        = "List the Workers on the account that cairn could adopt"
	exampleAdoptList      = "cairn adopt list"
	flagAdoptListJSONHelp = "print the candidates as JSON"
)

// tmplAdoptNoWorker is cairn adopt's refusal of a run with no --worker named. New to this table,
// owed to Task 22a's editorial gate.
const tmplAdoptNoWorker = "cairn: cairn adopt names one Worker.\nRun `cairn adopt list` to see the Workers on the account"

// adoptNoWorkerError renders tmplAdoptNoWorker.
func adoptNoWorkerError() error {
	return translated(errors.New(tmplAdoptNoWorker))
}

// tmplAdoptUnknownWorker is cairn adopt's refusal of a --worker name absent from the account's
// own Workers. New to this table, owed to Task 22a's editorial gate.
const tmplAdoptUnknownWorker = "cairn: no Worker named %q on this account.\nRun `cairn adopt list` to see the Workers on the account"

// adoptUnknownWorkerError renders tmplAdoptUnknownWorker for the name the operator gave.
func adoptUnknownWorkerError(worker string) error {
	return translated(fmt.Errorf(tmplAdoptUnknownWorker, worker))
}

// tmplAdoptAdded is cairn adopt's own success line.
const tmplAdoptAdded = "%s added as %s\n"

// adoptAddedMessage renders tmplAdoptAdded for the adopted record's name and domain.
func adoptAddedMessage(name, domain string) string {
	return fmt.Sprintf(tmplAdoptAdded, name, domain)
}

// tmplNoCloudflareCredential is the error cairn adopt and cairn logs both return when
// buildClients resolved no Cloudflare credential at all, catalogue section 3.8's "no
// credentials" row narrowed to the one provider these two commands need. One function, so the
// two commands cannot drift into naming a different variable from each other's copy of the same
// message.
const tmplNoCloudflareCredential = "cairn: no Cloudflare credentials found.\nRun `cairn auth set %s` to store one"

// noCloudflareCredentialError renders tmplNoCloudflareCredential naming varCFReadToken.
func noCloudflareCredentialError() error {
	return translated(fmt.Errorf(tmplNoCloudflareCredential, varCFReadToken))
}

// auth.go's own Short and Example, for auth and its four subcommands.
const (
	shortAuth        = "Manage credentials in the OS keyring"
	exampleAuth      = "cairn auth list"
	shortAuthSet     = "Prompt for a value and store it in the keyring"
	exampleAuthSet   = "cairn auth set CAIRN_CF_READ_TOKEN"
	shortAuthUnset   = "Delete one credential's keyring entry"
	exampleAuthUnset = "cairn auth unset CAIRN_CF_READ_TOKEN"
	shortAuthList    = "Show which provider answers each credential variable"
	exampleAuthList  = "cairn auth list"
)

// tmplAuthStored, tmplAuthDeleted, and tmplAuthNotStored are the three auth outcome messages
// auth set and auth unset print on success.
const (
	tmplAuthStored    = "%s stored in the keyring\n"
	tmplAuthDeleted   = "%s deleted from the keyring\n"
	tmplAuthNotStored = "%s was not stored in the keyring\n"
)

// authStoredMessage renders tmplAuthStored for the stored variable's name.
func authStoredMessage(name string) string {
	return fmt.Sprintf(tmplAuthStored, name)
}

// authDeletedMessage renders tmplAuthDeleted for the deleted variable's name.
func authDeletedMessage(name string) string {
	return fmt.Sprintf(tmplAuthDeleted, name)
}

// authNotStoredMessage renders tmplAuthNotStored for a name auth unset found nothing to delete.
func authNotStoredMessage(name string) string {
	return fmt.Sprintf(tmplAuthNotStored, name)
}

// keyringUnavailableDisplay is auth list's line for a variable the keyring holds no answer for
// because the keyring itself could not be reached, distinct from "not set": the operator's
// credential may well be sitting in the keyring, unreadable right now rather than absent.
// Adapted from copy-standard.md section 3.8's "keyring unavailable" row for one status-line word
// rather than that row's own three-line boundary error. New to this table, owed to Task 22a's
// editorial gate.
const keyringUnavailableDisplay = "the OS keyring did not open, set in the environment instead"

// tmplKeyringUnavailable is the error auth set and auth unset return when the keyring itself
// could not be reached, naming the environment-variable fallback the way copy-standard.md
// section 3.8's "keyring unavailable" row does.
const tmplKeyringUnavailable = "cairn: the OS keyring did not open.\nSet %s in the environment instead"

// keyringUnavailableError renders tmplKeyringUnavailable naming name as the fallback.
func keyringUnavailableError(name string) error {
	return translated(fmt.Errorf(tmplKeyringUnavailable, name))
}

// tmplEmptyPipedValue is auth set's refusal of an empty piped value. New to this table, owed to
// Task 22a's editorial gate.
const tmplEmptyPipedValue = "cairn: %s is empty.\nPipe a non-empty value: printf %%s \"$v\" | cairn auth set %s"

// emptyPipedValueError renders tmplEmptyPipedValue for the variable name the operator was
// piping a value for.
func emptyPipedValueError(name string) error {
	return translated(fmt.Errorf(tmplEmptyPipedValue, name, name))
}

// tmplNotACredential is auth set's and auth unset's shared refusal of a name outside the three
// credential variables, catalogue section 3.8's "usage error" row.
const tmplNotACredential = "cairn: %q is not a credential cairn stores.\nThe names are %s"

// notACredentialError renders tmplNotACredential for name against the real credentialVars list.
func notACredentialError(name string) error {
	return translated(fmt.Errorf(tmplNotACredential, name, strings.Join(authVariables, ", ")))
}

// probe_token.go's own Short, Long, and Example, and its two credential-skipped notices.
const (
	shortAuthProbe   = "Verify the three credential values against Cloudflare and GitHub"
	longAuthProbe    = "Verify the three credential values against Cloudflare and GitHub.\n\nauth probe's whole output is identifiers (endpoints, statuses, and repository names), so it is implicitly verbose the same way adopt list is; there is no --verbose flag."
	exampleAuthProbe = "cairn auth probe"

	// authProbeVerboseNotice is auth probe's own implicitly-verbose notice, distinct from
	// pasteNotice's not-safe-to-paste wording since auth probe's whole output is diagnostic
	// identifiers for whoever is minting the three credentials, not a listing an operator pastes
	// elsewhere. New to this table, owed to Task 22a's editorial gate.
	authProbeVerboseNotice = "auth probe: output is identifiers only; it is implicitly verbose"
	authProbeCFSkipped     = "Cloudflare: skipped, a credential is missing"
	authProbeGHSkipped     = "GitHub: skipped, a credential is missing"

	// authProbeAllReposPublic is printRepoLines's own warning when every probed repository came
	// back confirmed-public, the condition that leaves a fine-grained token's own scope
	// unconfirmed. New to this table, owed to Task 22a's editorial gate.
	authProbeAllReposPublic = "auth probe: every probed repository is public; the GitHub token's scope is unconfirmed"
)

// ack.go's seven refusals. The catalogue carries no row for an acknowledgement file or flag, since
// acknowledgements are new to 1.0's grammar; every one is new to this table, owed to Task 22a's
// editorial gate.
const (
	tmplAckFlagInvalid        = "cairn: --ack %q is not <check-id>=<YYYY-MM-DD>.\nName the check and an expiry date, for example deploy=2026-10-01"
	tmplAckFileNotFound       = "cairn: --ack-file %s not found.\nName a file that exists, or drop the flag to use the registry's default"
	tmplAckFileMalformed      = "cairn: %s is not a valid acknowledgement file: %v.\nIt holds a JSON array of entries, each carrying checkId and expires"
	tmplAckFileMissingCheckID = "cairn: %s carries an entry with no checkId.\nName the check each entry acknowledges"
	tmplAckFileMissingExpiry  = "cairn: %s's %q entry has no expires date.\nAdd an expires date so the acknowledgement does not outlive it"
	tmplAckFileMalformedDate  = "cairn: %s's %q entry has a malformed expires date %q.\nUse YYYY-MM-DD"
	tmplAckFileUnreadable     = "cairn: could not read %s: %v.\nCheck the file's permissions, or drop --ack-file to use the registry's default"
)

// ackFlagError is --ack's refusal of a value that is not <check-id>=<YYYY-MM-DD>.
func ackFlagError(entry string) error {
	return translated(fmt.Errorf(tmplAckFlagInvalid, entry))
}

// ackFileNotFoundError is --ack-file's refusal of a path that does not exist, distinct from the
// default path's silent absence.
func ackFileNotFoundError(path string) error {
	return translated(fmt.Errorf(tmplAckFileNotFound, path))
}

// ackFileMalformedError is the refusal of an acknowledgement file whose contents are not the
// documented JSON array.
func ackFileMalformedError(path string, cause error) error {
	return translated(fmt.Errorf(tmplAckFileMalformed, path, cause))
}

// ackFileMissingCheckIDError is the refusal of an acknowledgement file entry with no check id.
func ackFileMissingCheckIDError(path string) error {
	return translated(fmt.Errorf(tmplAckFileMissingCheckID, path))
}

// ackFileMissingExpiryError is the refusal of an acknowledgement file entry with no expiry
// date, so no acknowledgement outlives its author's attention.
func ackFileMissingExpiryError(path, checkID string) error {
	return translated(fmt.Errorf(tmplAckFileMissingExpiry, path, checkID))
}

// ackFileMalformedDateError is the refusal of an acknowledgement file entry whose expires value
// does not parse as a calendar date.
func ackFileMalformedDateError(path, checkID, value string) error {
	return translated(fmt.Errorf(tmplAckFileMalformedDate, path, checkID, value))
}

// ackFileUnreadableError is the refusal of an acknowledgement file that exists but could not be
// read (a permissions error, most often), distinct from ackFileNotFoundError's missing-path case.
func ackFileUnreadableError(path string, cause error) error {
	return translated(fmt.Errorf(tmplAckFileUnreadable, path, cause))
}

// The remaining four rows of copy-standard.md section 3.8 (no credentials, network down, rate
// limited, and a crashed check) carry no reachable call site in cmd/cairn today: a missing
// credential, an offline network, a rate limit, and a check panic are each classified inside
// internal/health and internal/spine as a per-check Outcome rather than returned to this
// package as a Go error, so cmd/cairn never observes one directly. They are kept here, as this
// table's remaining catalogue entries, for the reviewable golden section 4.1 and 4.3 ask for and
// for whichever future call site needs the exact wording; TestEveryEightSection38CaseHasATableEntry
// exercises each one directly.

// tmplNoCredentials is catalogue section 3.8's "no credentials" row.
const tmplNoCredentials = "cairn: no credentials found.\nThe health checks read your Cloudflare and GitHub tokens from the OS keyring or the environment.\nRun `cairn auth set %s` to store one"

// noCredentialsError renders tmplNoCredentials naming varCFReadToken as the example.
func noCredentialsError() error {
	return translated(fmt.Errorf(tmplNoCredentials, varCFReadToken))
}

// tmplNetworkDown is catalogue section 3.8's "network down" row.
const tmplNetworkDown = "cairn: could not reach the network.\nNo check ran, so this run says nothing about the site.\nCheck your connection, then run the command again"

// networkDownError renders tmplNetworkDown.
func networkDownError() error {
	return translated(errors.New(tmplNetworkDown))
}

// tmplRateLimited is catalogue section 3.8's "rate limited" row, its optional third line held
// separate so a caller with no Retry-After value can omit it.
const tmplRateLimited = "cairn: Cloudflare rate-limited this run.\nThe checks that need Cloudflare could not run; the others are reported above"

// tmplRateLimitedRetry is the clause rateLimitedError appends when the response carried a
// Retry-After value.
const tmplRateLimitedRetry = "\nRun the command again in %s"

// rateLimitedError renders tmplRateLimited, appending tmplRateLimitedRetry when retryAfter is
// non-empty. The run's own verdict is WARNING, never CRITICAL, per copy-standard.md's own
// override note: a throttled run did not observe the site.
func rateLimitedError(retryAfter string) error {
	if retryAfter == "" {
		return translated(errors.New(tmplRateLimited))
	}
	return translated(fmt.Errorf(tmplRateLimited+tmplRateLimitedRetry, retryAfter))
}

// tmplCrashedCheck is catalogue section 3.8's "a crashed check" row.
const tmplCrashedCheck = "cairn: the %s check crashed.\nThis is a bug in cairn. Report it at https://github.com/glw907/cairn-cms/issues"

// crashedCheckError renders tmplCrashedCheck naming the check id that panicked.
func crashedCheckError(id string) error {
	return translated(fmt.Errorf(tmplCrashedCheck, id))
}

// tmplFallback is main.go's own last resort, copy-standard.md section 4.2's "falling back to
// cairn: <err> only for an error the table does not know."
const tmplFallback = "cairn: %v"

// fallbackError renders tmplFallback for a raw error none of this table's own constructors
// built.
func fallbackError(err error) error {
	return fmt.Errorf(tmplFallback, err)
}

// translateError is main.go's one call into this table, copy-standard.md section 4.2's boundary:
// "one translation function maps a sentinel or wrapped error onto a message from the table,
// falling back to cairn: <err> only for an error the table does not know." Every command below
// main already builds its own failure through one of this file's own constructors, each of which
// returns a translatedError, so this function's real job is the fallback clause: a raw Go error
// that reached main without going through one of them (a store or filesystem failure, for
// instance) still carries the cairn: prefix every operator-facing message must have, rather than
// reaching the terminal as a bare Go error chain the way cmd/cairn/main.go used to print one.
func translateError(err error) error {
	if _, ok := err.(translatedError); ok {
		return err
	}
	return fallbackError(err)
}
