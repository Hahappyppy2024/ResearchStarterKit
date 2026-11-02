# ResearchStarterKit — English Edition

A local research desktop with an English interface and a mist-blue lotus design.

Read the [bilingual project homepage](README.md) for features, setup, data boundaries, and repository structure.

## Run

Requires Python 3.11+. From this repository's root:

```sh
python run.py
```

Open http://127.0.0.1:8869/#daily. This requires the local Python backend; GitHub Pages alone cannot run it.

## Privacy

The public edition creates its own empty local database. Private course materials, owner records, uploaded files, and the Daily News / private News and Ideas modules are excluded.

## Interface

English labels are bundled in `sites/mist-blue-lotus/app/web-shared/english-ui.json`. Translation occurs only in rendered UI text and descriptive attributes. Input values and stored user records are not rewritten. Some specialist machine translations may need editorial refinement.

## Verify

```sh
python scripts/check_full_release.py
python scripts/run_site_checks.py
```
