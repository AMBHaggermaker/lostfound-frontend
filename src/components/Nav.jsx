import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Nav() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await login(email, password);
      setShowLogin(false);
      setEmail(''); setPassword('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-brand">
            <span className="nav-brand-icon" />
            Lost &amp; Found
          </NavLink>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Cases</NavLink>
            <NavLink to="/map" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>🗺 Map</NavLink>
            <a href="https://mycelium.unprecedentedtimes.org" className="nav-link" target="_blank" rel="noreferrer">Mycelium</a>
          </div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <span className="nav-user">{user.username}</span>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/new')}>+ New Case</button>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm nav-btn" onClick={() => setShowLogin(true)}>Sign in</button>
          )}
        </div>
      </nav>

      {showLogin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLogin(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <span className="modal-title">Sign in with Mycelium account</span>
              <button className="modal-close" onClick={() => setShowLogin(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={doLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" required value={password}
                  onChange={e => setPassword(e.target.value)} />
              </div>
              {err && <p className="form-error">{err}</p>}
              <button className="btn btn-primary btn-full" disabled={busy}>
                {busy ? '…' : 'Sign in'}
              </button>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center', marginTop: '.25rem' }}>
                Use your Mycelium account to sign in. Don't have one?{' '}
                <a href="https://mycelium.unprecedentedtimes.org" target="_blank" rel="noreferrer"
                   style={{ color: 'var(--accent)' }}>
                  Register at mycelium.unprecedentedtimes.org
                </a>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
