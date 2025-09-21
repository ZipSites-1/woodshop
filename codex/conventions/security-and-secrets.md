# Security & Secrets

## Principles
- Least privilege by default; tool allow-list enforced in MCP server.
- All inputs validated by schema; no free-text where enums/numbers suffice.
- No secrets in source control or logs. Use CI secret stores.

## Practices
- `.env.example` with documented keys. Never commit real `.env`.
- Secret scanning enabled in CI.
- SBOM generated for releases; dependencies pinned and reviewed.
