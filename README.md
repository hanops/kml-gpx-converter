# Route Converter

A private, browser-based tool for converting route data between **KML**, **KMZ**, **GPX**, and **GeoJSON**. It is designed for clean handoffs between Google Earth, GPS devices, fitness platforms, and GIS tools.

Current version: **V1.2.0**

## Quick start

Open `index.html` directly, or start a local static server for the most reliable browser behavior:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

Drop a KML, KMZ, GPX, or GeoJSON file into the workspace, choose a conversion direction, and select **Convert & download**.

## Highlights

- **Four formats**: convert between KML, KMZ, GPX, and GeoJSON.
- **Google Earth-ready output**: generates KML 2.2 with shared styles, route and waypoint folders, endpoint markers, and `gx:Track` when complete timestamps are available.
- **Route inspection**: review track counts, point counts, waypoints, distance, duration, elevation gain, average speed, coordinates, and a satellite map before export.
- **Batch conversion**: process multiple files and download results individually or as a ZIP archive.
- **Waypoint-only data**: convert valid waypoint collections even when no route line is present.
- **Route editing**: simplify tracks, remove timestamps or elevation, trim approximately 200 metres from each endpoint, and preserve GPX routes and segments.
- **Local by design**: parsing, conversion, KMZ extraction, and packaging happen in the browser.
- **Offline-friendly**: skip map tiles and install the tool as a web app.

## Supported data

| Format  | Supported content                                        |
| ------- | -------------------------------------------------------- |
| GPX     | `trk`, `trkseg`, `trkpt`, `rte`, `rtept`, and `wpt`      |
| KML     | `LineString`, `gx:Track`, and `Point` placemarks         |
| KMZ     | Archives containing a `.kml` file                        |
| GeoJSON | `FeatureCollection`, line geometries, and point features |

KML and KMZ output uses a Google Earth-compatible KML 2.2 structure. KMZ output contains a root `doc.kml` file.

## How to use it

1. Drag one or more supported files into the import area, or choose files from your device.
2. Set endpoint labels and data-preservation options under **Export settings**.
3. Keep automatic format detection, or choose an explicit conversion direction.
4. For a single file, inspect the route and select **Convert & download**.
5. For multiple files, download each converted file or choose **Download all as ZIP**.

Selected route files are not uploaded to a server.

## Example files

The `examples/` directory contains public fixtures for manual testing:

- `examples/basic.gpx`
- `examples/basic.kml`

Drop either file into the app to test conversion, route inspection, map rendering, and endpoint generation.

## Privacy

- File parsing, conversion, KMZ extraction, and output packaging run locally in the current browser.
- The project has no backend for processing selected route files.
- Leaflet and JSZip are vendored under `vendor/`, so runtime scripts and styles do not depend on a CDN.
- The satellite preview requests third-party map tiles unless **Offline preview** is enabled.

## Validation

Start a local server and open:

```text
http://localhost:8080/tests/parser-builder.html
```

The page displays `OK` when the parser and builder fixtures pass.

Run syntax and formatting checks with:

```bash
npm run check
npm run lint
```

GitHub Actions runs the same checks on pushes to `main` and on pull requests.

## Project structure

```text
kml-gpx-converter/
├── .github/          # Issue templates, PR template, and CI workflow
├── index.html        # Single-page interface
├── css/style.css     # Layout and visual design
├── examples/         # Public manual-test files
├── js/
│   ├── parser.js     # KML and GPX parsing into { tracks, waypoints }
│   ├── builder.js    # KML and GPX output from { tracks, waypoints }
│   ├── geojson.js    # GeoJSON parsing and output
│   └── app.js        # File handling, inspection, batch mode, KMZ, and downloads
├── vendor/           # Local Leaflet and JSZip dependencies
├── tests/            # Browser test runner and fixtures
├── vercel.json       # Deployment and security headers
├── package.json      # Validation and Sites packaging scripts
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── VERSION
└── README.md
```

## Contributing and security

- See `CONTRIBUTING.md` for contribution guidelines.
- See `SECURITY.md` for vulnerability reporting.
- See `vendor/THIRD_PARTY.md` for dependency versions and sources.

## Browser support

Use a current version of Chrome, Edge, Safari, or Firefox. The app requires:

- `FileReader`
- `DOMParser`
- `Blob` and `URL.createObjectURL`
- `Promise`
- `fetch` for loading test fixtures

## Known limitations

- GPX routes and track segments are preserved when **Preserve routes & segments** is enabled, but complex extension metadata may not round-trip exactly.
- KML styles, icons, and folder hierarchy cannot be represented when exporting to GPX or GeoJSON. An unedited KML-to-KMZ or KMZ-to-KML conversion preserves the original KML text.
- Generated KMZ files contain `doc.kml` only; images, icons, and other resources from the source archive are not retained.
- Map preview requires network tile access. Conversion remains available offline.

## License

MIT. See `LICENSE`.
