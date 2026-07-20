;(function () {
  'use strict'

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {})
    })
  }

  const dropZone = document.getElementById('dropZone')
  const fileInput = document.getElementById('fileInput')
  const newConversionBtn = document.getElementById('newConversionBtn')
  const selectionSummary = document.getElementById('selectionSummary')
  const selectionCount = document.getElementById('selectionCount')
  const fileQueue = document.getElementById('fileQueue')
  const clearFilesBtn = document.getElementById('clearFilesBtn')
  const convertDirection = document.getElementById('convertDirection')
  const convertBtn = document.getElementById('convertBtn')
  const directionHint = document.getElementById('directionHint')
  const inspectorSection = document.getElementById('inspectorSection')
  const inspectorTitle = document.getElementById('inspectorTitle')
  const readinessBadge = document.getElementById('readinessBadge')
  const trackCount = document.getElementById('trackCount')
  const pointCount = document.getElementById('pointCount')
  const waypointCount = document.getElementById('waypointCount')
  const distanceValue = document.getElementById('distanceValue')
  const durationValue = document.getElementById('durationValue')
  const ascentValue = document.getElementById('ascentValue')
  const speedValue = document.getElementById('speedValue')
  const outputPlan = document.getElementById('outputPlan')
  const statusMessage = document.getElementById('statusMessage')
  const previewSection = document.getElementById('previewSection')
  const previewContent = document.getElementById('previewContent')
  const mapPreviewEl = document.getElementById('mapPreview')
  const batchSection = document.getElementById('batchSection')
  const batchList = document.getElementById('batchList')
  const downloadAllBtn = document.getElementById('downloadAllBtn')
  const startNameEl = document.getElementById('startName')
  const endNameEl = document.getElementById('endName')
  const preserveTimeEl = document.getElementById('preserveTime')
  const preserveStructureEl = document.getElementById('preserveStructure')
  const stripElevationEl = document.getElementById('stripElevation')
  const trimEndpointsEl = document.getElementById('trimEndpoints')
  const simplifyToleranceEl = document.getElementById('simplifyTolerance')
  const offlinePreviewEl = document.getElementById('offlinePreview')
  const compatibilitySection = document.getElementById('compatibilitySection')
  const compatibilityBadge = document.getElementById('compatibilityBadge')
  const compatibilityList = document.getElementById('compatibilityList')
  const workflowSteps = document.querySelectorAll('[data-workflow-step]')

  let selectedFiles = []
  let batchOutputs = []
  let mapInstance = null
  let mapLayerGroup = null
  let selectionRevision = 0
  const MAX_FILE_BYTES = 50 * 1024 * 1024
  const MAX_POINTS = 200000

  function setStatus(text, type) {
    statusMessage.textContent = text
    statusMessage.className = 'status-message' + (type ? ' ' + type : '')
  }

  function setWorkflowStep(currentStep) {
    workflowSteps.forEach(function (step) {
      const active = step.getAttribute('data-workflow-step') === currentStep
      step.classList.toggle('active', active)
      if (active) step.setAttribute('aria-current', 'step')
      else step.removeAttribute('aria-current')
    })
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 1024) return (bytes || 0) + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatDirection(direction) {
    const labels = {
      gpx2kml: 'GPX → KML',
      gpx2kmz: 'GPX → KMZ',
      gpx2geojson: 'GPX → GeoJSON',
      kml2gpx: 'KML → GPX',
      kml2kmz: 'KML → KMZ',
      kml2geojson: 'KML → GeoJSON',
      kmz2kml: 'KMZ → KML',
      kmz2gpx: 'KMZ → GPX',
      kmz2geojson: 'KMZ → GeoJSON',
      geojson2kml: 'GeoJSON → KML',
      geojson2kmz: 'GeoJSON → KMZ',
      geojson2gpx: 'GeoJSON → GPX'
    }
    return labels[direction] || 'Auto-select'
  }

  function renderFileQueue() {
    if (!selectionSummary || !selectionCount || !fileQueue) return
    const count = selectedFiles.length
    selectionSummary.hidden = count === 0
    selectionCount.textContent =
      count +
      (count === 1 ? ' file · ' : ' files · ') +
      selectedFiles.reduce(function (total, file) {
        return total + (file.size || 0)
      }, 0) +
      ' B'
    if (count)
      selectionCount.textContent =
        count +
        (count === 1 ? ' file · ' : ' files · ') +
        formatFileSize(
          selectedFiles.reduce(function (total, file) {
            return total + (file.size || 0)
          }, 0)
        )
    fileQueue.textContent = ''
    selectedFiles.forEach(function (file, index) {
      const item = document.createElement('li')
      item.className = 'file-queue-item'
      const details = document.createElement('div')
      const name = document.createElement('strong')
      const meta = document.createElement('span')
      name.textContent = file.name
      meta.textContent = getInputType(file).toUpperCase() + ' · ' + formatFileSize(file.size)
      details.appendChild(name)
      details.appendChild(meta)
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'remove-file'
      remove.setAttribute('aria-label', 'Remove ' + file.name)
      remove.textContent = 'Remove'
      remove.addEventListener('click', function () {
        selectedFiles.splice(index, 1)
        refreshSelection()
      })
      item.appendChild(details)
      item.appendChild(remove)
      fileQueue.appendChild(item)
    })
  }

  function updateDirectionHint() {
    if (!directionHint) return
    if (selectedFiles.length === 0) {
      directionHint.textContent = 'Add a file to get a recommended output format.'
      convertBtn.textContent = 'Convert & download'
      return
    }
    if (selectedFiles.length > 1) {
      directionHint.textContent = 'Batch mode processes each file with the selected direction.'
      convertBtn.textContent = 'Batch conversion ready'
      return
    }
    const direction = resolveDirection(selectedFiles[0])
    directionHint.textContent =
      convertDirection.value === 'auto'
        ? 'Recommended from the file type: ' + formatDirection(direction)
        : 'Selected: ' + formatDirection(direction)
    convertBtn.textContent = 'Convert to ' + getOutputExt(direction).toUpperCase() + ' & download'
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters) || meters <= 0) return '—'
    return meters < 1000 ? Math.round(meters) + ' m' : (meters / 1000).toFixed(2) + ' km'
  }

  function pointDistance(a, b) {
    const radius = 6371000
    const toRadians = Math.PI / 180
    const latDelta = (b.lat - a.lat) * toRadians
    const lonDelta = (b.lon - a.lon) * toRadians
    const latA = a.lat * toRadians
    const latB = b.lat * toRadians
    const value =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2)
    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
  }

  function getRouteSummary(data) {
    const tracks = (data && data.tracks) || []
    const waypoints = (data && data.waypoints) || []
    let points = 0
    let distance = 0
    let ascent = 0
    let startTime = null
    let endTime = null
    tracks.forEach(function (track) {
      const routePoints = track.points || []
      points += routePoints.length
      for (let index = 1; index < routePoints.length; index++) {
        distance += pointDistance(routePoints[index - 1], routePoints[index])
        if (routePoints[index].ele != null && routePoints[index - 1].ele != null) {
          ascent += Math.max(0, routePoints[index].ele - routePoints[index - 1].ele)
        }
      }
      routePoints.forEach(function (point) {
        const time = point.time ? new Date(point.time).getTime() : NaN
        if (!Number.isFinite(time)) return
        if (startTime == null || time < startTime) startTime = time
        if (endTime == null || time > endTime) endTime = time
      })
    })
    return {
      tracks: tracks.length,
      points: points,
      waypoints: waypoints.length,
      distance: distance,
      ascent: ascent,
      duration: startTime != null && endTime != null ? endTime - startTime : 0
    }
  }

  function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 1000) return '—'
    const minutes = Math.round(milliseconds / 60000)
    return minutes >= 60 ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm' : minutes + ' min'
  }

  function cloneAndPrepareData(data) {
    const opts = getBuildOpts()
    const tolerance = simplifyToleranceEl ? Number(simplifyToleranceEl.value) || 0 : 0
    const trimDistance = trimEndpointsEl && trimEndpointsEl.checked ? 200 : 0
    const prepared = { tracks: [], waypoints: [] }
    if (data && data._sourceKml) prepared._sourceKml = data._sourceKml
    ;((data && data.waypoints) || []).forEach(function (point) {
      const copy = Object.assign({}, point)
      if (opts.stripElevation) delete copy.ele
      if (opts.stripTime) delete copy.time
      prepared.waypoints.push(copy)
    })
    ;((data && data.tracks) || []).forEach(function (track) {
      let points = (track.points || []).map(function (point) {
        const copy = Object.assign({}, point)
        if (opts.stripElevation) delete copy.ele
        if (opts.stripTime) delete copy.time
        return copy
      })
      if (trimDistance && points.length > 2) {
        let start = 0
        let end = points.length - 1
        let distance = 0
        while (start < end - 1 && distance < trimDistance) {
          distance += pointDistance(points[start], points[start + 1])
          start++
        }
        distance = 0
        while (end > start + 1 && distance < trimDistance) {
          distance += pointDistance(points[end], points[end - 1])
          end--
        }
        points = points.slice(start, end + 1)
      }
      if (tolerance && points.length > 2) {
        const simplified = [points[0]]
        let last = points[0]
        for (let i = 1; i < points.length - 1; i++) {
          if (pointDistance(last, points[i]) >= tolerance) {
            simplified.push(points[i])
            last = points[i]
          }
        }
        simplified.push(points[points.length - 1])
        points = simplified
      }
      prepared.tracks.push(Object.assign({}, track, { points: points }))
    })
    return prepared
  }

  function buildOutput(data, direction, opts) {
    const hasEdits =
      opts.stripElevation ||
      opts.stripTime ||
      (simplifyToleranceEl && Number(simplifyToleranceEl.value)) ||
      (trimEndpointsEl && trimEndpointsEl.checked)
    if (
      !hasEdits &&
      opts.preserveStructure &&
      data._sourceKml &&
      (direction === 'kml2kmz' || direction === 'kmz2kml')
    ) {
      return data._sourceKml
    }
    if (direction.indexOf('2geojson') !== -1)
      return typeof buildGeoJson === 'function' ? buildGeoJson(data, opts) : ''
    if (direction.indexOf('2gpx') !== -1)
      return typeof buildGpx === 'function' ? buildGpx(data, opts) : ''
    return typeof buildKml === 'function' ? buildKml(data, opts) : ''
  }

  function renderCompatibility(file, data, direction) {
    if (!compatibilitySection || !compatibilityList || !compatibilityBadge) return
    const items = []
    const input = getInputType(file)
    const output = getOutputExt(direction)
    const hasTimes = (data.tracks || []).some(function (track) {
      return (track.points || []).some(function (point) {
        return !!point.time
      })
    })
    const hasElevation = (data.tracks || []).some(function (track) {
      return (track.points || []).some(function (point) {
        return point.ele != null
      })
    })
    items.push('Input: ' + input.toUpperCase() + ' · Output: ' + output.toUpperCase())
    if (input === 'kml' || input === 'kmz') {
      items.push(
        output === 'gpx'
          ? 'KML styles, icons, and folder hierarchy cannot be written to GPX.'
          : 'Google Earth styling will be regenerated with Route Converter defaults.'
      )
    }
    if (hasTimes)
      items.push(
        preserveTimeEl && preserveTimeEl.checked
          ? 'Timestamps will be preserved.'
          : 'Timestamps will be removed.'
      )
    if (hasElevation)
      items.push(
        stripElevationEl && stripElevationEl.checked
          ? 'Elevation data will be removed.'
          : 'Elevation data will be preserved.'
      )
    if (simplifyToleranceEl && Number(simplifyToleranceEl.value))
      items.push('Track points will be reduced using the current simplification threshold.')
    if (trimEndpointsEl && trimEndpointsEl.checked)
      items.push('Approximately 200 metres will be removed from each endpoint.')
    compatibilityList.textContent = ''
    items.forEach(function (text) {
      const item = document.createElement('li')
      item.textContent = text
      compatibilityList.appendChild(item)
    })
    compatibilityBadge.textContent = 'Checked'
    compatibilityBadge.className = 'readiness-badge ready'
    compatibilitySection.hidden = false
  }

  function renderInspector(file, data, direction) {
    if (!inspectorSection) return
    const summary = getRouteSummary(data)
    const ready = canConvert(data)
    setWorkflowStep('inspect')
    inspectorSection.hidden = false
    inspectorTitle.textContent = file.name || 'Route file'
    trackCount.textContent = summary.tracks
    pointCount.textContent = summary.points
    waypointCount.textContent = summary.waypoints
    distanceValue.textContent = formatDistance(summary.distance)
    if (durationValue) durationValue.textContent = formatDuration(summary.duration)
    if (ascentValue)
      ascentValue.textContent = summary.ascent ? Math.round(summary.ascent) + ' m' : '—'
    if (speedValue)
      speedValue.textContent = summary.duration
        ? (summary.distance / 1000 / (summary.duration / 3600000)).toFixed(1) + ' km/h'
        : '—'
    readinessBadge.textContent = ready ? 'Ready to convert' : 'More data required'
    readinessBadge.className = 'readiness-badge' + (ready ? ' ready' : ' warning')
    outputPlan.textContent = ready
      ? 'A ' +
        getOutputExt(direction).toUpperCase() +
        ' file will be generated. Tracks, waypoints, and ' +
        (preserveTimeEl && preserveTimeEl.checked ? 'timestamps' : 'coordinate data') +
        ' will be preserved where the target format allows.'
      : 'Not enough track points or waypoints were found to create a valid output.'
  }

  function resetPreview() {
    previewSection.hidden = true
    if (inspectorSection) inspectorSection.hidden = true
    if (compatibilitySection) compatibilitySection.hidden = true
    batchSection.hidden = true
    batchList.textContent = ''
    batchOutputs = []
    if (downloadAllBtn) downloadAllBtn.disabled = true
    if (mapLayerGroup) mapLayerGroup.clearLayers()
  }

  function refreshSelection() {
    selectionRevision++
    renderFileQueue()
    updateDirectionHint()
    convertBtn.disabled = selectedFiles.length !== 1
    resetPreview()
    if (selectedFiles.length === 0) {
      setWorkflowStep('import')
      setStatus('', '')
    } else handleSelection()
  }

  function getBuildOpts() {
    return {
      startName: startNameEl && startNameEl.value ? startNameEl.value.trim() : 'Start',
      endName: endNameEl && endNameEl.value ? endNameEl.value.trim() : 'End',
      preserveTime: preserveTimeEl ? preserveTimeEl.checked : true,
      preserveStructure: preserveStructureEl ? preserveStructureEl.checked : true,
      stripElevation: stripElevationEl ? stripElevationEl.checked : false,
      stripTime: preserveTimeEl ? !preserveTimeEl.checked : false
    }
  }

  function formatCoord(p) {
    if (!p) return '—'
    const latDir = p.lat < 0 ? 'S' : 'N'
    const lonDir = p.lon < 0 ? 'W' : 'E'
    return (
      Math.abs(p.lat).toFixed(5) +
      '°' +
      latDir +
      ', ' +
      Math.abs(p.lon).toFixed(5) +
      '°' +
      lonDir +
      (p.ele != null ? ' (' + p.ele + 'm)' : '')
    )
  }

  function popupText(text) {
    const el = document.createElement('span')
    el.textContent = text
    return el
  }

  function renderPreview(data, waypointsOnlyHint) {
    const lines = []
    const tracks = data && data.tracks ? data.tracks : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    if (tracks.length === 0 && waypoints.length > 0) {
      lines.push('Waypoints only — no track line')
      lines.push('Waypoints: ' + waypoints.length)
      if (waypoints.length) {
        lines.push('First point: ' + formatCoord(waypoints[0]))
        if (waypoints.length > 1)
          lines.push('Last point: ' + formatCoord(waypoints[waypoints.length - 1]))
      }
    } else if (tracks.length > 0) {
      lines.push('Tracks: ' + tracks.length)
      tracks.forEach(function (tr, i) {
        const pts = tr.points || []
        lines.push('  Track ' + (i + 1) + ': ' + pts.length + ' points')
        if (pts.length) {
          lines.push('    Start: ' + formatCoord(pts[0]))
          if (pts.length > 1) lines.push('    End: ' + formatCoord(pts[pts.length - 1]))
        }
      })
      if (waypoints.length) lines.push('Waypoints: ' + waypoints.length)
    } else {
      setWorkflowStep('inspect')
      lines.push('No tracks or waypoints were found.')
    }
    if (waypointsOnlyHint) {
      previewContent.textContent = ''
      const hintEl = document.createElement('span')
      hintEl.className = 'waypoints-only'
      hintEl.textContent = waypointsOnlyHint
      previewContent.appendChild(hintEl)
      previewContent.appendChild(document.createTextNode('\n' + lines.join('\n')))
    } else {
      previewContent.textContent = lines.join('\n')
    }
  }

  function renderMapPreview(data) {
    if (!mapPreviewEl || typeof L === 'undefined') return
    const tracks = data && data.tracks ? data.tracks : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    const allPoints = []
    tracks.forEach(function (t) {
      ;(t.points || []).forEach(function (p) {
        allPoints.push([p.lat, p.lon])
      })
    })
    waypoints.forEach(function (p) {
      allPoints.push([p.lat, p.lon])
    })
    if (allPoints.length === 0) {
      if (mapLayerGroup) {
        mapLayerGroup.clearLayers()
        if (mapInstance) mapInstance.fitWorld()
      }
      return
    }
    if (!mapInstance) {
      mapInstance = L.map(mapPreviewEl, { center: [allPoints[0][0], allPoints[0][1]], zoom: 12 })
      if (!(offlinePreviewEl && offlinePreviewEl.checked)) {
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri'
          }
        ).addTo(mapInstance)
      }
      mapLayerGroup = L.layerGroup().addTo(mapInstance)
    }
    mapLayerGroup.clearLayers()
    tracks.forEach(function (tr, ti) {
      const pts = (tr.points || []).map(function (p) {
        return [p.lat, p.lon]
      })
      if (pts.length < 2) {
        if (pts.length) {
          L.circleMarker(pts[0], {
            radius: 8,
            fillColor: '#2e7d32',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
          })
            .bindPopup(popupText('Start'))
            .addTo(mapLayerGroup)
        }
        return
      }
      L.polyline(pts, { color: '#1976d2', weight: 4, opacity: 0.9 }).addTo(mapLayerGroup)
      L.circleMarker(pts[0], {
        radius: 8,
        fillColor: '#2e7d32',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      })
        .bindPopup(popupText('Start'))
        .addTo(mapLayerGroup)
      L.circleMarker(pts[pts.length - 1], {
        radius: 8,
        fillColor: '#c62828',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      })
        .bindPopup(popupText('End'))
        .addTo(mapLayerGroup)
    })
    if (tracks.length === 0 && waypoints.length > 0) {
      waypoints.forEach(function (p, i) {
        var wpColor =
          waypoints.length >= 2 && i === 0
            ? '#2e7d32'
            : waypoints.length >= 2 && i === waypoints.length - 1
              ? '#c62828'
              : '#ff9800'
        L.circleMarker([p.lat, p.lon], {
          radius: 6,
          fillColor: wpColor,
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        })
          .bindPopup(
            popupText(
              p.name ||
                (i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : 'Waypoint ' + (i + 1))
            )
          )
          .addTo(mapLayerGroup)
      })
    } else {
      waypoints.forEach(function (p, i) {
        L.circleMarker([p.lat, p.lon], {
          radius: 6,
          fillColor: '#ff9800',
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        })
          .bindPopup(popupText(p.name || 'Waypoint ' + (i + 1)))
          .addTo(mapLayerGroup)
      })
    }
    const bounds = L.latLngBounds(allPoints)
    if (mapInstance) {
      mapInstance.invalidateSize()
      mapInstance.fitBounds(bounds.pad(0.15))
    }
  }

  function parseFile(text, direction) {
    const inputType = getDirectionInputType(direction)
    if (inputType === 'geojson')
      return typeof parseGeoJson === 'function' ? parseGeoJson(text) : { tracks: [], waypoints: [] }
    const doc = parseXml(text)
    if (inputType === 'gpx')
      return typeof parseGpx === 'function' ? parseGpx(doc) : { tracks: [], waypoints: [] }
    return typeof parseKml === 'function' ? parseKml(doc) : { tracks: [], waypoints: [] }
  }

  function parseXml(text) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const rootName = doc.documentElement
      ? (doc.documentElement.localName || doc.documentElement.nodeName || '').toLowerCase()
      : ''
    if (rootName === 'parsererror' || doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML. Check the file contents and try again.')
    }
    return doc
  }

  function getKmlFromKmz(arrayBuffer) {
    if (typeof JSZip === 'undefined') return Promise.reject(new Error('JSZip is not available.'))
    return new JSZip().loadAsync(arrayBuffer).then(function (zip) {
      var names = Object.keys(zip.files).filter(function (n) {
        return !zip.files[n].dir && n.toLowerCase().endsWith('.kml')
      })
      var kmlName = names[0]
      if (!kmlName) return Promise.reject(new Error('No KML file was found inside the KMZ.'))
      return zip.files[kmlName].async('string')
    })
  }

  function getOutputExt(direction) {
    if (direction === 'gpx2kml' || direction === 'kmz2kml') return 'kml'
    if (direction === 'kml2gpx' || direction === 'kmz2gpx') return 'gpx'
    if (direction === 'gpx2kmz' || direction === 'kml2kmz') return 'kmz'
    if (direction.indexOf('2geojson') !== -1) return 'geojson'
    if (direction === 'geojson2kmz') return 'kmz'
    return 'kml'
  }

  function isKmzOutput(direction) {
    return direction === 'gpx2kmz' || direction === 'kml2kmz' || direction === 'geojson2kmz'
  }

  function canConvert(data) {
    const tracks = data && data.tracks ? data.tracks : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    if (waypoints.length > 0 && tracks.length === 0) return true
    for (let i = 0; i < tracks.length; i++) {
      const pts = tracks[i].points || []
      if (pts.length >= 2) return true
      if (pts.length === 1 && waypoints.length === 0 && tracks.length === 1) return false
    }
    return tracks.some(function (t) {
      return (t.points || []).length >= 2
    })
  }

  function ensurePointLimit(data) {
    const count = ((data && data.tracks) || []).reduce(function (total, track) {
      return total + (track.points || []).length
    }, 0)
    if (count > MAX_POINTS) {
      throw new Error(
        'This route has too many track points. The limit is ' +
          MAX_POINTS.toLocaleString() +
          '; split or simplify the file first.'
      )
    }
  }

  function isWaypointsOnly(data) {
    const tracks = data && data.tracks ? data.tracks : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    return tracks.length === 0 && waypoints.length > 0
  }

  function getInputType(file) {
    var n = (file.name || '').toLowerCase()
    if (n.endsWith('.gpx')) return 'gpx'
    if (n.endsWith('.kmz')) return 'kmz'
    if (n.endsWith('.kml')) return 'kml'
    if (n.endsWith('.geojson') || n.endsWith('.json')) return 'geojson'
    return ''
  }

  function getDirectionInputType(direction) {
    if (direction === 'gpx2kml' || direction === 'gpx2kmz' || direction === 'gpx2geojson')
      return 'gpx'
    if (direction === 'kml2gpx' || direction === 'kml2kmz' || direction === 'kml2geojson')
      return 'kml'
    if (direction === 'kmz2kml' || direction === 'kmz2gpx') return 'kmz'
    if (direction === 'kmz2geojson') return 'kmz'
    if (direction === 'geojson2kml' || direction === 'geojson2kmz' || direction === 'geojson2gpx')
      return 'geojson'
    return ''
  }

  function loadFileData(file, direction) {
    var name = (file.name || '').toLowerCase()
    if (name.endsWith('.kmz')) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader()
        reader.onload = function () {
          getKmlFromKmz(reader.result)
            .then(function (kmlText) {
              var doc = parseXml(kmlText)
              var parsed =
                typeof parseKml === 'function' ? parseKml(doc) : { tracks: [], waypoints: [] }
              parsed._sourceKml = kmlText
              resolve(parsed)
            })
            .catch(reject)
        }
        reader.onerror = function () {
          reject(new Error('The file could not be read.'))
        }
        reader.readAsArrayBuffer(file)
      })
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onload = function () {
        try {
          var parsed = parseFile(reader.result, direction)
          if (getInputType(file) === 'kml') parsed._sourceKml = reader.result
          resolve(parsed)
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = function () {
        reject(new Error('The file could not be read.'))
      }
      reader.readAsText(file, 'UTF-8')
    })
  }

  function resolveDirection(file) {
    var n = (file.name || '').toLowerCase()
    if (convertDirection.value !== 'auto') return convertDirection.value
    if (n.endsWith('.gpx')) return 'gpx2kml'
    if (n.endsWith('.kmz')) return 'kmz2kml'
    if (n.endsWith('.geojson') || n.endsWith('.json')) return 'geojson2kml'
    return 'kml2gpx'
  }

  function validateDirectionForFile(file, direction) {
    var expected = getDirectionInputType(direction)
    var actual = getInputType(file)
    if (expected && actual && expected !== actual) {
      throw new Error('The selected conversion direction does not match ' + file.name + '.')
    }
  }

  function triggerDownload(blob, filename) {
    var a = document.createElement('a')
    var url = URL.createObjectURL(blob)
    a.href = url
    a.download = filename
    a.click()
    setTimeout(function () {
      URL.revokeObjectURL(url)
    }, 0)
  }

  function downloadRecord(rec) {
    if (!rec || !rec.output) return
    if (rec.isKmz && typeof JSZip !== 'undefined') {
      new JSZip()
        .file('doc.kml', rec.output)
        .generateAsync({ type: 'blob' })
        .then(function (blob) {
          triggerDownload(blob, rec.download)
        })
    } else {
      triggerDownload(
        new Blob([rec.output], { type: 'application/xml;charset=utf-8' }),
        rec.download
      )
    }
  }

  function downloadAllRecords() {
    const outputs = batchOutputs.filter(function (rec) {
      return rec && rec.output
    })
    if (!outputs.length) return
    if (typeof JSZip === 'undefined') {
      setStatus('Unable to create the archive because JSZip is not available.', 'error')
      return
    }
    if (downloadAllBtn) {
      downloadAllBtn.disabled = true
      downloadAllBtn.textContent = 'Creating archive…'
    }
    setStatus('Creating the batch download archive…', '')
    const zip = new JSZip()
    const pending = outputs.map(function (rec) {
      if (rec.isKmz) {
        const kmz = new JSZip()
        kmz.file('doc.kml', rec.output)
        return kmz.generateAsync({ type: 'blob' }).then(function (blob) {
          zip.file(rec.download, blob)
        })
      }
      zip.file(rec.download, rec.output)
      return Promise.resolve()
    })
    Promise.all(pending)
      .then(function () {
        return zip.generateAsync({ type: 'blob' })
      })
      .then(function (blob) {
        triggerDownload(blob, 'converted-files.zip')
        setStatus(
          'Archive ready with ' + outputs.length + (outputs.length === 1 ? ' file.' : ' files.'),
          'success'
        )
      })
      .catch(function (error) {
        setStatus('Archive failed: ' + (error.message || String(error)), 'error')
      })
      .then(function () {
        if (downloadAllBtn) {
          downloadAllBtn.disabled = false
          downloadAllBtn.textContent = 'Download all as ZIP'
        }
      })
  }

  function setBatchRow(row, fileName, meta, outputIndex) {
    row.textContent = ''
    const nameEl = document.createElement('span')
    nameEl.className = 'file-name'
    nameEl.textContent = fileName || ''
    const metaEl = document.createElement('span')
    metaEl.className = 'file-meta'
    metaEl.textContent = meta
    row.appendChild(nameEl)
    row.appendChild(metaEl)
    if (outputIndex != null) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Download'
      button.addEventListener('click', function () {
        downloadRecord(batchOutputs[outputIndex])
      })
      row.appendChild(button)
    }
  }

  function setBatchRowError(row, fileName, message) {
    row.textContent = ''
    const nameEl = document.createElement('span')
    nameEl.className = 'file-name'
    nameEl.textContent = fileName || ''
    const metaEl = document.createElement('span')
    metaEl.className = 'file-meta error'
    metaEl.textContent = message || 'Parsing failed'
    row.appendChild(nameEl)
    row.appendChild(metaEl)
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return
    const list = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const name = (f.name || '').toLowerCase()
      if (f.size > MAX_FILE_BYTES) {
        setStatus('File exceeds the 50 MB limit: ' + f.name, 'error')
        continue
      }
      if (
        !name.endsWith('.kml') &&
        !name.endsWith('.gpx') &&
        !name.endsWith('.kmz') &&
        !name.endsWith('.geojson') &&
        !name.endsWith('.json')
      )
        continue
      list.push(f)
    }
    if (list.length === 0) {
      setStatus('Choose a .kml, .kmz, .gpx, or .geojson file.', 'error')
      return
    }
    selectedFiles = list
    refreshSelection()
  }

  function handleSelection() {
    const revision = selectionRevision
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0]
      setStatus('Selected ' + file.name + '. Preparing the preview…', 'success')
      previewSection.hidden = false
      batchSection.hidden = true
      var dir = resolveDirection(file)
      loadFileData(file, dir)
        .then(function (data) {
          if (revision !== selectionRevision) return
          ensurePointLimit(data)
          renderInspector(file, data, dir)
          renderCompatibility(file, data, dir)
          renderPreview(data, isWaypointsOnly(data) ? 'Waypoints only — no track line.' : null)
          renderMapPreview(data)
          setStatus('Preview ready: ' + file.name, 'success')
        })
        .catch(function (e) {
          if (revision !== selectionRevision) return
          if (inspectorSection) inspectorSection.hidden = true
          previewContent.textContent = 'Preview failed: ' + (e.message || String(e))
          if (mapLayerGroup) mapLayerGroup.clearLayers()
        })
    } else {
      setStatus(
        'Selected ' + selectedFiles.length + ' files. Preparing the batch conversion…',
        'success'
      )
      previewSection.hidden = true
      batchSection.hidden = false
      batchList.textContent = ''
      batchOutputs = []
      if (downloadAllBtn) downloadAllBtn.disabled = true
      let done = 0
      let failed = 0
      selectedFiles.forEach(function (file, idx) {
        const row = document.createElement('div')
        row.className = 'batch-item'
        const dir = resolveDirection(file)
        const ext = getOutputExt(dir)
        const base = (file.name || '').replace(/\.(kml|kmz|gpx|geojson|json)$/i, '')
        batchOutputs[idx] = null
        try {
          validateDirectionForFile(file, dir)
        } catch (e) {
          setBatchRowError(row, file.name, e.message || String(e))
          batchList.appendChild(row)
          done++
          failed++
          if (done === selectedFiles.length)
            setStatus('Batch processing finished. Some files need attention.', 'error')
          return
        }
        loadFileData(file, dir)
          .then(function (data) {
            ensurePointLimit(data)
            if (!canConvert(data))
              throw new Error('At least two track points or one waypoint are required.')
            var waypointsOnly = isWaypointsOnly(data)
            var summary = getRouteSummary(data)
            var meta =
              formatDirection(dir) +
              ' · ' +
              (waypointsOnly
                ? summary.waypoints + (summary.waypoints === 1 ? ' waypoint' : ' waypoints')
                : summary.tracks +
                  (summary.tracks === 1 ? ' track · ' : ' tracks · ') +
                  summary.points +
                  (summary.points === 1 ? ' point · ' : ' points · ') +
                  formatDistance(summary.distance))
            var opts = getBuildOpts()
            var out = buildOutput(cloneAndPrepareData(data), dir, opts)
            batchOutputs[idx] = { download: base + '.' + ext, output: out, isKmz: ext === 'kmz' }
            setBatchRow(row, file.name, meta, idx)
          })
          .catch(function (e) {
            failed++
            setBatchRowError(row, file.name, e.message || 'Parsing failed')
          })
          .then(function () {
            done++
            if (revision === selectionRevision && done === selectedFiles.length) {
              if (downloadAllBtn)
                downloadAllBtn.disabled = batchOutputs.filter(Boolean).length === 0
              setStatus(
                failed
                  ? 'Batch processing finished. Some files need attention.'
                  : 'Ready. Download files individually or as a ZIP.',
                failed ? 'error' : 'success'
              )
            }
          })
        setBatchRow(row, file.name, 'Processing…')
        batchList.appendChild(row)
      })
    }
  }

  dropZone.addEventListener('click', function () {
    fileInput.click()
  })

  dropZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInput.click()
    }
  })

  fileInput.addEventListener('change', function () {
    handleFiles(this.files)
    this.value = ''
  })

  clearFilesBtn.addEventListener('click', function () {
    selectedFiles = []
    refreshSelection()
  })

  newConversionBtn.addEventListener('click', function () {
    selectedFiles = []
    refreshSelection()
    document.getElementById('converter').scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  convertDirection.addEventListener('change', function () {
    updateDirectionHint()
    if (selectedFiles.length) refreshSelection()
  })

  if (offlinePreviewEl) {
    offlinePreviewEl.addEventListener('change', function () {
      if (mapInstance) {
        mapInstance.remove()
        mapInstance = null
        mapLayerGroup = null
      }
      if (selectedFiles.length === 1) handleSelection()
    })
  }

  downloadAllBtn.addEventListener('click', downloadAllRecords)

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault()
    e.stopPropagation()
    dropZone.classList.add('drag-over')
  })

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault()
    e.stopPropagation()
    dropZone.classList.remove('drag-over')
  })

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault()
    e.stopPropagation()
    dropZone.classList.remove('drag-over')
    handleFiles(e.dataTransfer.files)
  })

  convertBtn.addEventListener('click', function () {
    if (!selectedFiles || selectedFiles.length !== 1) return
    const file = selectedFiles[0]
    let direction = convertDirection.value
    const name = (file.name || '').toLowerCase()
    if (direction === 'auto') {
      direction = name.endsWith('.gpx')
        ? 'gpx2kml'
        : name.endsWith('.kmz')
          ? 'kmz2kml'
          : name.endsWith('.geojson') || name.endsWith('.json')
            ? 'geojson2kml'
            : 'kml2gpx'
    }
    const base = (file.name || '').replace(/\.(kml|kmz|gpx|geojson|json)$/i, '')
    const ext = getOutputExt(direction)

    function doConvert(data) {
      ensurePointLimit(data)
      if (!canConvert(data)) {
        setStatus('At least two track points or one waypoint are required.', 'error')
        return
      }
      var opts = getBuildOpts()
      var preparedData = cloneAndPrepareData(data)
      var output = buildOutput(preparedData, direction, opts)
      var kmlStr = isKmzOutput(direction) ? output : ''

      var mapUpdated = false
      try {
        var parseAs = ext === 'gpx' ? 'gpx2kml' : ext === 'geojson' ? 'geojson2kml' : 'kml2gpx'
        var convertedData = parseFile(output, parseAs)
        renderMapPreview(convertedData)
        renderPreview(
          convertedData,
          isWaypointsOnly(convertedData)
            ? 'Waypoints only — no track line. The converted result is shown below.'
            : null
        )
        if (!isWaypointsOnly(convertedData)) {
          previewContent.textContent = 'Converted result\n' + (previewContent.textContent || '')
        }
        mapUpdated = true
      } catch (e) {}

      function buildSuccessMsg(d, basename, extension, withMap) {
        var wp = isWaypointsOnly(d)
        var pts = (d.tracks || []).reduce(function (s, t) {
          return s + (t.points || []).length
        }, 0)
        var m = wp
          ? 'Generated and downloaded ' +
            basename +
            '.' +
            extension +
            ' — waypoints only (' +
            (d.waypoints || []).length +
            ').'
          : 'Generated and downloaded ' +
            basename +
            '.' +
            extension +
            ' (' +
            (d.tracks || []).length +
            ((d.tracks || []).length === 1 ? ' track, ' : ' tracks, ') +
            pts +
            (pts === 1 ? ' point).' : ' points).')
        return withMap ? m + ' The map now shows the converted result.' : m
      }

      if (isKmzOutput(direction) && typeof JSZip !== 'undefined') {
        new JSZip()
          .file('doc.kml', kmlStr)
          .generateAsync({ type: 'blob' })
          .then(function (blob) {
            triggerDownload(blob, base + '.kmz')
            setWorkflowStep('export')
            setStatus(buildSuccessMsg(preparedData, base, 'kmz', mapUpdated), 'success')
          })
      } else {
        triggerDownload(
          new Blob([output], { type: 'application/xml;charset=utf-8' }),
          base + '.' + ext
        )
        setWorkflowStep('export')
        setStatus(buildSuccessMsg(preparedData, base, ext, mapUpdated), 'success')
      }
    }

    try {
      validateDirectionForFile(file, direction)
      loadFileData(file, direction)
        .then(doConvert)
        .catch(function (err) {
          setStatus('Parsing failed: ' + (err.message || String(err)), 'error')
        })
    } catch (err) {
      setStatus(err.message || String(err), 'error')
    }
  })
})()
