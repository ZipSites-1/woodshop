# schemas-and-types — Task Checklist

## Scope
Authoritative JSON Schemas for MCP tools and generated TypeScript types for server/clients.

## Definition of Done
- Schemas live in `packages/schemas`
- Types generated into `packages/types`
- Back-compat rules documented; breaking changes require changesets

## Tasks
- [ ] Write/validate schemas for all tools
- [ ] Codegen TS types (zod or json-schema-to-ts)
- [ ] Contract tests in `apps/mcp-server`
- [ ] Examples folder with valid/invalid payloads

## Acceptance
- [ ] All schemas validated; types compiled
- [ ] Server builds against generated types only
