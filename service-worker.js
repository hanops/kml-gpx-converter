const CACHE = 'route-converter-v1.2.1-r1'
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/route-studio.svg',
  '/icons/route-studio-192.png',
  '/icons/route-studio-512.png',
  '/css/style.css',
  '/js/app.js',
  '/js/parser.js',
  '/js/builder.js',
  '/js/geojson.js',
  '/vendor/jszip/jszip.min.js',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)))
})
