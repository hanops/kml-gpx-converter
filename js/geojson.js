;(function (global) {
  'use strict'

  function pointFromCoords(coords, properties) {
    if (!Array.isArray(coords) || coords.length < 2) return null
    const lon = Number(coords[0])
    const lat = Number(coords[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const point = { lat: lat, lon: lon }
    if (Number.isFinite(Number(coords[2]))) point.ele = Number(coords[2])
    if (properties && properties.time) point.time = String(properties.time)
    return point
  }

  function parseGeoJson(input) {
    const root = typeof input === 'string' ? JSON.parse(input) : input
    const tracks = []
    const waypoints = []
    const features = root && root.type === 'FeatureCollection' ? root.features || [] : [root]

    function readGeometry(geometry, properties) {
      if (!geometry) return
      const props = properties || {}
      if (geometry.type === 'Point') {
        const point = pointFromCoords(geometry.coordinates, props)
        if (point) {
          if (props.name) point.name = String(props.name)
          waypoints.push(point)
        }
        return
      }
      const lines =
        geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates]
      if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') return
      lines.forEach(function (line, index) {
        const points = (line || [])
          .map(function (coords) {
            return pointFromCoords(coords)
          })
          .filter(Boolean)
        if (points.length) {
          tracks.push({
            points: points,
            name: props.name
              ? String(props.name) + (lines.length > 1 ? ' ' + (index + 1) : '')
              : '',
            kind: props.routeType === 'route' ? 'route' : 'track'
          })
        }
      })
    }

    features.forEach(function (feature) {
      if (feature && feature.type === 'Feature') readGeometry(feature.geometry, feature.properties)
      else if (feature && feature.type) readGeometry(feature, {})
    })
    return { tracks: tracks, waypoints: waypoints }
  }

  function buildGeoJson(data, opts) {
    const options = opts || {}
    const features = []
    ;((data && data.tracks) || []).forEach(function (track, index) {
      const points = track.points || []
      if (points.length < 2) return
      const properties = {
        name: track.name || 'Track ' + (index + 1),
        routeType: track.kind === 'route' ? 'route' : 'track'
      }
      features.push({
        type: 'Feature',
        properties: properties,
        geometry: {
          type: 'LineString',
          coordinates: points.map(function (point) {
            const coords = [point.lon, point.lat]
            if (!options.stripElevation && point.ele != null) coords.push(point.ele)
            return coords
          })
        }
      })
    })
    ;((data && data.waypoints) || []).forEach(function (point, index) {
      const properties = { name: point.name || 'Waypoint ' + (index + 1) }
      if (!options.stripTime && point.time) properties.time = point.time
      const coordinates = [point.lon, point.lat]
      if (!options.stripElevation && point.ele != null) coordinates.push(point.ele)
      features.push({
        type: 'Feature',
        properties: properties,
        geometry: { type: 'Point', coordinates: coordinates }
      })
    })
    return JSON.stringify({ type: 'FeatureCollection', features: features }, null, 2)
  }

  global.parseGeoJson = parseGeoJson
  global.buildGeoJson = buildGeoJson
})(typeof window !== 'undefined' ? window : this)
