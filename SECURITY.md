# Security Policy

## Supported Versions

Security updates target the latest released version.

| Version | Supported |
| --- | --- |
| V1.1.x | Yes |

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

If GitHub private vulnerability reporting is enabled for this repository, use that channel. Otherwise, contact the repository owner directly.

Helpful details include:

- A short description of the issue.
- A minimal file or input that demonstrates the issue.
- Browser and operating system version.
- Whether the issue affects local file privacy, script execution, or generated output integrity.

## Security Model

This project is designed to run entirely in the browser:

- It has no backend service.
- It does not intentionally upload selected KML/KMZ/GPX files.
- Leaflet and JSZip runtime assets are vendored locally.
- Map tiles are loaded from a network tile provider when map preview is used.

User-supplied file content should be treated as untrusted. UI code should use `textContent` or DOM nodes rather than `innerHTML` when displaying parsed names or metadata.

