# Features Layer

Feature modules should live here, grouped by business domain (for example: `marketplace`, `notifications`, `profile`, `payments`).

Each feature should own:

- UI specific to that feature
- feature hooks
- feature services/selectors
- local tests

Cross-feature utilities belong in `src/shared`.
