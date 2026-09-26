# Northlink — Hack for Humanity

Northlink is our Hack for Humanity team project. This repository is the shared home for the prototype, design decisions, and demo materials. We will add the product brief, setup instructions, and architecture as the idea takes shape.

## Team workflow

We are a five-person team with two engineers, one designer, and a DevOps engineer. Work happens on short-lived branches and lands on `main` through GitHub pull requests. Keep `main` ready to demo.

1. Open or choose a GitHub issue and agree on the smallest useful change.
2. Create a branch from the latest `main`: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `docs/<short-description>`, or `design/<short-description>`.
3. Make the change, test what you can, and open a pull request using the repository template.
4. Request one teammate's review. Resolve comments and merge after checks and approval pass.
5. Prefer squash merge so the GitHub history stays easy to scan.

Use the same type prefixes for commit and PR titles, for example `feat: add onboarding screen` or `fix: handle empty search results`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full checklist.

## Getting started

The application stack has not been selected yet. Once it is, document prerequisites, local setup, environment variables, and run/test commands here. Keep secrets out of Git; commit an `.env.example` when configuration is needed.

## Project status

Foundation setup is in progress. Track scope and ownership in GitHub Issues and pull requests.

## License

This project is available under the [MIT License](LICENSE).
