# Post-freeze notes on the cairn case (revision 12, `dcb11bd3`)

The case is frozen; a change to it reopens the derived artifacts. These notes record what the
derivation surfaced and defer the decision to reopen.

1. Note `[^61]` names `cairn-cms[bot]` as the committer. That is true of the reference sites,
   which run the engine author's GitHub App installation. A scaffolded site creates its own App,
   so its committer is the site's own bot. The figure sidecars say "your own GitHub App as
   committer", which is right for the scaffolded case; the case's note is the loose one.
2. Open question 1 lists the front-door figure's candidate forms and decides none. The shipped
   concept figure took option one (cairn's screens and the site's screens inside `/admin`, the
   payments provider and organizational mail outside) and drew the members' area inside the app
   boundary and outside `/admin`, the reading `[^38]` supports. The open question should record
   that when the case next reopens.
3. The figure check (2026-09-05) found four labels behind revision 12 and one front-door
   obligation missing (the Email Sending beta and paid boundary). All were applied to the figure
   source and sidecars; the case needed no change.
4. Identity (Geoff, 2026-09-07). The case, the front-door proposal (`25-front-door-proposal.md`,
   the two-roles paragraph), and the live `why-cairn.md` describe the default as a small
   coordinated team with two roles and say a larger pool is built on the auth seams. None says
   the assumption underneath: with the zero-config default, the CMS is the organization's
   identity system for its editors, which holds for a small organization and rarely for a larger
   one. The truthful sentence today is the assumption plus the fact that a second audience runs
   on the site's own auth. The stronger sentence, that the admin login itself can run on an
   organization's identity system, is a charter promise with no seam behind it yet (friction log,
   `extender`, 2026-09-07); the front door may carry it only after that seam ships and is
   documented. When the case next reopens, add the assumption to the audience leg beside `[^33]`
   and `[^37]`, and keep the stronger claim out until the seam exists.
