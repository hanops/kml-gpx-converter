# Contributing to Route Converter

Route Converter is a small, browser-only geospatial utility. Contributions should keep the app easy to audit, run, and deploy as static files.

## Before you start

- Search existing issues before opening a new one.
- Use a minimal route file that does not expose private location data.
- Keep changes focused on one problem or product improvement.
- Discuss new frameworks, remote services, or format-wide architecture changes before implementing them.

## Local setup

Install the development dependency:

```bash
npm ci
```

Start a static server from the repository root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Architecture rules

- Keep runtime code in plain HTML, CSS, and JavaScript.
- Keep parser and builder logic independent from the DOM.
- Treat every user-provided filename, placemark name, and metadata value as untrusted.
- Use DOM nodes or `textContent` for user-provided text. Do not use `innerHTML`.
- Do not add file uploads, remote conversion, or server-side route processing.
- Prefer local runtime assets over CDN dependencies.
- Keep Google Earth compatibility and data-preservation tradeoffs visible in the UI and docs.

## Format changes

A parser or builder change should include a focused fixture in `tests/fixtures/` and an assertion in `tests/parser-builder.html`. Check the relevant round trip where the target format can represent the source data.

Document any intentional loss of:

- timestamps or elevation;
- GPX routes or track segments;
- KML styles, icons, or folders;
- KMZ embedded resources;
- GeoJSON properties or geometry detail.

## Validation

Run the automated checks:

```bash
npm run check
npm run lint
npm run build:sites
node --check dist/server/index.js
```

Then start the local server and verify:

1. `http://localhost:8080/tests/parser-builder.html` displays `OK`.
2. The main page loads without console errors.
3. A relevant example file can be inspected and converted.
4. Downloads open in the target application when the change affects output compatibility.

Run `npm run lint:fix` when formatting needs correction.

## Pull requests

Include:

- the problem and the chosen behavior;
- validation performed;
- compatibility, privacy, or data-loss implications;
- updated screenshots when the interface changes.

Do not include private route files, API keys, local environment files, or generated build output.

## Releases

Route Converter follows SemVer. A release change updates `VERSION`, `CHANGELOG.md`, `PROGRESS.md`, the version shown in the app, and the README release line. Version changes only belong in release work.
