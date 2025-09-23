# Agent Pack Error Playbooks

Document repeatable recovery strategies for common MCP failures. Populate each section with concrete guidance as scenarios are implemented.

## Schema Validation Failure
- Inspect `issues[]` from middleware; note failing path and reason.
- Adjust payload field-by-field; avoid resubmitting identical JSON.
- If user input conflicts with schema (e.g., unsupported controller), explain and propose alternatives.

## Engine Error / Infeasible Geometry
- Capture `code`, `message`, `hints[]` from the MCP response.
- Provide a checklist (simplify geometry, loosen tolerances, change stock).
- Offer to rerun after adjustments and log the new `revision_id`.

## Nesting Unreachable Utilization
- Compare `utilization`, `offcuts`, `strategy`.
- Recommend fallback strategy (e.g., `first_fit`) or manual sheet adjustments.
- Remind user how to reuse seeds for deterministic comparisons.

## Consent Missing / Destructive Op Blocked
- Explain the consent requirement and expected token syntax.
- Re-plan with preview-only actions until consent arrives.
- Store the token in context and confirm when it is consumed.

## Timeout / Partial Response
- Note last successful tool call and partial artifacts available.
- Offer to resume, retry with lower precision, or schedule offline execution.
- Capture timing metrics for observability.

_Add more scenarios as we build eval coverage._

