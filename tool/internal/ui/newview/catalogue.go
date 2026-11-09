package newview

import "github.com/glw907/cairn-cms/tool/v2/internal/setup"

// This file holds the view's own copy: every string the screens show that the setup package
// leaves to the view. A value the view fills at run time appears as <n>, <url>, <time>, or <link>,
// which the call site replaces. The failure parts come from setup.Failure, and the waiting
// sentences from setup.WaitSentence, so neither is repeated here.

// The welcome screen and the SSH stop.
const (
	titleWelcome   = "Set up a cairn site"
	welcomeCreates = "Setup creates your site on GitHub and Cloudflare and publishes it to your domain."
	welcomeApprove = "You approve four requests in your browser."
	welcomeNeed    = "You need a domain on Cloudflare and the Workers Paid plan."
	welcomeRead    = "Before you start, read <link>."

	titleSSH       = "Setup can't run over SSH"
	sshBody        = "Setup opens its approval pages in a browser on the computer where it runs. Run cairn new in a terminal on the computer where you use your browser."
	nothingCreated = "Nothing was created."
)

// The questions.
const (
	titleQuestions = "About your site"

	labelTheme  = "Theme"
	descTheme   = "How your site looks to readers."
	labelDesign = "Design"

	labelSiteName = "Site name"
	descSiteName  = "Shown at the top of every page."
	labelRepo     = "Repository"
	// errSlug is setup's line for a name that yields no repository name.
	errSlug = setup.LineSlugNoLetters

	labelCrawlers = "AI crawlers"
	descCrawlers  = "Choose whether AI companies can use your content to train their models. This setting doesn't affect search engines."
	optionBlock   = "Block AI training"
	optionAllow   = "Allow AI training"
)

// The browser screens.
const (
	titleBrowser   = "Approve setup in your browser"
	browserBefore  = "Setup opens a tab in your browser. Approve these four requests in that tab."
	browserDuring  = "Approve each request in the setup tab. The next request opens in the same tab."
	browserNoTab   = "If no tab opened, go to <url>"
	browserNoOpen  = "Setup couldn't open your browser. Go to <url>"
	browserResume  = "To resume, run cairn new again."
	countdownLeft  = "<time> left to approve"
	countdownLate  = "If the countdown reaches 0:00, run cairn new again to resume."
	permissionName = "API Tokens: Write"

	approvalAllow   = "Cloudflare: Allow"
	approvalCreate  = "GitHub: Create"
	approvalInstall = "GitHub: Install & Authorize"
	approvalApprove = "GitHub: Approve"
)

// The prerequisite failure.
const (
	titleNoDomain = "Setup needs a domain on Cloudflare"
	titleStopped  = "Setup can't continue"

	partHappened = "What happened"
	partDid      = "Already done"
	partLeft     = "Left in place"
	partDo       = "What to do"

	linkRegister = "Register a domain"
	linkMove     = "Add a domain you own"
	linkStart    = "cairn.pub/start"
)

// The account, domain, and resume choices.
const (
	titleDomain = "Choose a domain"
	labelDomain = "Domain"
	descDomain  = "<n> domains on your Cloudflare account"

	titleAccount = "Choose an account"
	labelAccount = "Account"
	descAccount  = "Your Cloudflare sign-in can use <n> accounts. Setup creates your site in the one you choose."

	titleResume = "Resume setup"
	labelResume = "Site"
	descResume  = "Choose a site that didn't finish setting up on this computer, or start a new site."
	optionNew   = "Start a new site"
)

// The summary. The address edit's note is setup.ProblemHost, and its refusals are setup's.
const (
	titleSummary   = "Review the settings for <name>"
	labelAddress   = "Address"
	labelEmail     = "Sign-in email"
	labelWorker    = "Worker"
	labelDatabase  = "Database"
	labelBucket    = "Storage bucket"
	labelDeploys   = "Deploys"
	reasonDomain   = "the only domain on your account"
	reasonAddress  = "the bare domain and www, the default"
	reasonEmail    = "from your Cloudflare account"
	reasonNames    = "based on your site name"
	valueAddresses = "<host> and <www>"
	valueDeploys   = "GitHub Actions, each time you publish"
	reasonDeploys  = "free for about 650 deploys a month"
	linkDeploys    = "cairn.pub/deploys"
	noteEmail      = "The admin sends your sign-in links to this address."
)

// The watch. Each step's label and the sentence shown while it runs; <folder>, <host>, and
// <repo> take the summary's names. The sign-in step's sentence is setup.LineSignInStep.
const (
	titleWatch = "Setting up <name>"
	watchLeave = "You can leave this running. When your site is live, setup emails a sign-in link to <email>."

	stepScaffold     = "Write the site files"
	whyScaffold      = "Setup writes your site into <folder> on this computer."
	stepProvision    = "Create the database, storage bucket, and email"
	whyProvision     = "The admin stores sign-ins and settings in the database and uploads in the storage bucket. Cloudflare sends the admin's sign-in links from <host>."
	stepCommit       = "Commit the site"
	whyCommit        = "Setup writes your site's settings and makes its first commit in <folder>."
	stepPush         = "Push the site to GitHub"
	whyPush          = "Your site's code and content are stored in <repo>."
	stepDeployKey    = "Store the deploy key in GitHub"
	whyDeployKey     = "GitHub Actions uses this key to deploy to Cloudflare. Only workflows in <repo> can read the key."
	stepFirstDeploy  = "Run the first deploy"
	whyFirstDeploy   = "GitHub Actions deploys your site each time someone publishes. The first deploy takes a few minutes."
	stepDomains      = "Connect <host>"
	whyDomains       = "Cloudflare is issuing the site's HTTPS certificate. This can take up to 15 minutes."
	stepSignIn       = "Sign in to the admin"
	titleDeployFails = "The first deploy failed"
	linkWorkers      = "Workers pricing"
)

// The done screen.
const (
	doneLive     = "<name> is live at <url>"
	doneSignedIn = "You're signed in to the admin in your browser."
	doneEmailed  = "Setup also emailed a sign-in link to <email>."
	doneNoSignIn = "Setup sent no sign-in link, because the site already has editors and <email> isn't one of them."
	labelEdit    = "Edit your site"
	labelInvite  = "Invite an editor"
	valueInvite  = "Admin > Editors"
	labelDocs    = "Read the docs"
	linkDocs     = "cairn.pub/docs"
	doneTook     = "Setup took <time>."
)

// The Ctrl+C lines.
const (
	stopNothing = "Setup stopped. Nothing was created."
	stopResume  = "Setup stopped. To resume, run cairn new again."
)

// The window titles: the base, then what the window wants from the owner after a separator.
const (
	windowBase     = "cairn new"
	windowApprove  = "approve in your browser (<n> of <total>)"
	windowReview   = "review"
	windowSettings = "setting up"
	windowDone     = "done"
	windowStopped  = "stopped"
)

// The footer verbs.
const (
	verbStart       = "start"
	verbNext        = "next"
	verbOpen        = "open your browser"
	verbChoose      = "choose"
	verbBack        = "back"
	verbQuit        = "quit"
	verbStop        = "stop"
	verbSetUp       = "set up"
	verbEditEmail   = "edit email"
	verbEditAddress = "edit address"
	verbSave        = "save"
	verbCancel      = "cancel"
)

// Where the screens link.
const (
	urlStart    = "https://cairn.pub/start"
	urlRegister = "https://developers.cloudflare.com/registrar/get-started/register-domain/"
	urlMove     = "https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/"
	urlDeploys  = "https://cairn.pub/deploys"
	urlDocs     = "https://cairn.pub/docs"
	urlWorkers  = "https://dash.cloudflare.com/?to=/:account/workers/plans"
)

// Catalogue returns every string the view's copy carries, for the copy golden.
func Catalogue() []string {
	return []string{
		titleWelcome, welcomeCreates, welcomeApprove, welcomeNeed, welcomeRead,
		titleSSH, sshBody, nothingCreated,
		titleQuestions, labelTheme, descTheme, labelDesign, labelSiteName, descSiteName, labelRepo,
		errSlug, labelCrawlers, descCrawlers, optionBlock, optionAllow,
		titleBrowser, browserBefore, browserDuring, browserNoTab, browserNoOpen, browserResume,
		countdownLeft, countdownLate,
		approvalAllow, approvalCreate, approvalInstall, approvalApprove,
		titleNoDomain, titleStopped, partHappened, partDid, partLeft, partDo,
		linkRegister, linkMove, linkStart,
		titleDomain, labelDomain, descDomain, titleAccount, labelAccount, descAccount,
		titleResume, labelResume, descResume, optionNew,
		titleSummary, labelAddress, labelEmail, labelWorker, labelDatabase, labelBucket, labelDeploys,
		reasonDomain, reasonAddress, reasonEmail, reasonNames, valueAddresses, valueDeploys, reasonDeploys,
		linkDeploys, noteEmail,
		titleWatch, watchLeave, stepScaffold, whyScaffold, stepProvision, whyProvision, stepCommit, whyCommit,
		stepPush, whyPush, stepDeployKey, whyDeployKey, stepFirstDeploy, whyFirstDeploy, stepDomains, whyDomains,
		stepSignIn, titleDeployFails, linkWorkers,
		doneLive, doneSignedIn, doneEmailed, doneNoSignIn, labelEdit, labelInvite, valueInvite, labelDocs,
		linkDocs, doneTook,
		stopNothing, stopResume,
		windowBase, windowApprove, windowReview, windowSettings, windowDone, windowStopped,
		verbStart, verbNext, verbOpen, verbChoose, verbBack, verbQuit, verbStop,
		verbSetUp, verbEditEmail, verbEditAddress, verbSave, verbCancel,
	}
}
