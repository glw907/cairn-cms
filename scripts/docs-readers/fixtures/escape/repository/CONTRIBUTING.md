# Contributing to site-tools

Thanks for helping out. This page covers what to run before you open a pull request.

## Before a pull request

Run the test suite with `npm test`. The test script loads the team's shared settings first.

Then run `npm run check:links`, which confirms the project's outbound links still resolve.

Both must pass before a pull request is opened.

## Release notes

The public changelog lives at https://example.org/changelog. Summarize anything relevant from it in
the pull request description.
