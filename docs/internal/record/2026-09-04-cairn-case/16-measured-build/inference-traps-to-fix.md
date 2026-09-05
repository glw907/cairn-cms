# Inference traps the measured build exposed, and where each is fixed

Rulings (Geoff, 2026-09-05): fix these as they are found, and treat the measured build as a
standing probe whose review findings feed the skill, the docs, and the gates, so the next run
measures whether the trap is gone. The governing principle: an agent follows the exemplar, so
the exemplar, the scaffold, the docs, and the skill must say the same thing and be maintained in
tandem; a divergence between any two of them is an inference job handed to the agent, and the
agent will resolve it by copying whichever it read last.

1. Exemplar over doc. The showcase sign-ups screen uses the raw guard/formData/fail shape while
   docs/extend/add-a-custom-admin-screen.md recommends createSectionAction plus requireAccess.
   Internals-C Task 10 decides the docs' direction; chassis-B carries the exemplar's adoption;
   the skill then states "the exemplar is the standard" once they agree. Owner: chassis-B.
2. Done-gate skipped. The skill's audit step (npx cairn-audit, static and rendered, both
   themes) was not run. It becomes a mandatory checklist item in skills/cairn-admin-screens with
   the exact command, and the pass-end ritual runs it on any custom screen. Owner: chassis-A
   Task 12 (records) routes it; polish executes if chassis-A does not.
3. Shipped behaviour changed to satisfy a test (native required and type=email removed so the
   e2e could reach server validation). A doc line in the skill and the custom-screen guide, and
   an idioms note: the test changes, never the product. Owner: chassis-A Task 11 or polish.
4. Baselines regenerated on the workstation against the repo's rule. The skill and the
   what-the-scaffold-wrote page state that admin-visual baselines are CI-canonical, in the
   place an agent reads before running e2e. Owner: chassis-A.
5. Scaffold leak. A custom screen with its own D1 binding reaches templates/waymark unless
   excluded, and create-cairn-site personalises only AUTH_DB and APP_DB. Chassis-A Task 3's
   fixture convention covers exclusion; the scaffolder's database handling is a
   create-cairn-site backlog item. Owner: chassis-A and the create-cairn-site backlog.
6. Tandem maintenance as a gate. A check that the exemplar screen, the skill's stated anatomy,
   and the custom-screen guide agree on the action path, the guard, the live-region rule, and
   the done-gate, so a divergence fails CI rather than waiting for a measured build to find it.
   Owner: chassis-B, filed to ROADMAP.
