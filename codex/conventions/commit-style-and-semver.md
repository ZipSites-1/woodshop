# Commit Style & SemVer

## Conventional Commits
Use these types:
- `feat:` new feature
- `fix:` bug fix
- `perf:` performance improvement
- `refactor:` internal change without behavior change
- `docs:`, `test:`, `chore:`

Mark breaking changes with a `BREAKING CHANGE:` footer.

## SemVer
- **MAJOR** for breaking tool schemas/APIs/artifacts
- **MINOR** for new backward-compatible features
- **PATCH** for fixes

Automate releases with changesets; generate changelogs from commits.
