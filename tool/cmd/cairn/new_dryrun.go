package main

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/spf13/cobra"
)

// dryRunPayload is what --dry-run --json prints.
type dryRunPayload struct {
	SchemaVersion int           `json:"schemaVersion"`
	Kind          string        `json:"kind"`
	SiteName      string        `json:"siteName"`
	Repository    string        `json:"repository"`
	Worker        string        `json:"worker"`
	Database      string        `json:"database"`
	Bucket        string        `json:"bucket"`
	App           string        `json:"app"`
	Folder        string        `json:"folder"`
	OwnerEmail    string        `json:"ownerEmail"`
	Posture       setup.Posture `json:"posture"`
}

// runDryRun prints the names setup would use. It needs no registry, no network, and no approval.
func runDryRun(cmd *cobra.Command, f newFlags) error {
	if err := checkEmail(f.email); err != nil {
		return err
	}
	n, err := setup.DeriveNames(f.name, 0)
	if err != nil {
		return newUsageError("cairn: --name: " + err.Error())
	}
	if !f.asJSON {
		_, err := fmt.Fprintln(cmd.OutOrStdout(), fmt.Sprintf(tmplNewDryRun, f.name, n.Repository, n.Worker, n.Database, n.Bucket, n.App, n.Folder, f.email, f.posture))
		return err
	}
	data, err := json.Marshal(dryRunPayload{
		SchemaVersion: 1, Kind: "dryRun", SiteName: f.name, Repository: n.Repository, Worker: n.Worker,
		Database: n.Database, Bucket: n.Bucket, App: n.App, Folder: n.Folder, OwnerEmail: f.email, Posture: setup.Posture(f.posture),
	})
	if err != nil {
		return err
	}
	return writeJSONPayload(cmd.OutOrStdout(), data)
}

func checkEmail(email string) error {
	if !setup.ValidEmail(email) {
		return translated(errors.New(tmplNewBadEmail))
	}
	return nil
}
