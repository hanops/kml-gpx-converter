/**
 * KML / GPX 解析：XML → 统一结构
 * { tracks: [ { points: [ { lat, lon, ele?, time? } ] } ], waypoints: [ { lat, lon, ele?, name?, time? } ] }
 */
(function (global) {
  'use strict';

  function findByLocalName(parent, localName) {
    const all = parent.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const name = (all[i].localName || all[i].nodeName || '').toLowerCase();
      if (name === localName.toLowerCase()) return all[i];
    }
    return null;
  }

  function findAllByLocalName(parent, localName) {
    const out = [];
    const all = parent.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const name = (all[i].localName || all[i].nodeName || '').toLowerCase();
      if (name === localName.toLowerCase()) out.push(all[i]);
    }
    return out;
  }

  function getChildText(parent, tagName) {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? (el.textContent || '').trim() : '';
  }

  function parseGpxPoint(ptEl) {
    const lat = parseFloat(ptEl.getAttribute('lat'));
    const lon = parseFloat(ptEl.getAttribute('lon'));
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    const obj = { lat, lon };
    const e = getChildText(ptEl, 'ele');
    if (e && !Number.isNaN(parseFloat(e))) obj.ele = parseFloat(e);
    const t = getChildText(ptEl, 'time');
    if (t) obj.time = t;
    return obj;
  }

  /**
   * GPX：多条 trk、独立 waypoints；支持 time。
   */
  function parseGpx(doc) {
    const tracks = [];
    const waypoints = [];

    const trkList = doc.getElementsByTagName('trk');
    for (let t = 0; t < trkList.length; t++) {
      const points = [];
      const trkpts = trkList[t].getElementsByTagName('trkpt');
      for (let i = 0; i < trkpts.length; i++) {
        const pt = parseGpxPoint(trkpts[i]);
        if (pt) points.push(pt);
      }
      if (points.length) tracks.push({ points });
    }

    const rteList = doc.getElementsByTagName('rte');
    for (let r = 0; r < rteList.length; r++) {
      const points = [];
      const rtepts = rteList[r].getElementsByTagName('rtept');
      for (let i = 0; i < rtepts.length; i++) {
        const pt = parseGpxPoint(rtepts[i]);
        if (pt) points.push(pt);
      }
      if (points.length) tracks.push({ points });
    }

    const wptList = doc.getElementsByTagName('wpt');
    for (let i = 0; i < wptList.length; i++) {
      const pt = parseGpxPoint(wptList[i]);
      if (pt) {
        const name = getChildText(wptList[i], 'name');
        if (name) pt.name = name;
        waypoints.push(pt);
      }
    }

    return { tracks, waypoints };
  }

  function parseKmlCoords(text) {
    const points = [];
    const parts = (text || '').trim().split(/[\s\n]+/).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const tuple = parts[i].split(',').map(function (s) { return parseFloat(String(s).trim()); });
      if (tuple.length >= 2 && !Number.isNaN(tuple[0]) && !Number.isNaN(tuple[1])) {
        const pt = { lat: tuple[1], lon: tuple[0] };
        if (tuple.length >= 3 && !Number.isNaN(tuple[2])) pt.ele = tuple[2];
        points.push(pt);
      }
    }
    return points;
  }

  function parseKmlGxCoord(text) {
    const tuple = (text || '').trim().split(/\s+/).map(function (s) { return parseFloat(s); });
    if (tuple.length < 2 || Number.isNaN(tuple[0]) || Number.isNaN(tuple[1])) return null;
    const pt = { lat: tuple[1], lon: tuple[0] };
    if (tuple.length >= 3 && !Number.isNaN(tuple[2])) pt.ele = tuple[2];
    return pt;
  }

  function getFirstByLocalName(parent, localName) {
    const list = findAllByLocalName(parent, localName);
    return list.length ? list[0] : null;
  }

  /**
   * KML：多条 LineString → 多条轨迹；Point Placemarks → waypoints；支持时间（when）。
   */
  function parseKml(doc) {
    const tracks = [];
    const waypoints = [];

    const lineStrings = findAllByLocalName(doc, 'LineString');
    for (let i = 0; i < lineStrings.length; i++) {
      const coordEl = getFirstByLocalName(lineStrings[i], 'coordinates');
      if (!coordEl || !coordEl.textContent) continue;
      const points = parseKmlCoords(coordEl.textContent);
      if (points.length) tracks.push({ points });
    }

    const gxTracks = findAllByLocalName(doc, 'Track');
    for (let i = 0; i < gxTracks.length; i++) {
      const coordEls = findAllByLocalName(gxTracks[i], 'coord');
      const whenEls = findAllByLocalName(gxTracks[i], 'when');
      const points = [];
      for (let c = 0; c < coordEls.length; c++) {
        const pt = parseKmlGxCoord(coordEls[c].textContent);
        if (pt) {
          if (whenEls[c] && whenEls[c].textContent) pt.time = whenEls[c].textContent.trim();
          points.push(pt);
        }
      }
      if (points.length) tracks.push({ points });
    }

    const placemarks = findAllByLocalName(doc, 'Placemark');
    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const pointEl = getFirstByLocalName(pm, 'Point');
      if (!pointEl) continue;
      const coordEl = getFirstByLocalName(pointEl, 'coordinates');
      if (!coordEl || !coordEl.textContent) continue;
      const pts = parseKmlCoords(coordEl.textContent);
      if (pts.length) {
        const w = pts[0];
        const nameEl = getFirstByLocalName(pm, 'name');
        if (nameEl && nameEl.textContent) w.name = nameEl.textContent.trim();
        const whenEl = getFirstByLocalName(pm, 'when');
        if (whenEl && whenEl.textContent) w.time = whenEl.textContent.trim();
        waypoints.push(w);
      }
    }

    return { tracks, waypoints };
  }

  global.parseGpx = parseGpx;
  global.parseKml = parseKml;
})(typeof window !== 'undefined' ? window : this);
