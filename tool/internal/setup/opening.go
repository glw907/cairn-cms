package setup

import (
	"context"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// maxSuffix is the last taken-name suffix setup tries before it stops.
const maxSuffix = 9

// opening runs the checks that need no account. Each one fails before setup writes anything,
// the record included. A resume keeps its record and its names, accepts its own folder, and
// refuses a template other than the one the run began with.
func (r *run) opening(ctx context.Context) error {
	r.start(StepOpeningChecks)
	r.suffix = r.recordedSuffix()
	r.names, _ = deriveNames(r.cfg.Answers.SiteName, r.suffix)
	if loopback.Remote(r.cfg.GOOS, r.cfg.Env) {
		return r.failure(ReasonRemote, "Setup can't run over SSH or without a display.",
			"Run cairn new in a terminal on the computer where you use your browser.", nil)
	}
	if err := r.cfg.Git(ctx); err != nil {
		return r.failure(ReasonGitMissing, "Setup can't find git on this computer.",
			"Install git, and then run cairn new again.", err)
	}
	out, err := r.cfg.NodeVersion(ctx)
	if err != nil {
		return r.failure(ReasonNodeMissing, "Setup can't find Node on this computer.",
			"Install Node 24 or later, and then run cairn new again.", err)
	}
	major, err := nodeMajor(out)
	if err != nil {
		return r.failure(ReasonNodeMissing, "Setup can't read the version of Node on this computer.",
			"Install Node 24 or later, and then run cairn new again.", err)
	}
	if major < MinNodeMajor {
		return r.failure(ReasonNodeOld, "Setup needs Node 24 or later. This computer has Node "+strconv.Itoa(major)+".",
			"Install Node 24 or later, and then run cairn new again.", nil)
	}
	r.tab, err = r.cfg.Listen(loopback.Config{SiteName: r.cfg.Answers.SiteName, Now: r.cfg.Now, After: r.cfg.After})
	if err != nil {
		return r.failure(ReasonPortInUse, loopback.InUseReason,
			"Finish or stop the other setup, and then run cairn new again.", err)
	}
	if err := r.cfg.Vault.Probe(ProbeDeadline); err != nil {
		return r.failure(ReasonKeyring, "Setup can't store credentials in this computer's keyring.",
			"Unlock or set up the keyring, and then run cairn new again.", err)
	}
	r.tmpl, err = r.cfg.FetchTemplate(ctx)
	if err == nil && len(r.tmpl.Themes) == 0 {
		err = errors.New("the template's catalog lists no theme")
	}
	if err != nil {
		return r.failure(ReasonTemplate, "Setup couldn't download the site template from npm.",
			"Check your internet connection, and then run cairn new again.", err)
	}
	if r.resumed {
		return r.resumeOpening()
	}
	if r.folderBusy(r.names) {
		return r.failure(ReasonFolderNotEmpty, "The folder "+r.names.Repository+" already exists here and isn't empty.",
			"Move or rename that folder, or run cairn new from another folder.", nil)
	}
	r.theme = r.tmpl.Themes[0]
	if len(r.tmpl.Themes) > 1 {
		id, err := r.cfg.View.ChooseTheme(ctx, r.tmpl.Themes)
		if err != nil {
			return err
		}
		i := slices.IndexFunc(r.tmpl.Themes, func(t scaffold.Theme) bool { return t.ID == id })
		if i < 0 {
			return errors.New("setup: the chosen theme is not in the catalog")
		}
		r.theme = r.tmpl.Themes[i]
	}
	r.rec = record.Record{
		Name:          r.cfg.Answers.SiteName,
		Step:          string(spine.StepSetupStarted),
		SchemaVersion: 1,
		Setup: record.Setup{
			RunID:           r.cfg.RunID,
			SchemaVersion:   record.SetupSchemaVersion,
			EngineVersion:   r.tmpl.Version,
			EngineIntegrity: r.tmpl.Integrity,
			AIPosture:       string(r.cfg.Answers.Posture),
			ThemeID:         r.theme.ID,
			Deploys:         record.SetupDeploys,
		},
	}
	r.done()
	return nil
}

// resumeOpening finishes a resume's opening: the template must be the recorded version, the
// theme the recorded one, and the folder free until the scaffold has written it.
func (r *run) resumeOpening() error {
	s := r.rec.Setup
	if r.tmpl.Version != s.EngineVersion || r.tmpl.Integrity != s.EngineIntegrity {
		return r.failure(ReasonTemplate, "The site template setup downloaded isn't the version this setup began with, "+s.EngineVersion+".",
			"Run cairn new again. If this keeps happening, the version may have been withdrawn from npm.", nil)
	}
	i := slices.IndexFunc(r.tmpl.Themes, func(t scaffold.Theme) bool { return t.ID == s.ThemeID })
	if i < 0 {
		return r.failure(ReasonTemplate, "The site template no longer offers the theme "+s.ThemeID+".",
			"Run cairn new again.", nil)
	}
	r.theme = r.tmpl.Themes[i]
	if !reached(r.rec.Step, spine.StepScaffolded) && s.Folder != "" && busy(s.Folder) {
		return r.failure(ReasonFolderNotEmpty, "The folder "+s.Folder+" isn't empty, and setup hasn't written the site there yet.",
			"Move or rename that folder, and then run cairn new again.", nil)
	}
	r.done()
	return nil
}

// recordedSuffix is the taken-name suffix a resumed record's repository name carries, and 0 for
// a new run or a record with no repository name yet.
func (r *run) recordedSuffix() int {
	name := r.rec.GitHub.Repo.Repo
	if name == "" {
		name = r.rec.Setup.Intents.Repo
	}
	if name == "" {
		return 0
	}
	for s := 0; s <= maxSuffix; s = nextSuffix(s) {
		if n, err := deriveNames(r.cfg.Answers.SiteName, s); err == nil && n.Repository == name {
			return s
		}
	}
	return 0
}

// folderBusy reports whether the site folder for n exists and holds anything.
func (r *run) folderBusy(n Names) bool {
	return busy(filepath.Join(r.cfg.Dir, n.Repository))
}

// busy reports whether dir exists and holds anything. A missing or empty folder is free;
// anything unreadable counts as busy.
func busy(dir string) bool {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return false
	}
	return err != nil || len(entries) > 0
}

// cloudflareChecks reads the account the first approval granted: its accounts, zones, address,
// and free names. It writes to no provider.
func (r *run) cloudflareChecks(ctx context.Context) error {
	r.start(StepCloudflareChecks)
	user := r.cfg.Cloudflare("", r.access)
	accounts, err := user.Accounts(ctx)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	if len(accounts) == 0 {
		return r.failure(ReasonNoAccount, "Your Cloudflare sign-in has no accounts.",
			"Create a Cloudflare account, and then run cairn new again.", nil)
	}
	r.account = accounts[0]
	if len(accounts) > 1 {
		id, err := r.cfg.View.ChooseAccount(ctx, accounts)
		if err != nil {
			return err
		}
		i := slices.IndexFunc(accounts, func(a providers.Account) bool { return a.ID == id })
		if i < 0 {
			return errors.New("setup: the chosen account is not one of the listed accounts")
		}
		r.account = accounts[i]
	}
	if r.email, err = user.UserEmail(ctx); err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	r.email = strings.TrimSpace(r.email)
	r.cf = r.cfg.Cloudflare(r.account.ID, r.access)

	zones, err := r.cf.ActiveZones(ctx)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	if len(zones) == 0 {
		return r.noActiveZone(ctx)
	}
	// Workers Paid is not checked here: the live subscriptions route answers the setup grant with
	// a 403, so the plan cannot be read. Telling a missing plan apart is left to the first deploy.
	r.zone = zones[0]
	if len(zones) > 1 {
		id, err := r.cfg.View.ChooseZone(ctx, zones)
		if err != nil {
			return err
		}
		i := slices.IndexFunc(zones, func(z providers.Zone) bool { return z.ID == id })
		if i < 0 {
			return errors.New("setup: the chosen zone is not one of the account's active zones")
		}
		r.zone, r.zoneChosen = zones[i], true
	}
	r.host = r.zone.Name
	r.addresses, _ = addresses(r.zone.Name, r.host)
	if err := r.checkAddress(ctx, ""); err != nil {
		return err
	}
	if err := r.freeNames(ctx, 0); err != nil {
		return err
	}
	r.rec.Domain = r.zone.Name
	r.rec.Cloudflare.AccountID = r.account.ID
	r.rec.Cloudflare.ZoneID = r.zone.ID
	r.rec.Setup.OwnerEmail = r.email
	r.rec.Setup.Address = r.zone.Name
	if err := r.save(); err != nil {
		return err
	}
	r.done()
	return nil
}

// noActiveZone tells a domain still being added apart from no domain at all.
func (r *run) noActiveZone(ctx context.Context) error {
	all, err := r.cf.ListZones(ctx)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	if i := slices.IndexFunc(all, func(z providers.Zone) bool { return z.Status != "active" }); i >= 0 {
		return r.failure(ReasonZonePending, "Your domain "+all[i].Name+" is still being added to Cloudflare.",
			"Wait until Cloudflare shows the domain as active, and then run cairn new again.", nil)
	}
	return r.failure(ReasonNoZones, "Your Cloudflare account has no domains.",
		"Register a domain with Cloudflare, or add a domain you already own to Cloudflare. Then run cairn new again.", nil)
}

// checkAddress refuses an address that already answers for something: a DNS record, a Worker
// custom domain, or a Worker route on any of its hosts. A custom domain already attached to
// worker, the site's own Worker, is the site's, along with the DNS record Cloudflare made for
// it; worker is empty before the site has a Worker.
func (r *run) checkAddress(ctx context.Context, worker string) error {
	inUse := func(host string) error {
		return r.failure(ReasonAddressInUse, "A Worker already serves "+host+".",
			"Remove that Worker's custom domain or route in Cloudflare, and then run cairn new again.", nil)
	}
	for _, host := range r.addresses {
		domains, err := r.cf.WorkerDomainsFor(ctx, host)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		if worker != "" && slices.ContainsFunc(domains, func(d providers.WorkerDomain) bool { return d.Service == worker }) {
			continue
		}
		recs, err := r.cf.DNSRecordsNamed(ctx, r.zone.ID, host)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		if len(recs) > 0 {
			return r.failure(ReasonAddressRecords, "That address already points to another site: "+host+" has DNS records.",
				"Remove its DNS records in Cloudflare, and then run cairn new again.", nil)
		}
		if len(domains) > 0 {
			return inUse(host)
		}
	}
	routes, err := r.cf.WorkerRoutes(ctx, r.zone.ID)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	for _, rt := range routes {
		for _, host := range r.addresses {
			if routeCovers(rt.Pattern, host) && (worker == "" || rt.Script != worker) {
				return inUse(host)
			}
		}
	}
	return nil
}

// routeCovers reports whether a Worker route pattern such as "www.example.com/*" or
// "*.example.com/*" matches requests for host.
func routeCovers(pattern, host string) bool {
	h, _, _ := strings.Cut(pattern, "/")
	if strings.HasPrefix(h, "*") {
		return strings.HasSuffix(host, h[1:])
	}
	return h == host
}

func nextSuffix(s int) int {
	if s == 0 {
		return 2
	}
	return s + 1
}

// freeNames finds the first suffix from start whose Worker, database, and bucket names are free
// on Cloudflare and whose folder is free here, and adopts its names.
func (r *run) freeNames(ctx context.Context, start int) error {
	for s := start; s <= maxSuffix; s = nextSuffix(s) {
		n, err := deriveNames(r.cfg.Answers.SiteName, s)
		if err != nil {
			return err
		}
		taken, err := r.namesTaken(ctx, n)
		if err != nil {
			return err
		}
		if !taken && (s == 0 || !r.folderBusy(n)) {
			r.names, r.suffix = n, s
			return nil
		}
		if r.suffixReason == "" {
			r.suffixReason = "The name " + n.Base + " is already in use on your Cloudflare account."
		}
	}
	base, _ := deriveNames(r.cfg.Answers.SiteName, 0)
	return r.failure(ReasonNamesTaken, "Every name from "+base.Base+" to "+base.Base+"-"+strconv.Itoa(maxSuffix)+" is already in use.",
		"Choose another site name, and then run cairn new again.", nil)
}

func (r *run) namesTaken(ctx context.Context, n Names) (bool, error) {
	worker, err := r.cf.WorkerExists(ctx, n.Worker)
	if err != nil {
		return false, r.fail(ctx, err, "Cloudflare")
	}
	db, err := r.cf.D1DatabaseNamed(ctx, n.Database)
	if err != nil {
		return false, r.fail(ctx, err, "Cloudflare")
	}
	bucket, err := r.cf.R2BucketNamed(ctx, n.Bucket)
	if err != nil {
		return false, r.fail(ctx, err, "Cloudflare")
	}
	return worker || db != nil || bucket != nil, nil
}
