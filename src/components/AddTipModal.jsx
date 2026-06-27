import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const TIP_TYPES = [
  { value: 'sighting',        label: 'Sighting',         desc: 'I saw the subject at a specific place/time' },
  { value: 'contact',         label: 'Contact Report',   desc: 'I had direct contact or communication' },
  { value: 'document',        label: 'Document',         desc: 'I have a record, flyer, report, or paperwork' },
  { value: 'media',           label: 'Media/Evidence',   desc: 'I have photos, video, or other media' },
  { value: 'official_report', label: 'Official Report',  desc: 'Information from police, hospital, or an authority' },
  { value: 'other',           label: 'Other',            desc: 'Anything else useful to the search' },
];

const ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
].join(',');

export default function AddTipModal({ caseId, onClose, onAdded }) {
  const { token } = useAuth();
  const [tipType,    setTipType]    = useState('sighting');
  const [content,    setContent]    = useState('');
  const [locDesc,    setLocDesc]    = useState('');
  const [lat,        setLat]        = useState('');
  const [lng,        setLng]        = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [sourceUrl,  setSourceUrl]  = useState('');
  const [anonName,   setAnonName]   = useState('');
  const [files,      setFiles]      = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [locating,   setLocating]   = useState(false);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const urls = files.map(f => (f.type.startsWith('image/') || f.type.startsWith('video/')) ? URL.createObjectURL(f) : null);
    setPreviews(urls);
    return () => urls.forEach(u => u && URL.revokeObjectURL(u));
  }, [files]);

  function handleFiles(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 8));
    e.target.value = '';
  }

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setLocating(false); },
      () => { setErr('Could not get your location'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) { setErr('Information is required'); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('tip_type', tipType);
      fd.append('content',  content.trim());
      if (locDesc.trim())   fd.append('location_description', locDesc.trim());
      if (lat && lng)       { fd.append('location_lat', lat); fd.append('location_lng', lng); }
      if (occurredAt)       fd.append('occurred_at', occurredAt);
      if (sourceUrl.trim()) fd.append('source_url', sourceUrl.trim());
      if (anonName.trim())  fd.append('submitter_display', anonName.trim());
      files.forEach(f => fd.append('files', f));

      const tip = await api.addTip(caseId, fd, token);
      onAdded(tip);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <span className="modal-title">Submit Information</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>

          <div className="form-group">
            <label className="form-label">Information Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              {TIP_TYPES.map(t => (
                <label key={t.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '.6rem',
                  padding: '.5rem .75rem', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${tipType === t.value ? 'var(--amber)' : 'var(--border)'}`,
                  cursor: 'pointer', background: tipType === t.value ? 'rgba(224,146,42,.06)' : 'transparent',
                }}>
                  <input type="radio" name="tip_type" value={t.value} checked={tipType === t.value}
                    onChange={() => setTipType(t.value)} style={{ marginTop: '.2rem', accentColor: 'var(--amber)' }} />
                  <div>
                    <p style={{ fontSize: '.875rem', fontWeight: 600 }}>{t.label}</p>
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Information *</label>
            <textarea className="form-textarea" required value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Provide specific, factual information only. No opinions or prayers." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location (where)</label>
              <input className="form-input" value={locDesc}
                onChange={e => setLocDesc(e.target.value)} placeholder="Street, area, or landmark" />
            </div>
            <div className="form-group">
              <label className="form-label">Date/Time (when)</label>
              <input className="form-input" type="datetime-local" value={occurredAt}
                onChange={e => setOccurredAt(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Map coordinates (optional)</label>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <input className="form-input" value={lat} onChange={e => setLat(e.target.value)}
                placeholder="Latitude" style={{ flex: 1 }} />
              <input className="form-input" value={lng} onChange={e => setLng(e.target.value)}
                placeholder="Longitude" style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation} disabled={locating}>
                {locating ? '…' : '📍 Me'}
              </button>
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.3rem' }}>
              Adding coordinates places this sighting on the case map and helps reveal geographic patterns.
            </p>
          </div>

          {(tipType === 'official_report' || tipType === 'document' || tipType === 'media') && (
            <div className="form-group">
              <label className="form-label">Source URL</label>
              <input className="form-input" type="url" value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Display name (optional)</label>
            <input className="form-input" value={anonName} maxLength={60}
              onChange={e => setAnonName(e.target.value)} placeholder="Leave blank to appear as Anonymous" />
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.3rem' }}>
              Your account is required to submit, but your identity is shown only to the case owner and admins.
              Publicly, this tip appears under the display name you choose here, or as “Anonymous”.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Attach photos or documents (optional)</label>
            <div className="tip-media-upload" onClick={() => fileRef.current?.click()}>
              Click to attach photos, video, or documents (PDF, etc.)
            </div>
            <input ref={fileRef} type="file" multiple accept={ACCEPT}
              style={{ display: 'none' }} onChange={handleFiles} />
            {files.length > 0 && (
              <div className="tip-preview-strip">
                {files.map((f, i) => (
                  <div key={i} className="tip-preview-item">
                    {previews[i]
                      ? (f.type.startsWith('video/') ? <video src={previews[i]} /> : <img src={previews[i]} alt="" />)
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '100%', height: '100%', fontSize: '.65rem', padding: '.25rem',
                          textAlign: 'center', color: 'var(--sub)' }}>📄 {f.name.slice(0, 18)}</div>
                    }
                    <button type="button" className="tip-preview-remove"
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-amber btn-full" disabled={busy}>
            {busy ? '…' : 'Submit Information'}
          </button>
        </form>
      </div>
    </div>
  );
}
