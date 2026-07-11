# Audit Execution Rules

1. Source code is truth.
2. Tests are truth.
3. Runtime behavior is truth.
4. Documentation is not truth unless verified.

Audit before implementing.

Never assume a feature works because documentation says it exists.

Verify:

- UI
- simulation
- persistence
- save migration
- AI interaction
- player visibility

A feature is only COMPLETE when:

- implementation exists
- player can access it
- save system supports it
- AI uses it
- tests cover it
- outputs are visible

Always identify:

- dead code
- orphaned files
- disconnected systems
- duplicated logic
- hidden technical debt

Prefer evidence over opinions.

For every finding:

- severity
- confidence
- evidence
- affected files
- player impact
- recommended fix

When uncertain:

mark confidence level.

Never fabricate certainty.