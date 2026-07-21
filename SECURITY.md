# Security Policy

## Supported versions

Security fixes target the current release line.

| Version            | Supported |
| ------------------ | --------- |
| V1.2.x             | Yes       |
| V1.1.x and earlier | No        |

## Report a vulnerability

Do not open a public issue for a vulnerability.

Use GitHub private vulnerability reporting when it is available. Otherwise, contact the repository owner directly. Include:

- a short description and expected impact;
- a minimal non-sensitive file or input that reproduces the issue;
- browser and operating system versions;
- whether the issue affects local-file privacy, script execution, archive handling, or generated output integrity.

Avoid sharing real home, work, or activity locations. Replace private coordinates and timestamps before sending a reproduction file.

## Security model

Route Converter parses and converts files in the browser. The application has no backend for route processing and does not intentionally upload selected KML, KMZ, GPX, or GeoJSON content.

The main trust boundaries are:

- User-selected files are untrusted input.
- KMZ archives may contain unexpected paths or large entries.
- Parsed names and metadata must be rendered with DOM nodes or `textContent`.
- Generated XML and JSON must escape user-derived values correctly.
- Satellite map tiles come from a third-party network service unless offline preview is enabled.
- Hosted analytics may receive ordinary page-view data, but must not receive selected route contents.

Leaflet and JSZip runtime files are vendored in the repository. Their versions and upstream sources are recorded in `vendor/THIRD_PARTY.md`.

## Deployment headers

The included deployment configuration sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

These headers reduce browser-level exposure but do not replace safe parsing, output escaping, file-size limits, or dependency review.
