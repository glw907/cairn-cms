# Set up and run a cairn site

A person who is comfortable pasting a command into a terminal and following written steps exactly can set up and run a cairn site without writing code. The setup command, `create-cairn-site`, does the work, and these pages explain what it does, state what it costs, and get you moving again when a step stops.

If you write content on a site that someone else set up, you want the editors' help instead, which opens from the admin's **Help** link. If you build custom screens or features on cairn, start from the [cairn repository](https://github.com/glw907/cairn-cms), whose README routes a developer.

## Pick the page that fits

The following table routes you by what is happening now.

| Your situation | Read |
| --- | --- |
| You're deciding whether to set up a site | [Before you start](./before-you-start.md) |
| You're setting up for the first time | The numbered pages in the next section, in order |
| A setup run stopped | [Recover a setup that stopped](./setup-recovery.md) |
| A `cairn doctor` check failed | [Check that your site works](./is-it-working.md) |
| The live site misbehaves | [Troubleshoot a live site](./troubleshooting.md) |

## Set up a site in order

1. [Before you start](./before-you-start.md) covers what you end up owning, what it costs, and what a developer still has to do.
2. [Create your site](./create-your-site.md) takes you from nothing to a live site with you signed in.
3. [Own your domain](./own-your-domain.md) moves the site onto a domain you own, turns on sign-in email, and connects automatic deploys.
4. [Invite editors](./invite-editors.md) adds the people who will write on the site.

## Also in this track

- [Rotate the GitHub App key](./rotate-the-github-app-key.md) replaces the key your site signs its commits with.
- [Credentials](./credentials.md) says which secrets the `cairn` CLI stores and where.
- [Run cairn on a schedule](./tripwire.md) describes a scheduled health check that pages someone when a site needs attention.
