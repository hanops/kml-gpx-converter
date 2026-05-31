# AGENTS.md

## Project

This repository is a pure frontend KML / KMZ / GPX converter.

The app runs entirely in the browser. There is no backend, build step, package manager, or framework by default. Keep it that way unless there is a clear product reason to add more infrastructure.

Current release line: **v1.1.x**.

## Structure

- `index.html` contains the single-page UI.
- `css/style.css` contains layout and visual styling.
- `examples/` contains public manual test files.
- `js/parser.js` parses GPX/KML XML into the shared `{ tracks, waypoints }` model.
- `js/builder.js` builds GPX/KML XML from the shared model.
- `js/app.js` owns file input, drag/drop, KMZ unzip/zip, preview, batch conversion, map rendering, and downloads.
- `tests/parser-builder.html` is the browser-based test runner.
- `tests/fixtures/` contains GPX/KML fixture files used by the test runner.
- `vendor/` contains local Leaflet and JSZip runtime dependencies.
- `.github/` contains issue templates, the pull request template, and CI.
- `CONTRIBUTING.md` and `SECURITY.md` define project collaboration and security guidance.
- `VERSION`, `CHANGELOG.md`, `PROGRESS.md`, and `LICENSE` are release and progress metadata.
- `vercel.json` configures Vercel deployment and security headers.
- `package.json` defines npm scripts for syntax checking and formatting.

## Local Run

The app can be opened directly as `index.html`, but HTTP is preferred for testing.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Validation

Run JavaScript syntax checks and code formatting:

```bash
npm run check
npm run lint
```

Format code with:

```bash
npm run lint:fix
```

Run browser tests by starting a static server and opening:

```text
http://localhost:8080/tests/parser-builder.html
```

The test page should display `OK`.

Also verify the main page loads without browser console errors.

CI runs `npm run check` (JavaScript syntax), `npm run lint` (Prettier formatting), and required-file checks on pushes to `main` and on pull requests.

## Coding Guidelines

- Prefer plain HTML, CSS, and JavaScript.
- Avoid adding bundlers, transpilers, package managers, or frameworks unless explicitly requested.
- Keep parser and builder logic independent from DOM/UI code.
- Keep user-provided text out of `innerHTML`; use `textContent` or DOM nodes.
- Preserve local-only privacy: do not introduce file uploads or remote processing.
- Prefer local `vendor/` assets over CDN runtime dependencies.
- Keep KMZ handling in `js/app.js` unless it becomes large enough to justify a dedicated module.
- Keep comments sparse and useful.

## Format Support Notes

Currently supported:

- GPX tracks: `trk` / `trkseg` / `trkpt`
- GPX routes: `rte` / `rtept`
- GPX waypoints: `wpt`
- KML tracks: `LineString`
- KML Google extension tracks: `gx:Track`
- KML point placemarks: `Point`
- KMZ files containing a `.kml` entry

Known limits:

- KML styles, icons, folder hierarchy, and rich metadata are not preserved.
- GPX route input is normalized into the shared track model.
- KMZ output contains generated `doc.kml` only; embedded resources are not preserved.
- Leaflet and JSZip are vendored locally; map tiles still use the network.

## Release Checklist

For a release:

1. Update `VERSION`.
2. Update `CHANGELOG.md`.
3. Update `PROGRESS.md` with the release summary.
4. Confirm `LICENSE` is present.
5. Confirm `CONTRIBUTING.md`, `SECURITY.md`, and GitHub templates are current.
6. Run `npm run check` and `npm run lint`.
7. Run `tests/parser-builder.html` and confirm `OK`.
8. Verify the main page loads with no console errors.
9. Confirm README version and known limits are accurate.
10. Confirm `docs/assets/screenshot-main.png` matches the current UI.
