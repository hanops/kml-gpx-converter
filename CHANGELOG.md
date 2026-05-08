# Changelog

All notable changes to this project are documented here.

## V1.1.1 - 2026-05-08

- Made the frontend version display more explicit with a title badge.
- Updated footer version text to show the current patch version and v1.1 series.
- Updated project version metadata to `1.1.1`.

## V1.1.0 - 2026-05-08

- Added explicit project version metadata.
- Added MIT license for open-source distribution.
- Fixed batch conversion so manual conversion direction is respected.
- Kept automatic conversion mode as true per-file type detection.
- Added validation for file type and selected conversion direction mismatches.
- Added XML parser error detection for invalid KML/GPX content.
- Improved KMZ handling by requiring an actual `.kml` entry.
- Escaped user/file/waypoint-derived text in UI rendering paths.
- Fixed coordinate preview hemisphere labels for south and west coordinates.
- Added GPX route (`rte` / `rtept`) parsing.
- Added Google Earth `gx:Track` parsing with timestamp alignment.
- Added browser-based parser/builder tests and fixture files.
- Updated README with version, testing, privacy, browser compatibility, and known limits.
- Added local vendored Leaflet and JSZip assets to remove runtime CDN dependency for scripts and styles.
- Added example GPX/KML files for manual testing.
- Added README screenshot asset.
- Added AGENTS.md with repository maintenance guidance.
- Added standard GitHub project files: `.gitignore`, `.editorconfig`, contribution guide, security policy, issue templates, pull request template, and CI.
