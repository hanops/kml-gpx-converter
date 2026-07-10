;(function () {
  'use strict'

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

  let selectedFiles = []
  let batchOutputs = []
  let mapInstance = null
  let mapLayerGroup = null
  let selectionRevision = 0

  function setStatus(text, type) {
    statusMessage.textContent = text
    statusMessage.className = 'status-message' + (type ? ' ' + type : '')
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
      kml2gpx: 'KML → GPX',
      kml2kmz: 'KML → KMZ',
      kmz2kml: 'KMZ → KML',
      kmz2gpx: 'KMZ → GPX'
    }
    return labels[direction] || '自动选择'
  }

  function renderFileQueue() {
    if (!selectionSummary || !selectionCount || !fileQueue) return
    const count = selectedFiles.length
    selectionSummary.hidden = count === 0
    selectionCount.textContent =
      count +
      ' 个文件 · ' +
      selectedFiles.reduce(function (total, file) {
        return total + (file.size || 0)
      }, 0) +
      ' B'
    if (count)
      selectionCount.textContent =
        count +
        ' 个文件 · ' +
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
      remove.setAttribute('aria-label', '移除 ' + file.name)
      remove.textContent = '移除'
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
      directionHint.textContent = '选择一个文件后，将自动推荐输出格式。'
      return
    }
    if (selectedFiles.length > 1) {
      directionHint.textContent = '批量模式会按当前方向逐个处理，并可打包下载。'
      return
    }
    const direction = resolveDirection(selectedFiles[0])
    directionHint.textContent =
      convertDirection.value === 'auto'
        ? '已根据文件类型推荐：' + formatDirection(direction)
        : '当前选择：' + formatDirection(direction)
  }

  function resetPreview() {
    previewSection.hidden = true
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
    if (selectedFiles.length === 0) setStatus('', '')
    else handleSelection()
  }

  function getBuildOpts() {
    return {
      startName: startNameEl && startNameEl.value ? startNameEl.value.trim() : 'Start',
      endName: endNameEl && endNameEl.value ? endNameEl.value.trim() : 'End',
      preserveTime: preserveTimeEl ? preserveTimeEl.checked : true
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
      lines.push('无轨迹线，仅路点')
      lines.push('路点数：' + waypoints.length)
      if (waypoints.length) {
        lines.push('首点：' + formatCoord(waypoints[0]))
        if (waypoints.length > 1)
          lines.push('末点：' + formatCoord(waypoints[waypoints.length - 1]))
      }
    } else if (tracks.length > 0) {
      lines.push('轨迹数：' + tracks.length)
      tracks.forEach(function (tr, i) {
        const pts = tr.points || []
        lines.push('  轨迹 ' + (i + 1) + '：' + pts.length + ' 点')
        if (pts.length) {
          lines.push('    起点：' + formatCoord(pts[0]))
          if (pts.length > 1) lines.push('    终点：' + formatCoord(pts[pts.length - 1]))
        }
      })
      if (waypoints.length) lines.push('路点数：' + waypoints.length)
    } else {
      lines.push('未解析到轨迹或路点。')
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
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri'
        }
      ).addTo(mapInstance)
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
            .bindPopup(popupText('起点'))
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
        .bindPopup(popupText('起点'))
        .addTo(mapLayerGroup)
      L.circleMarker(pts[pts.length - 1], {
        radius: 8,
        fillColor: '#c62828',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      })
        .bindPopup(popupText('终点'))
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
              p.name || (i === 0 ? '起点' : i === waypoints.length - 1 ? '终点' : '路点 ' + (i + 1))
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
          .bindPopup(popupText(p.name || '路点 ' + (i + 1)))
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
    const doc = parseXml(text)
    if (direction === 'gpx2kml' || direction === 'gpx2kmz')
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
      throw new Error('XML 格式无效，请检查文件内容。')
    }
    return doc
  }

  function getKmlFromKmz(arrayBuffer) {
    if (typeof JSZip === 'undefined') return Promise.reject(new Error('未加载 JSZip'))
    return new JSZip().loadAsync(arrayBuffer).then(function (zip) {
      var names = Object.keys(zip.files).filter(function (n) {
        return !zip.files[n].dir && n.toLowerCase().endsWith('.kml')
      })
      var kmlName = names[0]
      if (!kmlName) return Promise.reject(new Error('KMZ 中未找到 KML 文件'))
      return zip.files[kmlName].async('string')
    })
  }

  function getOutputExt(direction) {
    if (direction === 'gpx2kml' || direction === 'kmz2kml') return 'kml'
    if (direction === 'kml2gpx' || direction === 'kmz2gpx') return 'gpx'
    if (direction === 'gpx2kmz' || direction === 'kml2kmz') return 'kmz'
    return 'kml'
  }

  function isKmzOutput(direction) {
    return direction === 'gpx2kmz' || direction === 'kml2kmz'
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
    return ''
  }

  function getDirectionInputType(direction) {
    if (direction === 'gpx2kml' || direction === 'gpx2kmz') return 'gpx'
    if (direction === 'kml2gpx' || direction === 'kml2kmz') return 'kml'
    if (direction === 'kmz2kml' || direction === 'kmz2gpx') return 'kmz'
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
              resolve(
                typeof parseKml === 'function' ? parseKml(doc) : { tracks: [], waypoints: [] }
              )
            })
            .catch(reject)
        }
        reader.onerror = function () {
          reject(new Error('读取文件失败'))
        }
        reader.readAsArrayBuffer(file)
      })
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader()
      reader.onload = function () {
        try {
          resolve(parseFile(reader.result, direction))
        } catch (e) {
          reject(e)
        }
      }
      reader.onerror = function () {
        reject(new Error('读取文件失败'))
      }
      reader.readAsText(file, 'UTF-8')
    })
  }

  function resolveDirection(file) {
    var n = (file.name || '').toLowerCase()
    if (convertDirection.value !== 'auto') return convertDirection.value
    if (n.endsWith('.gpx')) return 'gpx2kml'
    if (n.endsWith('.kmz')) return 'kmz2kml'
    return 'kml2gpx'
  }

  function validateDirectionForFile(file, direction) {
    var expected = getDirectionInputType(direction)
    var actual = getInputType(file)
    if (expected && actual && expected !== actual) {
      throw new Error('转换方向与文件类型不匹配：' + file.name)
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
      setStatus('无法打包下载：JSZip 未加载。', 'error')
      return
    }
    if (downloadAllBtn) {
      downloadAllBtn.disabled = true
      downloadAllBtn.textContent = '正在打包…'
    }
    setStatus('正在生成批量下载包…', '')
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
        setStatus('已打包 ' + outputs.length + ' 个转换结果。', 'success')
      })
      .catch(function (error) {
        setStatus('打包失败：' + (error.message || String(error)), 'error')
      })
      .then(function () {
        if (downloadAllBtn) {
          downloadAllBtn.disabled = false
          downloadAllBtn.textContent = '打包下载全部'
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
      button.textContent = '下载'
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
    metaEl.textContent = message || '解析失败'
    row.appendChild(nameEl)
    row.appendChild(metaEl)
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return
    const list = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const name = (f.name || '').toLowerCase()
      if (!name.endsWith('.kml') && !name.endsWith('.gpx') && !name.endsWith('.kmz')) continue
      list.push(f)
    }
    if (list.length === 0) {
      setStatus('请选择 .kml、.kmz 或 .gpx 文件。', 'error')
      return
    }
    selectedFiles = list
    refreshSelection()
  }

  function handleSelection() {
    const revision = selectionRevision
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0]
      setStatus('已选择：' + file.name + '。正在生成预览。', 'success')
      previewSection.hidden = false
      batchSection.hidden = true
      var dir = resolveDirection(file)
      loadFileData(file, dir)
        .then(function (data) {
          if (revision !== selectionRevision) return
          renderPreview(data, isWaypointsOnly(data) ? '无轨迹线，仅路点。' : null)
          renderMapPreview(data)
          setStatus('预览已就绪：' + file.name, 'success')
        })
        .catch(function (e) {
          if (revision !== selectionRevision) return
          previewContent.textContent = '预览解析失败：' + (e.message || String(e))
          if (mapLayerGroup) mapLayerGroup.clearLayers()
        })
    } else {
      setStatus('已选择 ' + selectedFiles.length + ' 个文件，正在整理批量转换结果。', 'success')
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
        const base = (file.name || '').replace(/\.(kml|kmz|gpx)$/i, '')
        batchOutputs[idx] = null
        try {
          validateDirectionForFile(file, dir)
        } catch (e) {
          setBatchRowError(row, file.name, e.message || String(e))
          batchList.appendChild(row)
          done++
          failed++
          if (done === selectedFiles.length) setStatus('批量处理完成，部分文件需要检查。', 'error')
          return
        }
        loadFileData(file, dir)
          .then(function (data) {
            if (!canConvert(data)) throw new Error('至少需要 2 个轨迹点或若干路点')
            var waypointsOnly = isWaypointsOnly(data)
            var meta = waypointsOnly
              ? '仅路点 ' + (data.waypoints || []).length + ' 个'
              : (data.tracks || []).length +
                ' 条轨迹，共 ' +
                (data.tracks || []).reduce(function (s, t) {
                  return s + (t.points || []).length
                }, 0) +
                ' 点'
            var opts = getBuildOpts()
            var out =
              dir === 'gpx2kml' || dir === 'gpx2kmz' || dir === 'kmz2kml'
                ? typeof buildKml === 'function'
                  ? buildKml(data, opts)
                  : ''
                : typeof buildGpx === 'function'
                  ? buildGpx(data, opts)
                  : ''
            batchOutputs[idx] = { download: base + '.' + ext, output: out, isKmz: ext === 'kmz' }
            setBatchRow(row, file.name, meta, idx)
          })
          .catch(function (e) {
            failed++
            setBatchRowError(row, file.name, e.message || '解析失败')
          })
          .then(function () {
            done++
            if (revision === selectionRevision && done === selectedFiles.length) {
              if (downloadAllBtn)
                downloadAllBtn.disabled = batchOutputs.filter(Boolean).length === 0
              setStatus(
                failed ? '批量处理完成，部分文件需要检查。' : '已就绪，可逐一下载。',
                failed ? 'error' : 'success'
              )
            }
          })
        setBatchRow(row, file.name, '处理中…')
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
    fileInput.focus()
  })

  convertDirection.addEventListener('change', function () {
    updateDirectionHint()
    if (selectedFiles.length) refreshSelection()
  })

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
      direction = name.endsWith('.gpx') ? 'gpx2kml' : name.endsWith('.kmz') ? 'kmz2kml' : 'kml2gpx'
    }
    const base = (file.name || '').replace(/\.(kml|kmz|gpx)$/i, '')
    const ext = getOutputExt(direction)

    function doConvert(data) {
      if (!canConvert(data)) {
        setStatus('至少需要 2 个轨迹点或若干路点才能转换。', 'error')
        return
      }
      var opts = getBuildOpts()
      var needKml =
        direction === 'gpx2kml' ||
        direction === 'gpx2kmz' ||
        direction === 'kmz2kml' ||
        direction === 'kml2kmz'
      var needGpx = direction === 'kml2gpx' || direction === 'kmz2gpx'
      var kmlStr = needKml && typeof buildKml === 'function' ? buildKml(data, opts) : ''
      var gpxStr = needGpx && typeof buildGpx === 'function' ? buildGpx(data, opts) : ''
      var output = needGpx ? gpxStr : kmlStr

      var mapUpdated = false
      try {
        var parseAs = direction === 'kml2gpx' || direction === 'kmz2gpx' ? 'gpx2kml' : 'kml2gpx'
        var convertedData = parseFile(output, parseAs)
        renderMapPreview(convertedData)
        renderPreview(
          convertedData,
          isWaypointsOnly(convertedData) ? '无轨迹线，仅路点。（以下为转换结果预览）' : null
        )
        if (!isWaypointsOnly(convertedData)) {
          previewContent.textContent = '转换结果预览\n' + (previewContent.textContent || '')
        }
        mapUpdated = true
      } catch (e) {}

      function buildSuccessMsg(d, basename, extension, withMap) {
        var wp = isWaypointsOnly(d)
        var pts = (d.tracks || []).reduce(function (s, t) {
          return s + (t.points || []).length
        }, 0)
        var m = wp
          ? '已生成并下载：' +
            basename +
            '.' +
            extension +
            '（无轨迹线，仅路点 ' +
            (d.waypoints || []).length +
            ' 个）'
          : '已生成并下载：' +
            basename +
            '.' +
            extension +
            '（' +
            (d.tracks || []).length +
            ' 条轨迹，共 ' +
            pts +
            ' 点）'
        return withMap ? m + '。地图已更新为转换结果预览。' : m
      }

      if (isKmzOutput(direction) && typeof JSZip !== 'undefined') {
        new JSZip()
          .file('doc.kml', kmlStr)
          .generateAsync({ type: 'blob' })
          .then(function (blob) {
            triggerDownload(blob, base + '.kmz')
            setStatus(buildSuccessMsg(data, base, 'kmz', mapUpdated), 'success')
          })
      } else {
        triggerDownload(
          new Blob([output], { type: 'application/xml;charset=utf-8' }),
          base + '.' + ext
        )
        setStatus(buildSuccessMsg(data, base, ext, mapUpdated), 'success')
      }
    }

    try {
      validateDirectionForFile(file, direction)
      loadFileData(file, direction)
        .then(doConvert)
        .catch(function (err) {
          setStatus('解析失败：' + (err.message || String(err)), 'error')
        })
    } catch (err) {
      setStatus(err.message || String(err), 'error')
    }
  })
})()
