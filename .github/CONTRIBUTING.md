# Contributing

Coordinate work through an EXUI ticket and the architecture proposal linked in the README. Keep migration, dependency upgrades and behaviour changes separately reviewable.

1. Branch from `master` using a ticket-based feature or fix name.
2. Use the Node/Yarn versions and local commands in the README.
3. Run `yarn install --immutable`, `yarn lint` and `yarn test`. Add meaningful validation for any new behaviour.
4. Open a pull request with the ticket, changed behaviour, evidence and compatibility impact.
5. Obtain two human approvals, including EXUI code-owner review, and a passing `build` check before merging.

Keep commit messages about the change. Never include credentials or case data. Report vulnerabilities through [SECURITY.md](../SECURITY.md).

This bootstrap has no runtime or release pipeline. Adding exports or enabling publication requires the proposal's applicable feasibility evidence; a green configuration check does not replace it.
