package main

// The values the e2e world plants for every credential and one-time code setup handles. A test
// greps every output for them, so each is distinctive and appears nowhere else. All are fake.
const (
	e2eCFAccess     = "e2e-cf-access-0001-planted-value"        // secret-guard-allow
	e2eCFRefresh    = "e2e-cf-refresh-0002-planted-value"       // secret-guard-allow
	e2eCFCode       = "e2e-cf-code.0003-planted-value"          // secret-guard-allow
	e2eManifestCode = "e2e-manifest-code-0004-planted-value"    // secret-guard-allow
	e2eInstallCode  = "e2e-install-code-0005-planted-value"     // secret-guard-allow
	e2eGHUserToken  = "e2e-gh-user-token-0006-planted-value"    // secret-guard-allow
	e2eGHInstToken  = "e2e-gh-install-token-0007-planted-value" // secret-guard-allow
	e2eDeployKey    = "e2e-deploy-key-0008-planted-value"       // secret-guard-allow
	e2eCFSetupToken = "e2e-cf-setup-token-0009-planted-value"   // secret-guard-allow
)

// The identifiers the world's services agree on.
const (
	e2eEngineVersion = "0.99.0-e2e.1"
	e2eZone          = "carin-test.org"
	e2eAccount       = "00000000000000000000000000000001"
	e2eOwner         = "example-owner"
	e2eAppID         = int64(5674210)
	e2eOwnerID       = int64(352097667)
	e2eRepoID        = int64(1450808149)
	e2eInstall1      = int64(5550010)
	e2eInstall2      = int64(5550011)
)
