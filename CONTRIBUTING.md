# Contributing

Thanks for helping improve KML / KMZ / GPX Converter.

## Project Principles

- Keep the app frontend-only and local-first.
- Avoid adding a build step or framework unless there is a clear product need.
- Keep parsing/building logic separate from UI logic.
- Treat user-provided file content as untrusted; do not render it with `innerHTML`.
- Preserve privacy: do not introduce uploads or remote processing.

## Local Development

Start a static server from the repository root:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Validation

Before submitting changes, run:

```bash
node --check js/parser.js
node --check js/builder.js
node --check js/app.js
```

Then open:

```text
http://localhost:8080/tests/parser-builder.html
```

The test page should display `OK`.

## Pull Requests

For pull requests, include:

- What changed and why.
- Manual validation steps.
- Any known compatibility or data-preservation tradeoffs.
- Screenshot updates when UI changes.

## Versioning

Use SemVer-style versions: `MAJOR.MINOR.PATCH`.

For release changes, update:

- `VERSION`
- `CHANGELOG.md`
- README version text, if applicable

