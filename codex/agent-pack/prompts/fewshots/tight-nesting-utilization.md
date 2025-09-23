# Few-shot: Tight Nesting Trade-offs

Use this example when the user prioritizes sheet utilization or waste reduction. Highlight strategy selection and deterministic seeds.

## Context
- 30 small parts with mixed grain constraints (Along X / Along Y / Either).
- Stock: 2440 mm × 1220 mm plywood, kerf 3 mm, trim 15 mm.
- Strategy comparison between `first_fit` (faster) and `skyline_high_utilization` (slower, higher yield).

## Skeleton Trace
1. **Plan**
   - Lay out tool sequence with branching plan for strategy comparison.
2. **Act**
   - Show two `nest_parts` calls with identical inputs except `strategy`.
   - Include optional `seed` adjustments and note deterministic expectations.
3. **Verify**
   - Compare utilization, runtime, offcuts; explain trade-offs.
   - Capture warnings (e.g., rotated parts) and confirm acceptance.
4. **Summarize**
   - Recommend final strategy with utilization metrics and mention reproducibility metadata.

## Notes
- Demonstrate how to re-use the same `seed` for comparisons.
- Include guidance on when to escalate to manual sheet adjustments.
