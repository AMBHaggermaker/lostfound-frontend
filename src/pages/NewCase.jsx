import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

export default function NewCase() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', subject_name: '', subject_type: 'person',
    last_seen_location: '', last_seen_at: '', contact_info: '', tags: '',
  });
  const [photos,   setPhotos]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user]);

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [photos]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handlePhotos(e) {
    setPhotos(prev => [...prev, ...Array.from(e.target.files)].slice(0, 10));
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (!photos.length) { setErr('At least one photo is required'); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v.trim()) fd.append(k, v.trim()); });
      photos.forEach(f => fd.append('photos', f));

      const lostCase = await api.createCase(fd, token);
      navigate(`/cases/${lostCase.id}`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (!user) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem' }}>Report a Case</h1>

        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }} onSubmit={submit}>

          <div className="form-group">
            <label className="form-label">Subject Type *</label>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {['person', 'pet', 'item'].map(t => (
                <button key={t} type="button" style={{ flex: 1 }}
                  className={`btn btn-sm ${form.subject_type === t ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => set('subject_type', t)}>
                  {t === 'person' ? '👤' : t === 'pet' ? '🐾' : '📦'} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Case Title *</label>
            <input className="form-input" required value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Missing: Jane Doe, age 34" autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input className="form-input" value={form.subject_name}
              onChange={e => set('subject_name', e.target.value)}
              placeholder="Full name, pet name, or item description" />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-textarea" required value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Physical description, circumstances, distinguishing features…"
              style={{ minHeight: 120 }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Last Seen Location</label>
              <input className="form-input" value={form.last_seen_location}
                onChange={e => set('last_seen_location', e.target.value)}
                placeholder="Area, street, or landmark" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Seen Date/Time</label>
              <input className="form-input" type="datetime-local" value={form.last_seen_at}
                onChange={e => set('last_seen_at', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Info</label>
              <input className="form-input" value={form.contact_info}
                onChange={e => set('contact_info', e.target.value)}
                placeholder="Phone, email, or other contact" />
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input className="form-input" value={form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="area-name, age-group, …" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Photos * (required, up to 10)</label>
            <label
              className={`photo-upload-zone${photos.length >= 10 ? ' disabled' : ''}`}
              htmlFor={photos.length >= 10 ? undefined : 'lf-photo-input'}
            >
              {photos.length === 0
                ? 'Tap or click to add photos — at least one required'
                : photos.length >= 10
                  ? '10 / 10 photos — limit reached'
                  : `${photos.length} / 10 photos — tap to add more`
              }
            </label>
            <input id="lf-photo-input" ref={photoRef} type="file" multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              style={{ display: 'none' }} onChange={handlePhotos} />
            {previews.length > 0 && (
              <div className="photo-preview-grid">
                {previews.map((url, i) => (
                  <div key={i} className="photo-preview-item">
                    <img src={url} alt="" />
                    <button type="button" className="photo-preview-remove"
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Submit Case'}
          </button>
        </form>
      </div>
    </div>
  );
}
