<div align="center">
  <img src="icons/route-studio.svg" width="96" height="96" alt="Route Converter logo">
  <h1>Route Converter</h1>
  <p>Convert KML, KMZ, GPX, and GeoJSON route files without uploading them.</p>
  <p>
    <a href="https://kml-gpx-converter.guoyin277.chatgpt.site"><strong>Open the web app</strong></a>
    ·
    <a href="CONTRIBUTING.md">Contribute</a>
    ·
    <a href="SECURITY.md">Security</a>
  </p>
</div>

![Route Converter interface](docs/assets/screenshot-main.png)

Route Converter is a static web app for moving route data between Google Earth, GPS devices, fitness platforms, and GIS tools. Parsing, conversion, KMZ extraction, and output packaging happen in your browser.

Current release: **V1.2.0**

## What it does

| Capability          | Details                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Format conversion   | KML, KMZ, GPX, and GeoJSON input and output                                                                |
| Google Earth output | KML 2.2, shared styles, route groups, endpoint markers, and `gx:Track` time sequences                      |
| Route inspection    | Track and waypoint counts, distance, duration, elevation gain, average speed, coordinates, and map preview |
| Batch workflow      | Multiple files, individual downloads, and a combined ZIP archive                                           |
| Route controls      | Track simplification, timestamp or elevation removal, endpoint trimming, and GPX structure preservation    |
| Offline use         | Installable web app, local runtime assets, and an option to disable map tiles                              |

Waypoint-only files are supported. A route line is not required when the source contains valid waypoints.

## Supported data

| Format  | Input support                                                       | Output behavior                                          |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| GPX     | Tracks, segments, routes, track points, route points, and waypoints | Preserves route and segment structure when requested     |
| KML     | `LineString`, `gx:Track`, and `Point` placemarks                    | Generates a Google Earth-compatible KML 2.2 document     |
| KMZ     | Archives containing a `.kml` entry                                  | Packages generated output as `doc.kml`                   |
| GeoJSON | `FeatureCollection`, `LineString`, `MultiLineString`, and `Point`   | Exports line and point features in a `FeatureCollection` |

Automatic detection chooses a sensible output from the selected file type. You can also select any supported conversion direction explicitly.

## Use the app

Open the [hosted Route Converter](https://kml-gpx-converter.guoyin277.chatgpt.site), then:

1. Drop one or more supported files into the import area.
2. Review the route summary and compatibility notes.
3. Adjust export settings if needed.
4. Select **Convert & download**, or download batch results as a ZIP.

The satellite map preview loads third-party map tiles. Enable **Offline preview** to avoid tile requests while keeping conversion available.

## Run locally

No application build is required. Start a static server from the repository root:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080), or use the public fixtures in `examples/` to test the workflow.

## Privacy model

- Selected route files stay in the current browser session.
- The project has no backend that receives route content.
- Leaflet and JSZip are vendored under `vendor/`.
- Map preview and optional web analytics can make network requests, but route file contents are not sent with those requests.
- Parsed names and metadata are rendered with DOM nodes or `textContent`, not `innerHTML`.

See [SECURITY.md](SECURITY.md) for reporting and trust-boundary details.

## Development

Install the formatting dependency and run the project checks:

```bash
npm ci
npm run check
npm run lint
npm run build:sites
node --check dist/server/index.js
```

For browser fixtures, start the static server and open:

```text
http://localhost:8080/tests/parser-builder.html
```

The page should display `OK`. Also confirm that the main page loads without console errors.

## Project layout

```text
.
├── index.html                 # Single-page interface
├── css/style.css              # Layout and visual design
├── js/
│   ├── parser.js              # GPX and KML parsing
│   ├── builder.js             # GPX and KML generation
│   ├── geojson.js             # GeoJSON parsing and generation
│   └── app.js                 # File workflow, preview, KMZ, batch mode, and downloads
├── icons/                     # App logo and install icons
├── examples/                  # Public manual-test files
├── tests/                     # Browser test runner and fixtures
├── vendor/                    # Local Leaflet and JSZip dependencies
├── scripts/build-sites.mjs    # OpenAI Sites packaging
├── service-worker.js          # Offline asset cache
└── .github/                   # CI and contribution templates
```

## Known limitations

- Complex extension metadata may not round-trip exactly.
- GPX and GeoJSON cannot represent KML styles, icons, or folder hierarchy.
- An unedited KML-to-KMZ or KMZ-to-KML conversion preserves the original KML text, but generated KMZ files do not retain embedded images, icons, or other resources.
- Map preview requires network tile access unless offline preview is enabled.
- Input files are limited to 50 MB and 200,000 track points in the browser workflow.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Bug reports should use a minimal sample without private location data.

## License

[MIT](LICENSE)
