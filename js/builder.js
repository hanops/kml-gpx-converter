/**
 * 从统一结构生成 GPX / KML。
 * 支持多轨迹、仅路点、自定义起终点名称、时间戳保留。
 */
(function (global) {
  'use strict';

  const GPX_NS = 'http://www.topografix.com/GPX/1/1';
  const KML_NS = 'http://www.opengis.net/kml/2.2';

  function defaultOpts(o) {
    return {
      startName: (o && o.startName != null && String(o.startName).trim()) ? String(o.startName).trim() : 'Start',
      endName: (o && o.endName != null && String(o.endName).trim()) ? String(o.endName).trim() : 'End',
      preserveTime: !!(o && o.preserveTime !== false)
    };
  }

  function toKmlCoords(p) {
    const lon = p.lon, lat = p.lat;
    if (p.ele != null) return lon + ',' + lat + ',' + p.ele;
    return lon + ',' + lat + ',0';
  }

  function escapeXml(s) {
    if (s == null) return '';
    const t = String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 生成 GPX。支持 tracks、waypoints；opts: { startName, endName, preserveTime }。
   */
  function buildGpx(data, opts) {
    const opt = defaultOpts(opts);
    const tracks = (data && data.tracks) ? data.tracks : (data && data.points && data.points.length) ? [{ points: data.points }] : [];
    const waypoints = (data && data.waypoints) ? data.waypoints : [];
    const frags = [];
    frags.push('<?xml version="1.0" encoding="UTF-8"?>');
    frags.push('<gpx xmlns="' + GPX_NS + '" version="1.1" creator="kml-gpx-converter">');

    function wptNode(p, name) {
      frags.push('<wpt lat="' + p.lat + '" lon="' + p.lon + '">');
      if (name) frags.push('<name>' + escapeXml(name) + '</name>');
      if (p.ele != null) frags.push('<ele>' + p.ele + '</ele>');
      if (opt.preserveTime && p.time) frags.push('<time>' + escapeXml(p.time) + '</time>');
      frags.push('</wpt>');
    }

    function trkptNode(p) {
      frags.push('<trkpt lat="' + p.lat + '" lon="' + p.lon + '">');
      if (p.ele != null) frags.push('<ele>' + p.ele + '</ele>');
      if (opt.preserveTime && p.time) frags.push('<time>' + escapeXml(p.time) + '</time>');
      frags.push('</trkpt>');
    }

    if (tracks.length === 0 && waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++) wptNode(waypoints[i], waypoints[i].name || 'Waypoint ' + (i + 1));
    } else {
      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || [];
        if (pts.length === 0) continue;
        if (pts.length >= 1) wptNode(pts[0], opt.startName);
        if (pts.length >= 2) wptNode(pts[pts.length - 1], opt.endName);
      }
      for (let i = 0; i < waypoints.length; i++) wptNode(waypoints[i], waypoints[i].name);

      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || [];
        if (pts.length === 0) continue;
        frags.push('<trk>');
        frags.push('<trkseg>');
        for (let i = 0; i < pts.length; i++) trkptNode(pts[i]);
        frags.push('</trkseg>');
        frags.push('</trk>');
      }
    }

    frags.push('</gpx>');
    return frags.join('\n');
  }

  /**
   * 生成 KML。支持 tracks、waypoints；opts: { startName, endName, preserveTime }。
   */
  function buildKml(data, opts) {
    const opt = defaultOpts(opts);
    const tracks = (data && data.tracks) ? data.tracks : (data && data.points && data.points.length) ? [{ points: data.points }] : [];
    const waypoints = (data && data.waypoints) ? data.waypoints : [];
    const frags = [];
    frags.push('<?xml version="1.0" encoding="UTF-8"?>');
    frags.push('<kml xmlns="' + KML_NS + '">');
    frags.push('<Document>');

    function placemarkPoint(p, name) {
      frags.push('<Placemark>');
      if (name) frags.push('<name>' + escapeXml(name) + '</name>');
      if (opt.preserveTime && p.time) {
        frags.push('<TimeStamp><when>' + escapeXml(p.time) + '</when></TimeStamp>');
      }
      frags.push('<Point><coordinates>' + toKmlCoords(p) + '</coordinates></Point>');
      frags.push('</Placemark>');
    }

    if (tracks.length === 0 && waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++) placemarkPoint(waypoints[i], waypoints[i].name || 'Waypoint ' + (i + 1));
    } else {
      for (let t = 0; t < tracks.length; t++) {
        const pts = tracks[t].points || [];
        if (pts.length === 0) continue;
        if (pts.length >= 2) {
          frags.push('<Placemark>');
          frags.push('<name>Track ' + (t + 1) + '</name>');
          frags.push('<LineString><coordinates>');
          frags.push(pts.map(toKmlCoords).join(' '));
          frags.push('</coordinates></LineString>');
          frags.push('</Placemark>');
        }
        if (pts.length >= 1) placemarkPoint(pts[0], opt.startName);
        if (pts.length >= 2) placemarkPoint(pts[pts.length - 1], opt.endName);
      }
      for (let i = 0; i < waypoints.length; i++) placemarkPoint(waypoints[i], waypoints[i].name);
    }

    frags.push('</Document>');
    frags.push('</kml>');
    return frags.join('\n');
  }

  global.buildGpx = buildGpx;
  global.buildKml = buildKml;
})(typeof window !== 'undefined' ? window : this);
