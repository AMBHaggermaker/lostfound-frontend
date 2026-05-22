import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const TIP_TYPES = [
  { value: 'sighting',  label: 'Sighting',       desc: 'I saw the subject at a specific place/time' },
  { value: 'contact',   label: 'Contact Report',  desc: 'I had direct contact or communication' },
  { value: 'media',     label: 'Media/Evidence',  desc: 'I have photos, video, or documentary evidence' },
  { value: 'official',  label: 'Official Source', desc: 'Information from police, hospital, authority' },
  { value: 'resource',  label: 'Resource',        desc: 'Useful link, service, or contact for this case' },
];

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

export default function AddTipModal({ caseId, onClose, onAdded }) {
  const { token } = useAuth();
  const [tipType,    setTipType]    = useState('sighting');
  const [content,    setContent]    = useState('');
  const [location,   setLocation]   = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [sourceUrl,  setSourceUrl]  = useState('');
  const [files,      setFiles]      = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  function handleFiles(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 5));
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) { setErr('Content is required'); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('tip_type',    tipType);
      fd.append('content',     content.trim());
      if (location.trim())   fd.append('location',    location.trim());
      if (occurredAt)        fd.append('occurred_at', occurredAt);
      if (sourceUrl.trim())  fd.append('source_url',  sourceUrl.trim());
      files.forEach(f => fd.append('media', f));

      const tip = await api.addTip(caseId, fd, token);
      onAdded(tip);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const selectedType = TIP_TYPES.find(t => t.value === tipType);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
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
              <input className="form-input" value={location}
                onChange={e => setLocation(e.target.value)} placeholder="Street, area, or landmark" />
            </div>
            <div className="form-group">
              <label className="form-label">Date/Time (when)</label>
              <input className="form-input" type="datetime-local" value={occurredAt}
                onChange={e => setOccurredAt(e.target.value)} />
            </div>
          </div>

          {(tipType === 'official' || tipType === 'resource' || tipType === 'media') && (
            <div className="form-group">
              <label className="form-label">Source URL</label>
              <input className="form-input" type="url" value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Attach Media (optional)</label>
            <div className="tip-media-upload" onClick={() => fileRef.current?.click()}>
              Click to attach photos or video
            </div>
            <input ref={fileRef} type="file" multiple accept={ACCEPT}
              style={{ display: 'none' }} onChange={handleFiles} />
            {previews.length > 0 && (
              <div className="tip-preview-strip">
                {previews.map((url, i) => (
                  <div key={i} className="tip-preview-item">
                    {files[i]?.type.startsWith('video/')
                      ? <video src={url} />
                      : <img src={url} alt="" />
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
