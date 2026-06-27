import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import AddTipModal from '../components/AddTipModal';

const BASE = 'https://lostfound.unprecedentedtimes.org';

const TIP_LABELS = {
  sighting:        'Sighting',
  contact:         'Contact',
  document:        'Document',
  media:           'Media/Evidence',
  official_report: 'Official Report',
  other:           'Other',
  official:        'Official',
  resource:        'Resource',
};

function fmt(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CaseDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [lostCase,   setLostCase]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [showTip,    setShowTip]    = useState(false);
  const [lightbox,   setLightbox]   = useState(null);
  const [briefing,   setBriefing]   = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefErr,   setBriefErr]   = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true); setErr(null);
    try { setLostCase(await api.getCase(id, token)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadBriefing() {
    setBriefLoading(true); setBriefErr(null);
    try { setBriefing(await api.getBriefing(id, token)); }
    catch (e) { setBriefErr(e.message); }
    finally { setBriefLoading(false); }
  }

  async function updateStatus(status) {
    setStatusBusy(true);
    try { setLostCase(prev => ({ ...prev, status })); await api.updateStatus(id, status, token); }
    catch (e) { alert(e.message); setLostCase(prev => ({ ...prev })); }
    finally { setStatusBusy(false); }
  }

  async function deleteTip(tipId) {
    if (!confirm('Remove this tip?')) return;
    try {
      await api.deleteTip(id, tipId, token);
      setLostCase(prev => ({ ...prev, tips: prev.tips.filter(t => t.id !== tipId) }));
    } catch (e) { alert(e.message); }
  }

  async function verifyTip(tipId) {
    try {
      const updated = await api.verifyTip(id, tipId, token);
      setLostCase(prev => ({
        ...prev, tips: prev.tips.map(t => t.id === tipId ? { ...t, is_verified: updated.is_verified } : t),
      }));
    } catch (e) { alert(e.message); }
  }

  async function pinTip(tipId) {
    try {
      const updated = await api.pinTip(id, tipId, token);
      setLostCase(prev => {
        const tips = prev.tips.map(t => t.id === tipId ? { ...t, is_pinned: updated.is_pinned } : t);
        // keep pinned tips first, then chronological
        tips.sort((a, b) =>
          (b.is_pinned - a.is_pinned) || (new Date(a.created_at) - new Date(b.created_at)));
        return { ...prev, tips };
      });
    } catch (e) { alert(e.message); }
  }

  async function deleteCase() {
    if (!confirm('Permanently delete this case and all its information?')) return;
    setDeleteBusy(true);
    try { await api.deleteCase(id, token); navigate('/'); }
    catch (e) { alert(e.message); setDeleteBusy(false); }
  }

  function onTipAdded(tip) {
    setLostCase(prev => ({ ...prev, tips: [...(prev.tips || []), tip] }));
    setShowTip(false);
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>;
  if (err)     return <div className="page"><div className="container"><p className="error-msg">{err}</p></div></div>;

  const isOwner = user?.id === lostCase.poster_id;
  const isAdmin = user?.role === 'admin';
  const canPin  = isOwner || isAdmin;
  const photos  = lostCase.photos || [];
  const tips    = lostCase.tips   || [];

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div className="case-detail-header">
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`status-badge status-${lostCase.status}`}>{lostCase.status}</span>
            <span className={`type-badge type-${lostCase.subject_type}`}>{lostCase.subject_type}</span>
            {lostCase.tags?.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
          <h1 className="case-detail-title">{lostCase.title}</h1>
          <div className="case-detail-meta">
            {lostCase.subject_name && <span>Subject: <strong>{lostCase.subject_name}</strong></span>}
            {lostCase.last_seen_location && <span>📍 {lostCase.last_seen_location}</span>}
            {lostCase.last_seen_at && <span>🕐 Last seen {fmtDate(lostCase.last_seen_at)}</span>}
            <span>Posted by {lostCase.username}</span>
            <span>{fmtDate(lostCase.created_at)}</span>
          </div>
        </div>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div className="photo-gallery">
            {photos.map(p => (
              <img key={p.id} src={`${BASE}${p.url}`} alt=""
                onClick={() => setLightbox(`${BASE}${p.url}`)} />
            ))}
          </div>
        )}

        {/* Description + contact */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '.95rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lostCase.description}</p>
          {lostCase.contact_info && (
            <p style={{ marginTop: '.75rem', fontSize: '.875rem', color: 'var(--sub)' }}>
              📞 Contact: <strong>{lostCase.contact_info}</strong>
            </p>
          )}
        </div>

        {/* Owner controls */}
        {isOwner && (
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.6rem', fontWeight: 600 }}>
              CASE CONTROLS
            </p>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              {['searching', 'found', 'resolved'].map(s => (
                <button key={s} disabled={statusBusy || lostCase.status === s}
                  className={`btn btn-sm ${lostCase.status === s ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => updateStatus(s)}>
                  {s}
                </button>
              ))}
              <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }}
                disabled={deleteBusy} onClick={deleteCase}>
                {deleteBusy ? '…' : 'Delete case'}
              </button>
            </div>
          </div>
        )}

        {/* AI Briefing */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              AI Case Briefing
            </p>
            {!briefing && (
              <button className="btn btn-sm btn-outline" disabled={briefLoading || !token}
                onClick={loadBriefing} title={!token ? 'Sign in to generate briefing' : ''}>
                {briefLoading ? '…' : token ? 'Generate Briefing' : 'Sign in to use'}
              </button>
            )}
          </div>

          {briefErr && <p className="form-error">{briefErr}</p>}

          {briefing ? (
            <div className="briefing-panel" style={{ margin: 0, border: 'none', padding: 0, background: 'none' }}>
              <div style={{
                fontSize: '.72rem', color: 'var(--amber)', background: 'rgba(245,158,11,.1)',
                border: '1px solid rgba(245,158,11,.3)', borderRadius: 'var(--radius-sm)',
                padding: '.5rem .7rem', marginBottom: '.85rem',
              }}>
                ⚠ This briefing is AI-generated from submitted tips and has <strong>not been verified</strong>.
                Treat it as an orientation aid, not a source of fact. Confirm everything independently.
              </div>
              <div className="briefing-section">
                <h4>Summary</h4>
                <p>{briefing.summary}</p>
              </div>
              {briefing.known?.length > 0 && (
                <div className="briefing-section">
                  <h4>What Is Known</h4>
                  <ul className="briefing-list">{briefing.known.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              {briefing.unknown?.length > 0 && (
                <div className="briefing-section">
                  <h4>What Is Unknown</h4>
                  <ul className="briefing-list briefing-contradiction">{briefing.unknown.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {briefing.geographic_patterns && (
                <div className="briefing-section">
                  <h4>Geographic Patterns</h4>
                  <p>{briefing.geographic_patterns}</p>
                </div>
              )}
              {briefing.next_steps?.length > 0 && (
                <div className="briefing-section">
                  <h4>Suggested Next Steps</h4>
                  <ul className="briefing-list">{briefing.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              <p className="briefing-ts">Generated {fmt(briefing.generated_at)} · {briefing.tip_count} tips analysed</p>
              <button className="btn btn-sm btn-outline" style={{ marginTop: '.5rem' }}
                disabled={briefLoading} onClick={loadBriefing}>
                {briefLoading ? '…' : 'Regenerate'}
              </button>
            </div>
          ) : (
            !briefLoading && <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
              Generates a structured briefing for new volunteers — what is known, what is unknown,
              geographic patterns in sightings, and suggested next steps. AI-generated and not verified.
            </p>
          )}
        </div>

        {/* Information thread */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>OSINT Information Thread ({tips.length})</h2>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <a href={api.exportUrl(id)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              Export PDF
            </a>
            {user && (
              <button className="btn btn-amber btn-sm" onClick={() => setShowTip(true)}>
                + Add Information
              </button>
            )}
          </div>
        </div>

        {tips.length === 0 ? (
          <div className="card empty">
            No information submitted yet.{user ? ' Be the first to add a tip.' : ' Sign in to submit information.'}
          </div>
        ) : (
          <div className="tip-thread">
            {tips.map(tip => (
              <div key={tip.id} className={`tip-card${tip.is_verified ? ' verified' : ''}${tip.is_pinned ? ' pinned' : ''}`}>
                <div className="tip-header">
                  {tip.is_pinned && <span className="tip-pin-badge">📌 Pinned</span>}
                  <span className={`tip-chip tip-${tip.tip_type}`}>{TIP_LABELS[tip.tip_type] || tip.tip_type}</span>
                  {tip.is_verified && <span style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 700 }}>✓ Verified</span>}
                  {tip.identity_visible
                    ? <a href={`https://mycelium.unprecedentedtimes.org/profile/${tip.username}`}
                        target="_blank" rel="noreferrer" className="username-link" style={{ fontSize: '.8rem' }}>
                        {tip.username}{tip.submitter_display ? ` (“${tip.submitter_display}”)` : ''}
                      </a>
                    : <span style={{ fontSize: '.8rem', color: 'var(--sub)' }}>{tip.display_name}</span>}
                  <span style={{ fontSize: '.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                    {fmt(tip.created_at)}
                  </span>
                </div>

                {(tip.location_description || tip.occurred_at) && (
                  <p className="tip-loc">
                    {tip.location_description && `📍 ${tip.location_description}`}
                    {tip.location_description && tip.occurred_at && '  '}
                    {tip.occurred_at && `🕐 ${fmtDate(tip.occurred_at)}`}
                    {tip.location_lat && tip.location_lng && (
                      <a href={`https://www.google.com/maps?q=${tip.location_lat},${tip.location_lng}`}
                        target="_blank" rel="noreferrer" style={{ marginLeft: '.4rem', fontSize: '.72rem' }}>
                        (map)
                      </a>
                    )}
                  </p>
                )}

                <p className="tip-content">{tip.content}</p>

                {tip.source_url && (
                  <a className="tip-source" href={tip.source_url} target="_blank" rel="noreferrer">
                    🔗 {tip.source_url}
                  </a>
                )}

                {tip.media?.length > 0 && (
                  <div className="tip-media-grid">
                    {tip.media.map(m => (
                      m.file_kind === 'document' || (m.mime_type && !m.mime_type.startsWith('image/') && !m.mime_type.startsWith('video/'))
                        ? <a key={m.id} href={`${BASE}${m.url}`} target="_blank" rel="noreferrer"
                            className="tip-doc-link">📄 {m.original_name || 'Document'}</a>
                        : m.mime_type?.startsWith('video/')
                          ? <video key={m.id} src={`${BASE}${m.url}`} controls />
                          : <img key={m.id} src={`${BASE}${m.url}`} alt=""
                              onClick={() => setLightbox(`${BASE}${m.url}`)} />
                    ))}
                  </div>
                )}

                {(canPin || tip.identity_visible) && (
                  <div className="tip-actions">
                    {canPin && (
                      <button className="btn btn-sm btn-outline" onClick={() => pinTip(tip.id)}>
                        {tip.is_pinned ? 'Unpin' : '📌 Pin'}
                      </button>
                    )}
                    {(isOwner || isAdmin) && (
                      <button className="btn btn-sm btn-outline" onClick={() => verifyTip(tip.id)}>
                        {tip.is_verified ? 'Unverify' : '✓ Verify'}
                      </button>
                    )}
                    {(isOwner || isAdmin || user?.id === tip.user_id) && (
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }}
                        onClick={() => deleteTip(tip.id)}>Remove</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showTip && (
        <AddTipModal caseId={id} onClose={() => setShowTip(false)} onAdded={onTipAdded} />
      )}
    </div>
  );
}
