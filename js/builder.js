/**
 * 从统一结构生成 GPX / KML。
 * 支持多轨迹、仅路点、自定义起终点名称、时间戳保留。
 */
;(function (global) {
  'use strict'

  const GPX_NS = 'http://www.topografix.com/GPX/1/1'
  const KML_NS = 'http://www.opengis.net/kml/2.2'
  const GX_NS = 'http://www.google.com/kml/ext/2.2'

  function defaultOpts(o) {
    return {
      startName:
        o && o.startName != null && String(o.startName).trim()
          ? String(o.startName).trim()
          : 'Start',
      endName:
        o && o.endName != null && String(o.endName).trim() ? String(o.endName).trim() : 'End',
      preserveTime: !!(o && o.preserveTime !== false),
      preserveStructure: !!(o && o.preserveStructure !== false),
      stripElevation: !!(o && o.stripElevation),
      stripTime: !!(o && o.stripTime)
    }
  }

  function toKmlCoords(p, stripElevation) {
    const lon = p.lon,
      lat = p.lat
    if (!stripElevation && p.ele != null) return lon + ',' + lat + ',' + p.ele
    return lon + ',' + lat + ',0'
  }

  function toGxCoord(p, stripElevation) {
    return p.lon + ' ' + p.lat + ' ' + (!stripElevation && p.ele != null ? p.ele : 0)
  }

  function escapeXml(s) {
    if (s == null) return ''
    const t = String(s)
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  /**
   * 生成 GPX。支持 tracks、waypoints；opts: { startName, endName, preserveTime }。
   */
  function buildGpx(data, opts) {
    const opt = defaultOpts(opts)
    const tracks =
      data && data.tracks
        ? data.tracks
        : data && data.points && data.points.length
          ? [{ points: data.points }]
          : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    const frags = []
    frags.push('<?xml version="1.0" encoding="UTF-8"?>')
    frags.push('<gpx xmlns="' + GPX_NS + '" version="1.1" creator="kml-gpx-converter">')

    function wptNode(p, name) {
      frags.push('<wpt lat="' + p.lat + '" lon="' + p.lon + '">')
      if (name) frags.push('<name>' + escapeXml(name) + '</name>')
      if (!opt.stripElevation && p.ele != null) frags.push('<ele>' + p.ele + '</ele>')
      if (opt.preserveTime && !opt.stripTime && p.time)
        frags.push('<time>' + escapeXml(p.time) + '</time>')
      frags.push('</wpt>')
    }

    function trkptNode(p) {
      frags.push('<trkpt lat="' + p.lat + '" lon="' + p.lon + '">')
      if (!opt.stripElevation && p.ele != null) frags.push('<ele>' + p.ele + '</ele>')
      if (opt.preserveTime && !opt.stripTime && p.time)
        frags.push('<time>' + escapeXml(p.time) + '</time>')
      frags.push('</trkpt>')
    }

    if (tracks.length === 0 && waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++)
        wptNode(waypoints[i], waypoints[i].name || 'Waypoint ' + (i + 1))
    } else {
      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || []
        if (pts.length === 0) continue
        if (pts.length >= 1) wptNode(pts[0], opt.startName)
        if (pts.length >= 2) wptNode(pts[pts.length - 1], opt.endName)
      }
      for (let i = 0; i < waypoints.length; i++) wptNode(waypoints[i], waypoints[i].name)

      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || []
        if (pts.length === 0) continue
        if (opt.preserveStructure && tracks[t].kind === 'route') {
          frags.push('<rte>')
          if (tracks[t].name) frags.push('<name>' + escapeXml(tracks[t].name) + '</name>')
          for (let i = 0; i < pts.length; i++) {
            const point = pts[i]
            frags.push('<rtept lat="' + point.lat + '" lon="' + point.lon + '">')
            if (!opt.stripElevation && point.ele != null) frags.push('<ele>' + point.ele + '</ele>')
            if (opt.preserveTime && !opt.stripTime && point.time)
              frags.push('<time>' + escapeXml(point.time) + '</time>')
            frags.push('</rtept>')
          }
          frags.push('</rte>')
        } else {
          frags.push('<trk>')
          if (tracks[t].name) frags.push('<name>' + escapeXml(tracks[t].name) + '</name>')
          const segments =
            opt.preserveStructure && tracks[t].segments && tracks[t].segments.length
              ? tracks[t].segments
              : [pts]
          segments.forEach(function (segment) {
            frags.push('<trkseg>')
            segment.forEach(trkptNode)
            frags.push('</trkseg>')
          })
          frags.push('</trk>')
        }
      }
    }

    frags.push('</gpx>')
    return frags.join('\n')
  }

  /**
   * 生成 KML。支持 tracks、waypoints；opts: { startName, endName, preserveTime }。
   */
  function buildKml(data, opts) {
    const opt = defaultOpts(opts)
    const tracks =
      data && data.tracks
        ? data.tracks
        : data && data.points && data.points.length
          ? [{ points: data.points }]
          : []
    const waypoints = data && data.waypoints ? data.waypoints : []
    const frags = []
    frags.push('<?xml version="1.0" encoding="UTF-8"?>')
    frags.push('<kml xmlns="' + KML_NS + '" xmlns:gx="' + GX_NS + '">')
    frags.push('<Document>')
    frags.push('<name>Converted route</name>')
    frags.push(
      '<Style id="route-line"><LineStyle><color>ff00a5ff</color><width>4</width></LineStyle></Style>'
    )
    frags.push(
      '<Style id="route-start"><IconStyle><color>ff7fa310</color><scale>1.1</scale></IconStyle></Style>'
    )
    frags.push(
      '<Style id="route-end"><IconStyle><color>ff3138b9</color><scale>1.1</scale></IconStyle></Style>'
    )
    frags.push('<Style id="route-waypoint"><IconStyle><color>ff0b9ef5</color></IconStyle></Style>')

    function placemarkPoint(p, name, styleId) {
      frags.push('<Placemark>')
      if (name) frags.push('<name>' + escapeXml(name) + '</name>')
      if (styleId) frags.push('<styleUrl>#' + styleId + '</styleUrl>')
      if (opt.preserveTime && !opt.stripTime && p.time) {
        frags.push('<TimeStamp><when>' + escapeXml(p.time) + '</when></TimeStamp>')
      }
      frags.push(
        '<Point><coordinates>' + toKmlCoords(p, opt.stripElevation) + '</coordinates></Point>'
      )
      frags.push('</Placemark>')
    }

    function hasCompleteTimes(points) {
      return (
        opt.preserveTime &&
        !opt.stripTime &&
        points.length > 1 &&
        points.every(function (point) {
          return !!point.time
        })
      )
    }

    function trackPlacemark(points, index) {
      frags.push('<Placemark>')
      frags.push('<name>' + escapeXml(tracks[index].name || 'Track ' + (index + 1)) + '</name>')
      frags.push('<styleUrl>#route-line</styleUrl>')
      if (hasCompleteTimes(points)) {
        frags.push('<gx:Track>')
        frags.push('<altitudeMode>clampToGround</altitudeMode>')
        points.forEach(function (point) {
          frags.push('<when>' + escapeXml(point.time) + '</when>')
        })
        points.forEach(function (point) {
          frags.push('<gx:coord>' + toGxCoord(point, opt.stripElevation) + '</gx:coord>')
        })
        frags.push('</gx:Track>')
      } else {
        frags.push(
          '<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>'
        )
        frags.push(
          points
            .map(function (point) {
              return toKmlCoords(point, opt.stripElevation)
            })
            .join(' ')
        )
        frags.push('</coordinates></LineString>')
      }
      frags.push('</Placemark>')
    }

    if (tracks.length === 0 && waypoints.length > 0) {
      frags.push('<Folder><name>Waypoints</name>')
      for (let i = 0; i < waypoints.length; i++)
        placemarkPoint(waypoints[i], waypoints[i].name || 'Waypoint ' + (i + 1), 'route-waypoint')
      frags.push('</Folder>')
    } else {
      frags.push('<Folder><name>Tracks</name>')
      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || []
        if (pts.length === 0) continue
        if (pts.length >= 2) {
          trackPlacemark(pts, t)
        }
        if (pts.length >= 1) placemarkPoint(pts[0], opt.startName, 'route-start')
        if (pts.length >= 2) placemarkPoint(pts[pts.length - 1], opt.endName, 'route-end')
      }
      frags.push('</Folder>')
      if (waypoints.length) {
        frags.push('<Folder><name>Waypoints</name>')
        for (let i = 0; i < waypoints.length; i++)
          placemarkPoint(waypoints[i], waypoints[i].name, 'route-waypoint')
        frags.push('</Folder>')
      }
    }

    frags.push('</Document>')
    frags.push('</kml>')
    return frags.join('\n')
  }

  global.buildGpx = buildGpx
  global.buildKml = buildKml
})(typeof window !== 'undefined' ? window : this)
