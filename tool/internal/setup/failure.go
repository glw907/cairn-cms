package setup

// Reason is the stable code of a stop. A view or an agent branches on it; the sentences beside
// it are for the owner.
type Reason string

// The reasons a run stops before the summary.
const (
	ReasonRemote          Reason = "remote"
	ReasonGitMissing      Reason = "git-missing"
	ReasonNodeMissing     Reason = "node-missing"
	ReasonNodeOld         Reason = "node-old"
	ReasonPortInUse       Reason = "port-in-use"
	ReasonKeyring         Reason = "keyring-unavailable"
	ReasonTemplate        Reason = "template-fetch"
	ReasonFolderNotEmpty  Reason = "folder-not-empty"
	ReasonNoAccount       Reason = "no-account"
	ReasonNoZones         Reason = "no-zones"
	ReasonZonePending     Reason = "zone-pending"
	ReasonWorkersPaid     Reason = "workers-paid"
	ReasonAddressRecords  Reason = "address-records"
	ReasonAddressInUse    Reason = "address-in-use"
	ReasonNamesTaken      Reason = "names-taken"
	ReasonDeclined        Reason = "cloudflare-declined"
	ReasonKeyringWrite    Reason = "keyring-write"
	ReasonInstallDelete   Reason = "install-delete"
	ReasonChainTimeout    Reason = "chain-timeout"
	ReasonStopped         Reason = "stopped"
	ReasonProvider        Reason = "provider"
	ReasonRecord          Reason = "record"
	ReasonInvalidResponse Reason = "invalid-response"
)

// Failure is a stop in four parts: what happened, what setup already did, what is left, and
// what to do. Every part is fixed copy filled with names setup derived, so a Failure can go in an
// event as it is. Err is the cause for the caller's own branching and never goes in an event.
type Failure struct {
	Step     string `json:"step"`
	Reason   Reason `json:"reason"`
	Happened string `json:"happened"`
	Did      string `json:"did"`
	Left     string `json:"left,omitempty"`
	Do       string `json:"do"`
	Err      error  `json:"-"`
}

func (f *Failure) Error() string {
	return "setup stopped at " + f.Step + " (" + string(f.Reason) + "): " + f.Happened
}

func (f *Failure) Unwrap() error { return f.Err }

// nothingCreated is the "already did" part of every stop before the first create.
const nothingCreated = "Nothing was created."
