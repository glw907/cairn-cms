package record

import (
	"errors"
	"fmt"
)

// SetupSchemaVersion is the version of the setup object this tool writes and understands.
const SetupSchemaVersion = 1

// ErrSetupTooNew reports a setup object written by a newer tool than this one.
var ErrSetupTooNew = errors.New("record: setup schema is newer than this tool")

// SetupDeploys is the value of Setup.Deploys for a site whose deploys run from GitHub Actions.
const SetupDeploys = "actions"

// SetupIntents holds, per resource, the name the run is about to create. The run stores the
// intent before the create call, so a record with an intent and no matching id in SetupIDs
// (or in GitHub for the repository) marks a create whose outcome is unknown.
type SetupIntents struct {
	D1        string `json:"d1,omitempty"`
	R2Bucket  string `json:"r2Bucket,omitempty"`
	Worker    string `json:"worker,omitempty"`
	App       string `json:"app,omitempty"`
	Repo      string `json:"repo,omitempty"`
	DeployKey string `json:"deployKey,omitempty"`
}

// SetupIDs holds the identifier each provider returned, stored the moment its create call
// returned. The repository id and installation id live in Record.GitHub.
type SetupIDs struct {
	// D1 is the D1 database uuid.
	D1 string `json:"d1,omitempty"`
	// R2Bucket is the R2 bucket name, the bucket's only identifier.
	R2Bucket string `json:"r2Bucket,omitempty"`
	// WorkerTag is the Worker tag, known after the first deploy.
	WorkerTag string `json:"workerTag,omitempty"`
	// AppID is the GitHub App id.
	AppID int64 `json:"appId,omitempty"`
	// DeployKeyID is the id of the deploy key's credential at the provider.
	DeployKeyID string `json:"deployKeyId,omitempty"`
}

// Setup is the object `cairn new` keeps under a site record's "setup" key. A record that carries
// it is a setup record, and only such a record is a resume candidate. It holds identifiers and
// the names of keyring entries, never a credential value. Fields shared with the wizard's
// record (Name, Step, Domain, Cloudflare, GitHub) stay in their existing places.
type Setup struct {
	// RunID identifies the run that owns the record. An empty RunID means the record has no
	// setup object.
	RunID string
	// SchemaVersion is the setup object's version, SetupSchemaVersion when written.
	SchemaVersion int
	// Intents are the resource names about to be created.
	Intents SetupIntents
	// IDs are the resource identifiers the providers returned.
	IDs SetupIDs
	// AppSlug and ClientID identify the GitHub App; its key and client secret are keyring entries.
	AppSlug  string
	ClientID string
	// OwnerID is the GitHub user id of the repository's owner, which the repository-only install
	// page preselects. A resume at that approval has no other way to learn it.
	OwnerID int64
	// EngineVersion and EngineIntegrity are the resolved engine package's version and integrity.
	EngineVersion   string
	EngineIntegrity string
	// Folder is the absolute path of the site's folder.
	Folder string
	// Commit is the SHA of the local commit. Resume owns the folder only when HEAD equals it.
	Commit string
	// KeyringEntries names every keyring entry the run wrote, recorded before each is written.
	KeyringEntries []string
	// KeysKept reports that the entries survive after a failure.
	KeysKept bool
	// OwnerEmail is the site owner's address for sign-in.
	OwnerEmail string
	// Address is the public address the site is served at.
	Address string
	// AIPosture is the chosen AI posture.
	AIPosture string
	// ThemeID is the chosen theme.
	ThemeID string
	// Deploys is how deploys run; SetupDeploys for a setup site.
	Deploys string
	// Extra carries every key under "setup" this package does not type, in the order Parse
	// observed them.
	Extra []ExtraField

	order []string
}

func (s *Setup) setOrder(order []string) { s.order = order }
func (s *Setup) addExtra(e ExtraField)   { s.Extra = append(s.Extra, e) }
func (s *Setup) keyOrder() []string      { return s.order }
func (s *Setup) extra() []ExtraField     { return s.Extra }

// setupFields is recordFields's counterpart for Setup. Intents and IDs are flat objects with
// fixed keys, so they round-trip through encoding/json.
var setupFields = []field[Setup]{
	scalarField("runId", func(s *Setup) *string { return &s.RunID }),
	scalarField("schemaVersion", func(s *Setup) *int { return &s.SchemaVersion }),
	scalarField("intents", func(s *Setup) *SetupIntents { return &s.Intents }),
	scalarField("ids", func(s *Setup) *SetupIDs { return &s.IDs }),
	scalarField("appSlug", func(s *Setup) *string { return &s.AppSlug }),
	scalarField("clientId", func(s *Setup) *string { return &s.ClientID }),
	scalarField("ownerId", func(s *Setup) *int64 { return &s.OwnerID }),
	scalarField("engineVersion", func(s *Setup) *string { return &s.EngineVersion }),
	scalarField("engineIntegrity", func(s *Setup) *string { return &s.EngineIntegrity }),
	scalarField("folder", func(s *Setup) *string { return &s.Folder }),
	scalarField("commit", func(s *Setup) *string { return &s.Commit }),
	scalarField("keyringEntries", func(s *Setup) *[]string { return &s.KeyringEntries }),
	scalarField("keysKept", func(s *Setup) *bool { return &s.KeysKept }),
	scalarField("ownerEmail", func(s *Setup) *string { return &s.OwnerEmail }),
	scalarField("address", func(s *Setup) *string { return &s.Address }),
	scalarField("aiPosture", func(s *Setup) *string { return &s.AIPosture }),
	scalarField("themeId", func(s *Setup) *string { return &s.ThemeID }),
	scalarField("deploys", func(s *Setup) *string { return &s.Deploys }),
}

// IsSetup reports whether r carries a setup object.
func (r Record) IsSetup() bool { return r.Setup.RunID != "" }

// Resumable reports whether r is an unfinished setup record this tool can resume. A wizard or
// adopted record, which has no setup object, and a finished setup record (step "live") report
// false. A setup record from a newer tool returns ErrSetupTooNew with an upgrade message.
func (r Record) Resumable() (bool, error) {
	if !r.IsSetup() {
		return false, nil
	}
	if r.Setup.SchemaVersion > SetupSchemaVersion {
		return false, fmt.Errorf("%w: it is version %d and this tool reads up to %d; upgrade cairn to resume it",
			ErrSetupTooNew, r.Setup.SchemaVersion, SetupSchemaVersion)
	}
	return r.Step != "live", nil
}
