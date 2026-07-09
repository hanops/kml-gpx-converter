import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'dist', 'server', 'index.js')
const files = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/builder.js',
  'js/parser.js',
  'vendor/jszip/jszip.min.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-shadow.png'
]

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png'
}

const assets = Object.fromEntries(
  await Promise.all(
    files.map(async (file) => [
      `/${file}`,
      (await readFile(path.join(root, file))).toString('base64')
    ])
  )
)

await rm(path.join(root, 'dist'), { force: true, recursive: true })
await mkdir(path.dirname(output), { recursive: true })
await writeFile(
  output,
  `const assets = ${JSON.stringify(assets)}
const mimeTypes = ${JSON.stringify(mimeTypes)}

function assetResponse(encoded, pathname) {
  const binary = atob(encoded)
  const body = Uint8Array.from(binary, character => character.charCodeAt(0))
  const extension = pathname.slice(pathname.lastIndexOf('.'))
  return new Response(body, {
    headers: {
      'Cache-Control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname
    const asset = assets[pathname]
    return asset
      ? assetResponse(asset, pathname)
      : new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}
`
)
