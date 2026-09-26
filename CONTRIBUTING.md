# Contributing

## Branches and pull requests

- Branch from `main` and use `feat/`, `fix/`, `chore/`, `docs/`, or `design/` followed by a short kebab-case description.
- Use a matching conventional title such as `feat: add landing page` or `chore: configure CI`.
- Keep pull requests small and explain what changed, how it was checked, and any follow-up work. Link the relevant issue with `Closes #123` when appropriate.
- Add screenshots or a short recording for visible changes.
- Request at least one teammate's approval. The author does not approve their own PR.
- Update the branch after requested changes and wait for required checks before merging.
- Use squash merge unless there is a clear reason to preserve separate commits. Delete the branch after merging.

## Before requesting review

- Run the project's documented checks once they exist. Until then, describe the manual checks you performed.
- Update README or other docs when setup or behavior changes.
- Never commit credentials, access tokens, or private user data. Add sample configuration with placeholder values instead.
- Flag breaking changes and deployment effects in the PR description.

## Keeping the demo healthy

Avoid direct pushes to `main`. If a demo-blocking issue needs a quick fix, open a focused `fix/` branch and ask a teammate for prompt review.
