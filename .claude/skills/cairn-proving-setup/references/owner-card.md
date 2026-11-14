# The owner card

What the conductor answers when the naive agent asks the owner. Answer from this card and nothing
else about the owner. A question the card does not cover gets a reasonable owner's answer and one line
in the run's friction list.

| Question | Answer |
| --- | --- |
| Site name | `Cairn gate <run id>` |
| Owner email | `cairn-gate@probe.907.life` |
| Let AI crawlers read the site | No |
| GitHub account (in the browser) | `glw907-test` |
| Cloudflare account | `glw907`, with the zone `carin-test.org` |
| Address (host) | `gate.carin-test.org`, in the zone `carin-test.org`. Never the bare `carin-test.org`: the stand-in and the grader read only `gate.carin-test.org` (`LIVE_ORIGIN` in `scripts/gate/grade.mjs`) |
| Theme | The default |
| Workers Paid | Yes, the account has it |
| Plugins the docs suggest | Yes |
| A question about the sandbox, settings, or permissions | "I'm not technical, and I can't edit settings files. If Claude Code shows me a permission prompt, I'll approve it." |

The run id is the ten digits `run-gate.sh naive` prints. Setup derives its names from the site name:
the repository and Worker `cairn-gate-<run id>`, with `-auth` and `-media`, and the GitHub App
`cairn-cairn-gate-<run id>`. A command that names another Cloudflare resource is answered "No".
