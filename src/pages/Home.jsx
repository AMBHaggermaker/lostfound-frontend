import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import CaseCard from '../components/CaseCard';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [sType,   setSType]   = useState('');
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const LIMIT = 24;

  useEffect(() => { setPage(1); setCases([]); }, [search, status, sType]);
  useEffect(() => { load(); }, [page, search, status, sType]);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const params = { page, limit: LIMIT };
      if (search)  params.search       = search;
      if (status)  params.status       = status;
      if (sType)   params.subject_type = sType;
      const rows = await api.getCases(params);
      if (page === 1) setCases(rows);
      else setCases(prev => [...prev, ...rows]);
      setHasMore(rows.length === LIMIT);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Lost &amp; Found</h1>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.2rem' }}>
              Information only — sightings, contacts, evidence. No comments.
            </p>
          </div>
          {user && (
            <button className="btn btn-primary" onClick={() => navigate('/new')}>+ Report Case</button>
          )}
        </div>

        <div className="filters">
          <input className="filter-input" placeholder="Search cases…" value={search}
            onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="searching">Searching</option>
            <option value="found">Found</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className="filter-select" value={sType} onChange={e => setSType(e.target.value)}>
            <option value="">All types</option>
            <option value="person">Person</option>
            <option value="pet">Pet</option>
            <option value="item">Item</option>
          </select>
        </div>

        {loading && page === 1
          ? <div className="spinner" />
          : err
            ? <p className="error-msg">{err}</p>
            : cases.length === 0
              ? <p className="empty">No cases found.</p>
              : <>
                  <div className="case-grid">
                    {cases.map(c => <CaseCard key={c.id} c={c} />)}
                  </div>
                  {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                      <button className="btn btn-outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
                        {loading ? '…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
        }
      </div>
    </div>
  );
}
