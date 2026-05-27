import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HUNTSVILLE = [34.7304, -86.5861];

const STATUS_COLORS = {
  searching: '#dc2626',
  found:     '#16a34a',
  resolved:  '#6b7280',
};

const TYPE_ICONS = {
  person: '👤',
  pet:    '🐾',
  item:   '📦',
};

function makePin(color, emoji) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:${color};border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 2px 5px rgba(0,0,0,.35);">${emoji}</div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -11],
  });
}

export default function LFMap({
  cases = [],
  height = '460px',
  showResolved = false,
  onPinClick = null,
}) {
  const mapRef   = useRef(null);
  const mapInst  = useRef(null);
  const layerRef = useRef(L.layerGroup());
  const [locating, setLocating] = useState(false);
  const [mobileCase, setMobileCase] = useState(null);

  useEffect(() => {
    if (mapInst.current) return;
    const map = L.map(mapRef.current, { center: HUNTSVILLE, zoom: 11 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current.addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInst.current) return;
    layerRef.current.clearLayers();

    const visible = cases.filter(c => {
      if (!c.location_lat || !c.location_lng) return false;
      if (c.status === 'resolved' && !showResolved) return false;
      return true;
    });

    visible.forEach(c => {
      const color = STATUS_COLORS[c.status] || '#6b7280';
      const emoji = TYPE_ICONS[c.subject_type] || '●';
      const icon  = makePin(color, emoji);
      const m     = L.marker([c.location_lat, c.location_lng], { icon });

      const clickHandler = onPinClick || (() => setMobileCase(c));
      m.on('click', () => clickHandler(c));

      const photoHtml = c.primary_photo
        ? `<img src="https://lostfound.unprecedentedtimes.org${c.primary_photo}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:.35rem;" />`
        : '';
      const popupHtml = `
        <div style="min-width:200px;max-width:260px;font-family:system-ui,sans-serif;font-size:.82rem;">
          ${photoHtml}
          <div style="display:flex;gap:.3rem;align-items:center;margin-bottom:.3rem;">
            <span style="padding:.1rem .4rem;border-radius:99px;background:${color}22;color:${color};border:1px solid ${color}44;font-size:.7rem;font-weight:700;text-transform:uppercase;">${c.status}</span>
            <span style="font-size:.75rem;color:#888;">${emoji} ${c.subject_type}</span>
          </div>
          <div style="font-weight:600;color:#1a1a1a;margin-bottom:.2rem;">${c.subject_name || c.title}</div>
          ${c.last_seen_location ? `<div style="font-size:.77rem;color:#888;margin-bottom:.15rem;">📍 ${c.last_seen_location}</div>` : ''}
          <a href="/case/${c.id}" style="display:block;text-align:center;padding:.28rem;background:#15803d;color:#fff;border-radius:4px;font-size:.77rem;font-weight:600;text-decoration:none;margin-top:.3rem;">View Case →</a>
        </div>`;
      m.bindPopup(popupHtml, { maxWidth: 270 });
      m.addTo(layerRef.current);
    });
  }, [cases, showResolved, onPinClick]);

  function locate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(pos => {
      mapInst.current?.setView([pos.coords.latitude, pos.coords.longitude], 14);
      setLocating(false);
    }, () => setLocating(false));
  }

  const searchingCount  = cases.filter(c => c.status === 'searching' && c.location_lat).length;
  const foundCount      = cases.filter(c => c.status === 'found'     && c.location_lat).length;

  return (
    <div className="lf-map-container">
      <div style={{ position: 'relative', height }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }} />

        <button
          onClick={locate}
          disabled={locating}
          style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000, background: '#fff', border: '1px solid #ccc', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}
          title="Center on my location"
        >
          {locating ? '…' : '◎'}
        </button>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(4px)', border: '1px solid #e5e7eb', borderRadius: 6, padding: '.4rem .6rem', fontSize: '.72rem', display: 'flex', flexDirection: 'column', gap: '.2rem', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            <span>Searching ({searchingCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            <span>Found ({foundCount})</span>
          </div>
          {showResolved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6b7280', display: 'inline-block' }} />
              <span>Resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {mobileCase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.4)' }} onClick={() => setMobileCase(null)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '12px 12px 0 0', padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2, margin: '0 auto .75rem' }} />
            {mobileCase.primary_photo && (
              <img src={`https://lostfound.unprecedentedtimes.org${mobileCase.primary_photo}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: '.5rem' }} alt="" />
            )}
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginBottom: '.35rem' }}>
              <span style={{ padding: '.1rem .45rem', borderRadius: 99, background: (STATUS_COLORS[mobileCase.status]||'#888')+'22', color: STATUS_COLORS[mobileCase.status]||'#888', border: `1px solid ${(STATUS_COLORS[mobileCase.status]||'#888')}44`, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{mobileCase.status}</span>
              <span style={{ fontSize: '.8rem', color: '#888' }}>{TYPE_ICONS[mobileCase.subject_type]} {mobileCase.subject_type}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.2rem' }}>{mobileCase.subject_name || mobileCase.title}</div>
            {mobileCase.last_seen_location && <div style={{ fontSize: '.82rem', color: '#888', marginBottom: '.5rem' }}>📍 {mobileCase.last_seen_location}</div>}
            <a href={`/case/${mobileCase.id}`} style={{ display: 'block', textAlign: 'center', padding: '.55rem', background: '#15803d', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: '.9rem', textDecoration: 'none' }}>
              View Case →
            </a>
            <button style={{ marginTop: '.5rem', width: '100%', padding: '.4rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#888' }} onClick={() => setMobileCase(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
