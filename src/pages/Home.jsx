import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import CaseCard from '../components/CaseCard';
import LFMap from '../components/LFMap';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases,       setCases]       = useState([]);
  const [mapCases,    setMapCases]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [mapLoading,  setMapLoading]  = useState(false);
  const [err,         setErr]         = useState(null);
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState('');
  const [sType,       setSType]       = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [viewMode,    setViewMode]    = useState('list');
  const [showResolved,setShowResolved]= useState(false);

  const LIMIT = 24;

  useEffect(() => { setPage(1); setCases([]); }, [search, status, sType]);
  useEffect(() => { if (viewMode === 'list') load(); }, [page, search, status, sType, viewMode]);

  useEffect(() => {
    if (viewMode !== 'map') return;
    setMapLoading(true);
    api.getMapCases(showResolved ? {} : { status: 'searching' })
      .then(rows => {
        if (showResolved) setMapCases(rows);
        else {
          api.getMapCases({ status: 'found' })
            .then(found => setMapCases([...rows, ...found]))
            .catch(() => setMapCases(rows));
        }
      })
      .catch(() => setMapCases([]))
      .finally(() => setMapLoading(false));
  }, [viewMode, showResolved]);

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
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {user && (
              <button className="btn btn-primary" onClick={() => navigate('/new')}>+ Report Case</button>
            )}
            <div className="lf-view-toggle">
              <button className={`lf-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
                ☰ List
              </button>
              <button className={`lf-view-btn${viewMode === 'map' ? ' active' : ''}`} onClick={() => setViewMode('map')}>
                🗺 Map
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
                  style={{ accentColor: '#15803d' }} />
                Show resolved cases
              </label>
              <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                {mapCases.filter(c => c.location_lat).length} cases plotted
              </span>
            </div>
            {mapLoading ? (
              <div className="spinner" style={{ margin: '3rem auto' }} />
            ) : (
              <LFMap
                cases={mapCases}
                height={window.innerWidth <= 768 ? 'calc(100vh - 180px)' : '560px'}
                showResolved={showResolved}
              />
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
