import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = 'https://lostfound.unprecedentedtimes.org';
const SUBJECT_ICONS = { person: '👤', pet: '🐾', item: '📦' };

function hoursAgo(date) {
  const h = Math.round((Date.now() - new Date(date)) / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function CaseCard({ c }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  const primary = c.photos?.find(p => p.is_primary) || c.photos?.[0];
  const showPhoto = primary && !imgErr;

  return (
    <div className="card case-card" onClick={() => navigate(`/cases/${c.id}`)}>
      {showPhoto
        ? <img className="case-photo" src={`${BASE}${primary.url}`} alt={c.title}
            loading="lazy" onError={() => setImgErr(true)} />
        : <div className="case-photo-placeholder">{SUBJECT_ICONS[c.subject_type] || '?'}</div>
      }
      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
        <span className={`status-badge status-${c.status}`}>{c.status}</span>
        <span className={`type-badge type-${c.subject_type}`}>{SUBJECT_ICONS[c.subject_type]} {c.subject_type}</span>
      </div>
      <p className="case-title">{c.title}</p>
      {c.last_seen_location && <p className="case-loc">📍 {c.last_seen_location}</p>}
      <div className="case-meta">
        <span>{hoursAgo(c.created_at)}</span>
        {c.tip_count > 0 && <span>{c.tip_count} tip{c.tip_count !== 1 ? 's' : ''}</span>}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>by {c.username}</span>
      </div>
    </div>
  );
}
