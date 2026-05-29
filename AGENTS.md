# AGENTS

## Default Workflow
Follow this sequence for every task:

1. Explore
2. Understand
3. Plan
4. Review
5. Implement
6. Test
7. Review
8. Push / Present

## Working Rules
- Always use sub-agents where helpful to preserve main context.
- Read the codebase and existing patterns before proposing changes.
- Get sign-off on the plan before changing repo-tracked files when the task is non-trivial.
- Always test locally in the browser before pushing.
- Keep responses token-efficient: no padding, no unnecessary summaries.
- Plan files must always be read in full and then fully rewritten. Never prepend or append to stale content.
- Debug by tracing data flow first: hook/state -> variable extraction -> render condition -> action call -> response handling.
- If the API works elsewhere on the same page, assume the bug is in the component/data flow before blaming infrastructure.

## Safety Rules
- Never modify Docker or compose files unless explicitly approved.
- Follow this repo's actual branch and release flow; do not assume a PR target branch without checking current project instructions.

## Testing Rules
- Browser-test the actual flow you changed before pushing.
- Prefer verifying the exact user path, not only lint/build.
- If something cannot be tested locally, say so clearly before push/present.
