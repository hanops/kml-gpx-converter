# Project Progress

This file records major implementation decisions and verification milestones. User-facing release notes live in `CHANGELOG.md`.

## 2026-07-21 - English interface, app identity, and documentation

### Completed

- Rebuilt the product interface as an English cartographic workspace with distinct import, inspection, and export stages.
- Added a shared route logo for the homepage, browser favicon, and installable app icons.
- Kept the product name as Route Converter across the app, manifest, package metadata, and documentation.
- Reorganized the README, contribution guide, security policy, repository templates, and maintainer instructions around the current V1.2.x product.
- Published the current app through OpenAI Sites and kept the GitHub source synchronized.

### Validation

- `npm run check`
- `npm run lint`
- `npm run build:sites`
- `node --check dist/server/index.js`

## 2026-07-20 - Route Converter V1.2.0

### Completed

- Added GeoJSON import and export for routes and waypoints.
- Generated Google Earth-compatible KML and KMZ output with shared styles, endpoint markers, and `gx:Track` for complete time sequences.
- Preserved GPX route semantics and track segments when requested.
- Added compatibility checks, route statistics, file and point limits, track simplification, timestamp and elevation controls, endpoint trimming, and offline map preview.
- Improved batch export and added PWA installation and offline asset caching.

### Validation

- `npm run check`
- `npm run lint`
- `npm run build:sites`
- Browser parser and builder fixtures

## 2026-05-31 - Frontend and project maintenance

### Completed

- Introduced the first map-inspired visual system and redesigned the drop zone.
- Added Prettier configuration, npm validation scripts, and GitHub Actions checks.
- Added Vercel deployment headers and web analytics.
- Added contributor, security, release, and maintenance documentation.

## 2026-05-08 - Initial open-source release

The initial release established KML, KMZ, and GPX conversion, browser tests, local Leaflet and JSZip dependencies, example files, MIT licensing, and GitHub project templates. See `CHANGELOG.md` for version-level details.
