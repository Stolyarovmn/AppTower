# 14 — GitHub publishing

Repository: `Stolyarovmn/AppTower`.

## Public-readiness gate

Keep the repository private until:

- the current P0 live-runtime queue is completed in real Edge/Chrome;
- the public privacy/security/support documents are final;
- source history has been reviewed for secrets and unintentionally published personal data;
- the store candidate package is reproducible from the tagged source.

Before changing visibility to public, review Git history as well as the current tree. Deleting a secret from the latest commit is not sufficient if it remains in history.

## What belongs in Git

Commit:

- `app/`
- `variants/`
- `docs/`
- `tools/`
- `.github/`
- `archive/` while the historical binary footprint remains small
- `LICENSE`
- `CHANGELOG.md`
- `README.md`
- `PRIVACY.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `SUPPORT.md`
- `AGENTS.md`
- `.editorconfig`
- `.gitignore`

Do not commit:

- private signing keys (`*.pem`);
- generated `.crx` files;
- browser profiles;
- secrets/tokens;
- generated `dist/` output;
- internal temporary prompts/artifacts excluded by `.gitignore`.

If historical release ZIPs become large, move binary artifacts to GitHub Releases and keep only metadata/checksums in the main branch.

## Branch policy

Recommended:

- `main` — tested baseline;
- `feature/<name>` — isolated feature work;
- `fix/<name>` — regression fixes;
- `chore/<name>` — repository/tooling/documentation maintenance;
- release tags — `vX.Y.Z`.

For a public repository, protect `main` with a GitHub ruleset/branch protection policy. At minimum:

- changes through pull requests;
- required successful validation workflow;
- block force pushes/deletion of `main`;
- require the branch to be up to date before merge if the workflow depends on current base state.

Signed commits/tags are recommended for release provenance but are not required by App Tower runtime.

## CI security

GitHub Actions should use the minimum token permissions needed by each workflow. The validation workflow only needs repository contents read access.

Prefer pinning third-party/reusable Actions to immutable full commit SHAs for stronger supply-chain guarantees. If human-readable major tags such as `@v4` are retained, review/update them deliberately.

## Releases

A public release should be created only after live verification for the release's claimed behavior.

Release flow:

1. finish source changes in `app/`;
2. update version/schema/docs;
3. run static validation and packaging;
4. perform live Edge/Chrome acceptance tests;
5. commit the verified source baseline;
6. create an immutable release tag `vX.Y.Z`;
7. create a GitHub Release from that tag;
8. attach generated Edge/Chrome and fallback ZIPs plus checksums;
9. publish/store-submit the exact package built from that tag.

Do not rewrite historical release assets after publication. If a package must change, create a new version/tag.

## Repository metadata before public launch

Fill GitHub About metadata with a concise description and topics. Suggested topics:

- `browser-extension`
- `microsoft-edge`
- `google-chrome`
- `chromium`
- `manifest-v3`
- `side-panel`
- `productivity`
- `pwa`

Do not use repository metadata that implies Microsoft endorsement or ownership.
