import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

const HUNTSVILLE = [34.7304, -86.5861];
const BASE = 'https://lostfound.unprecedentedtimes.org';
const DAY = 24 * 60 * 60 * 1000;

const TYPE_ICONS = { person: '👤', pet: '🐾', item: '📦' };

// Pin color: green for resolved; active person = red (pulsing); active pet/property = amber.
function pinStyle(c) {
  if (c.status === 'resolved') return { color: '#16a34a', pulse: false };
  if (c.subject_type === 'person') return { color: '#dc2626', pulse: true };
  return { color: '#f59e0b', pulse: false };
}

function makePin(c) {
  const { color, pulse } = pinStyle(c);
  const emoji = TYPE_ICONS[c.subject_type] || '●';
  const pulseCls = pulse ? ' lf-pin-pulse' : '';
  return L.divIcon({
    html: `<div class="lf-map-pin${pulseCls}" style="--pin:${color};">${emoji}</div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function daysSince(d) {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / DAY));
}

function popupHtml(c) {
  const { color } = pinStyle(c);
  const emoji = TYPE_ICONS[c.subject_type] || '●';
  const photo = c.primary_photo
    ? `<img src="${BASE}${c.primary_photo}" style="width:100%;height:90px;object-fit:cover;border-radius:4px;margin-bottom:.4rem;" />`
    : '';
  return `
    <div style="min-width:210px;max-width:260px;font-family:system-ui,sans-serif;font-size:.82rem;">
      ${photo}
      <div style="display:flex;gap:.3rem;align-items:center;margin-bottom:.3rem;">
        <span style="padding:.1rem .4rem;border-radius:99px;background:${color}22;color:${color};border:1px solid ${color}44;font-size:.7rem;font-weight:700;text-transform:uppercase;">${c.status}</span>
        <span style="font-size:.75rem;color:#888;">${emoji} ${c.subject_type}</span>
      </div>
      <div style="font-weight:700;color:#1a1a1a;margin-bottom:.2rem;">${c.subject_name || c.title}</div>
      ${c.last_seen_location ? `<div style="font-size:.77rem;color:#666;margin-bottom:.1rem;">📍 ${c.last_seen_location}</div>` : ''}
      <div style="font-size:.74rem;color:#888;margin-bottom:.1rem;">Filed ${new Date(c.created_at).toLocaleDateString()} · ${daysSince(c.created_at)} days ago</div>
      <a href="/cases/${c.id}" style="display:block;text-align:center;padding:.3rem;background:#15803d;color:#fff;border-radius:4px;font-size:.78rem;font-weight:600;text-decoration:none;margin-top:.35rem;">View Full Case →</a>
    </div>`;
}

export default function MapPage() {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const pinLayer  = useRef(L.layerGroup());
  const clusterLayer = useRef(L.layerGroup());
  const playTimer = useRef(null);

  const [cases,    setCases]    = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [typeFilter,   setTypeFilter]   = useState('all');   // all | person | pet | item
  const [statusFilter, setStatusFilter] = useState('all');   // all | active | resolved
  const [timeRange,    setTimeRange]     = useState('all');   // 7 | 30 | 90 | all
  const [cutoff,   setCutoff]   = useState(null);   // slider value (timestamp); null = show all
  const [playing,  setPlaying]  = useState(false);

  // Initialize the Leaflet map once
  useEffect(() => {
    if (mapInst.current) return;
    const map = L.map(mapRef.current, { center: HUNTSVILLE, zoom: 10, scrollWheelZoom: true });
    // CartoDB Positron tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    clusterLayer.current.addTo(map);
    pinLayer.current.addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  // Load cases (active + resolved) and clusters
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getMapCases({}),                       // active (non-resolved)
      api.getMapCases({ status: 'resolved' }),    // resolved
      api.getClusters().catch(() => []),
    ]).then(([active, resolved, cl]) => {
      if (cancelled) return;
      const all = [...(active || []), ...(resolved || [])]
        .filter(c => c.location_lat && c.location_lng)
        .map(c => ({ ...c, location_lat: parseFloat(c.location_lat), location_lng: parseFloat(c.location_lng) }));
      setCases(all);
      setClusters(cl || []);
      setLoading(false);
    }).catch(() => { if (!cancelled) { setCases([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Cases passing the type/status/time-range filters (before the slider cutoff)
  const filtered = useMemo(() => {
    const now = Date.now();
    return cases.filter(c => {
      if (typeFilter !== 'all' && c.subject_type !== typeFilter) return false;
      if (statusFilter === 'active'   && c.status === 'resolved') return false;
      if (statusFilter === 'resolved' && c.status !== 'resolved') return false;
      if (timeRange !== 'all') {
        const cutoffDays = parseInt(timeRange);
        if (now - new Date(c.created_at).getTime() > cutoffDays * DAY) return false;
      }
      return true;
    });
  }, [cases, typeFilter, statusFilter, timeRange]);

  // Slider domain (min/max filed dates of the filtered set)
  const [minT, maxT] = useMemo(() => {
    if (!filtered.length) return [null, null];
    const times = filtered.map(c => new Date(c.created_at).getTime());
    return [Math.min(...times), Math.max(...times)];
  }, [filtered]);

  // Reset slider whenever the filtered domain changes
  useEffect(() => { setCutoff(maxT); setPlaying(false); }, [minT, maxT]);

  // Cases visible at the current slider cutoff
  const visible = useMemo(() => {
    if (cutoff == null) return filtered;
    return filtered.filter(c => new Date(c.created_at).getTime() <= cutoff);
  }, [filtered, cutoff]);

  // Render pins
  useEffect(() => {
    if (!mapInst.current) return;
    pinLayer.current.clearLayers();
    visible.forEach(c => {
      const m = L.marker([c.location_lat, c.location_lng], { icon: makePin(c) });
      m.bindPopup(popupHtml(c), { maxWidth: 270 });
      m.addTo(pinLayer.current);
    });
  }, [visible]);

  // Render cluster alert circles (3+ proximate, recent cases)
  useEffect(() => {
    if (!mapInst.current) return;
    clusterLayer.current.clearLayers();
    clusters.forEach(cl => {
      const circle = L.circle([cl.center_lat, cl.center_lng], {
        radius: Math.max(cl.radius_miles, 2) * 1609.34,
        color: '#f59e0b', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.12,
      });
      circle.bindPopup(
        `<div style="max-width:260px;font-family:system-ui,sans-serif;font-size:.8rem;">
          <strong>⚠ ${cl.case_count} cases reported in this area within 30 days</strong>
          <p style="margin:.4rem 0 0;color:#555;font-size:.76rem;line-height:1.45;">
            This pattern has been flagged for community awareness. This is a documented pattern only,
            not an accusation.
          </p>
        </div>`, { maxWidth: 280 });
      circle.addTo(clusterLayer.current);
    });
  }, [clusters]);

  // Time-slider playback
  function togglePlay() {
    if (playing) { clearInterval(playTimer.current); setPlaying(false); return; }
    if (minT == null) return;
    setPlaying(true);
    setCutoff(minT);
    const span = Math.max(maxT - minT, 1);
    const step = span / 40;
    playTimer.current = setInterval(() => {
      setCutoff(prev => {
        const next = (prev ?? minT) + step;
        if (next >= maxT) { clearInterval(playTimer.current); setPlaying(false); return maxT; }
        return next;
      });
    }, 200);
  }
  useEffect(() => () => clearInterval(playTimer.current), []);

  const hasSlider = minT != null && maxT != null && maxT > minT;

  return (
    <div className="page" style={{ paddingTop: '1rem' }}>
      <div className="container wide">
        <div className="section-header" style={{ marginBottom: '.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Missing Persons Map</h1>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.2rem' }}>
              All active cases across North Alabama. {filtered.length} plotted.
            </p>
          </div>
          <a href="/" className="btn btn-outline btn-sm">← All cases</a>
        </div>

        {/* Filter controls */}
        <div className="map-filter-bar">
          <div className="map-filter-group">
            <label>Type</label>
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="person">Persons</option>
              <option value="pet">Pets</option>
              <option value="item">Property</option>
            </select>
          </div>
          <div className="map-filter-group">
            <label>Status</label>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="map-filter-group">
            <label>Time range</label>
            <select className="filter-select" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {clusters.length > 0 && (
          <div className="map-cluster-alert">
            ⚠ {clusters.length} geographic {clusters.length === 1 ? 'cluster' : 'clusters'} detected
            ({clusters.reduce((s, c) => s + c.case_count, 0)} cases). Multiple cases reported in close
            proximity within 30 days — flagged for community awareness. Documented pattern only, not an accusation.
          </div>
        )}

        {loading ? (
          <div className="spinner" style={{ margin: '3rem auto' }} />
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <div ref={mapRef} style={{ width: '100%', height: 'calc(100vh - 320px)', minHeight: 420,
                borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }} />
              {/* Legend */}
              <div className="map-legend">
                <div><span className="map-legend-dot" style={{ background: '#dc2626' }} /> Active person</div>
                <div><span className="map-legend-dot" style={{ background: '#f59e0b' }} /> Active pet / property</div>
                <div><span className="map-legend-dot" style={{ background: '#16a34a' }} /> Resolved</div>
              </div>
            </div>

            {/* Time slider */}
            {hasSlider && (
              <div className="map-timeline">
                <button className="btn btn-sm btn-outline" onClick={togglePlay}>
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <input type="range" min={minT} max={maxT} value={cutoff ?? maxT}
                  step={Math.max(Math.floor((maxT - minT) / 100), 1)}
                  onChange={e => { setCutoff(parseInt(e.target.value)); setPlaying(false); clearInterval(playTimer.current); }}
                  style={{ flex: 1, accentColor: '#dc2626' }} />
                <span style={{ fontSize: '.78rem', color: 'var(--muted)', minWidth: 150, textAlign: 'right' }}>
                  Showing cases filed through<br />
                  <strong>{new Date(cutoff ?? maxT).toLocaleDateString()}</strong> · {visible.length} cases
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
