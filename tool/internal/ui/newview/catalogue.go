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
	descAccount  = "<n> accounts on your Cloudflare sign-in"

	titleResume = "Resume setup"
	labelResume = "Setup"
	descResume  = "Setup didn't finish on this computer. Resume a site, or start a new one."
	optionNew   = "Start a new site"
)

// The footer verbs.
const (
	verbStart  = "start"
	verbNext   = "next"
	verbOpen   = "open your browser"
	verbChoose = "choose"
	verbBack   = "back"
	verbQuit   = "quit"
	verbStop   = "stop"
)

// Where the screens link.
const (
	urlStart    = "https://cairn.pub/start"
	urlRegister = "https://developers.cloudflare.com/registrar/get-started/register-domain/"
	urlMove     = "https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/"
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
		verbStart, verbNext, verbOpen, verbChoose, verbBack, verbQuit, verbStop,
	}
}
