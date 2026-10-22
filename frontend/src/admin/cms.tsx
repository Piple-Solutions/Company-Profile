import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { admin, isNotFound, isSessionExpired, loginErrorMessage, messageForApiError, type ContentRow } from '../api';
import { createContentNotice, deleteConfirmMessage, statusChangeNotice } from '../adminCopy';
import { FieldError, Empty, LoadFailure, Loading } from '../components/Layout';

/** 18px inline line icons for the workspace chrome (decorative, aria-hidden). */
const ICON_PATHS: Record<string, ReactNode> = {
  dasbor: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  services: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
  products: (<><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>),
  portfolio: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 20 5.5-5.5L15 19l2.5-2.5L21 20" /></>),
  articles: (<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6" /></>),
  pricing: (<><path d="M20.6 13.3 13.4 20.5a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.7Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
  leads: (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  settings: (<><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></>),
};

function AdminIcon({ name }: { name: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="admin-icon"
    >
      {ICON_PATHS[name] ?? ICON_PATHS.dasbor}
    </svg>
  );
}

interface AuthState {
  email: string;
  csrf: string;
}

const AuthCtx = createContext<{ auth: AuthState | null; setAuth: (a: AuthState | null) => void }>({
  auth: null,
  setAuth: () => undefined,
});
export const useAuth = () => useContext(AuthCtx);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [checked, setChecked] = useState(false);
  const [bootError, setBootError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setChecked(false);
    setBootError('');
    admin.me()
      .then((me) => { if (active) setAuth({ email: me.email, csrf: me.csrf_token }); })
      .catch((err) => {
        if (!active) return;
        setAuth(null);
        // 401 is the normal unauthenticated state; anything else is an outage,
        // not a reason to quietly present the login form as if credentials failed.
        if (!isSessionExpired(err)) setBootError(messageForApiError(err, 'Tidak dapat memeriksa sesi admin.'));
      })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [attempt]);
  if (!checked) return <p className="admin-boot">Memuat…</p>;
  if (bootError) {
    return (
      <div className="admin-boot">
        <div className="admin-login-card">
          <h1>Admin tidak dapat dimuat</h1>
          <p role="alert" className="field-error">{bootError}</p>
          <button type="button" className="btn btn-primary admin-login-submit" onClick={() => setAttempt((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  }
  return <AuthCtx.Provider value={{ auth, setAuth }}>{children}</AuthCtx.Provider>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** Session-expiry feedback (Phase 2D): 401 responses from any admin mutation
 *  render as an actionable message instead of a generic failure. */
const SESSION_EXPIRED = 'Sesi berakhir. Muat ulang halaman lalu masuk kembali.';

/** Native <dialog> wrapper (Phase 2D-R3): real focus trap, Escape handling and
 *  an inert background (background content leaves the accessibility tree while
 *  open, so modal buttons never collide with page-level buttons).
 *  Escape/backdrop-close is always routed through onCancel: while `busy` the
 *  dialog cannot be dismissed at all (preventDefault), otherwise onClose().
 *  `children` must be the single <form> containing body + footer. */
function AdminModal({ open, title, busy, onClose, children }: {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="admin-modal"
      aria-labelledby="admin-modal-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}
    >
      <div className="admin-modal-head">
        <h2 id="admin-modal-title">{title}</h2>
        <button type="button" className="admin-modal-close" aria-label="Tutup" onClick={() => { if (!busy) onClose(); }} disabled={busy}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Login() {
  const nav = useNavigate();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const me = await admin.login(email, password);
      setAuth({ email: me.email, csrf: me.csrf_token });
      nav('/admin', { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-brand brand-lockup admin-login-brand">
          <img className="brand-mark" src="/brand/Asset%201LogoPiple.png" alt="Logo PipleSolution" width={38} height={38} />
          <span className="brand">Piple<span>Solution</span></span>
        </div>
        <h1>Masuk Admin</h1>
        <p className="admin-login-note">Satu akun Super Admin — tanpa pendaftaran publik.</p>
        <form onSubmit={submit} aria-label="Formulir masuk admin">
          <div>
            <label htmlFor="l-email">Email</label>
            <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="l-pass">Kata sandi</label>
            <input id="l-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary admin-login-submit" disabled={busy}>
            {busy ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
        <p className="admin-login-back"><Link to="/">← Kembali ke situs publik</Link></p>
      </div>
    </div>
  );
}

const MODULES = [
  { key: 'services', label: 'Layanan', desc: 'Tujuh kategori layanan komersial.' },
  { key: 'products', label: 'Produk', desc: 'Katalog produk digital beserta kesiapan dan demo.' },
  { key: 'portfolio', label: 'Portofolio', desc: 'Studi kasus yang disetujui publikasi.' },
  { key: 'articles', label: 'Artikel', desc: 'Tulisan wawasan.' },
  { key: 'pricing', label: 'Harga', desc: 'Paket layanan dan penawaran harga.' },
  { key: 'leads', label: 'Leads', desc: 'Pertanyaan masuk dari formulir kontak.' },
  { key: 'settings', label: 'Pengaturan', desc: 'Konfigurasi situs dalam allowlist.' },
];

export function AdminLayout() {
  const { auth, setAuth } = useAuth();
  const nav = useNavigate();
  async function logout() {
    if (auth) {
      try { await admin.logout(auth.csrf); } catch { /* session already gone */ }
    }
    setAuth(null);
    nav('/admin/login', { replace: true });
  }
  return (
    <RequireAuth>
      <div className="admin-shell">
        <aside aria-label="Menu admin">
          <div className="admin-brand brand-lockup">
            <img className="brand-mark" src="/brand/Asset%201LogoPiple.png" alt="Logo PipleSolution" width={34} height={34} />
            <span className="brand">Piple<span>Solution</span></span>
            <span className="admin-brand-chip">CMS</span>
          </div>
          <nav aria-label="Modul CMS">
            <ul>
              <li>
                <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
                  <AdminIcon name="dasbor" />Dasbor
                </NavLink>
              </li>
            </ul>
            <p className="admin-nav-label" id="admin-nav-label-content">Kelola konten</p>
            <ul aria-labelledby="admin-nav-label-content">
              {MODULES.filter((m) => (CONTENT_MODULES as readonly string[]).includes(m.key)).map((m) => (
                <li key={m.key}>
                  <NavLink to={`/admin/${m.key}`} className={({ isActive }) => (isActive ? 'active' : '')}>
                    <AdminIcon name={m.key} />{m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="admin-nav-label" id="admin-nav-label-ops">Operasional</p>
            <ul aria-labelledby="admin-nav-label-ops">
              <li>
                <NavLink to="/admin/leads" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <AdminIcon name="leads" />Leads
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <AdminIcon name="settings" />Pengaturan
                </NavLink>
              </li>
            </ul>
          </nav>
          <div className="admin-account">
            <p className="admin-account-mail">{auth?.email}</p>
            <button className="btn" onClick={logout}>Keluar</button>
            <p className="admin-aside-back"><Link to="/">← Situs publik</Link></p>
          </div>
        </aside>
        <main className="admin-main"><Outlet /></main>
      </div>
    </RequireAuth>
  );
}

const CONTENT_MODULES = ['services', 'products', 'portfolio', 'articles', 'pricing'] as const;

interface ModuleCounts {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

/** Phase 2D-R3 operations dashboard. Every figure is an existing-API COUNT:
 *  per-module/per-status totals come from `meta.total` of tiny `?status=…&
 *  per_page=1` list calls (row arrays can paginate; meta.total cannot), the
 *  lead distribution from `?state=…`, and the newest leads from the top rows of
 *  the (server-ordered newest-first) unfiltered list. Unavailable data renders
 *  as explicit error states / em-dashes — never as a fabricated zero. The
 *  7-day trend renders only when the fetched row set is provably complete
 *  (rows.length === meta.total). No activity ticker exists because audit_log
 *  has no read endpoint (follow-up documented in the phase report). */
export function Dashboard() {
  const [moduleCounts, setModuleCounts] = useState<Record<string, ModuleCounts> | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState('');
  const [leadsDist, setLeadsDist] = useState<{ new: number; inProgress: number; closed: number } | null>(null);
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null);
  const [recentLeads, setRecentLeads] = useState<ContentRow[] | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState('');
  const [trend, setTrend] = useState<{ day: string; count: number }[] | null>(null);

  async function reload() {
    // Counts group: exact per-status totals for the stacked visualization.
    setCountsLoading(true);
    setCountsError('');
    try {
      const entries = await Promise.all(CONTENT_MODULES.map(async (m) => {
        const [all, pub, drf, arc] = await Promise.all([
          admin.list(m),
          admin.list(m, '?status=published&per_page=1'),
          admin.list(m, '?status=draft&per_page=1'),
          admin.list(m, '?status=archived&per_page=1'),
        ]);
        return [m, {
          total: all.meta.total,
          published: pub.meta.total,
          draft: drf.meta.total,
          archived: arc.meta.total,
        }] as const;
      }));
      setModuleCounts(Object.fromEntries(entries));
      setCountsError('');
    } catch (err) {
      setModuleCounts(null);
      setCountsError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal memuat ringkasan modul.'));
    } finally {
      setCountsLoading(false);
    }
    // Leads group: exact distribution + newest records (+ completeness-guarded
    // daily trend from created_at dates).
    setLeadsLoading(true);
    setLeadsError('');
    try {
      const [n, p, c, all] = await Promise.all([
        admin.list('leads', '?state=new&per_page=1'),
        admin.list('leads', '?state=in_progress&per_page=1'),
        admin.list('leads', '?state=closed&per_page=1'),
        admin.list('leads', '?per_page=100'),
      ]);
      setLeadsDist({ new: n.meta.total, inProgress: p.meta.total, closed: c.meta.total });
      setLeadsTotal(all.meta.total);
      const rows = all.data;
      setRecentLeads(rows.slice(0, 5));
      const complete = rows.length === all.meta.total;
      if (complete) {
        const days: { day: string; count: number }[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const day = d.toISOString().slice(0, 10); // UTC — matches created_at
          days.push({ day, count: 0 });
        }
        for (const row of rows) {
          const day = String(row['created_at']).slice(0, 10);
          const hit = days.find((x) => x.day === day);
          if (hit) hit.count += 1;
        }
        setTrend(days);
      } else {
        setTrend(null);
      }
      setLeadsError('');
    } catch (err) {
      setLeadsDist(null);
      setLeadsTotal(null);
      setRecentLeads(null);
      setTrend(null);
      setLeadsError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal memuat ringkasan leads.'));
    } finally {
      setLeadsLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const counts = moduleCounts;
  const contentTotal = counts ? CONTENT_MODULES.reduce((n, m) => n + (counts[m]?.total ?? 0), 0) : null;
  const publishedTotal = counts ? CONTENT_MODULES.reduce((n, m) => n + (counts[m]?.published ?? 0), 0) : null;
  const draftTotal = counts ? CONTENT_MODULES.reduce((n, m) => n + (counts[m]?.draft ?? 0), 0) : null;
  const leadsNew = leadsDist ? leadsDist.new : null;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Dasbor</h1>
          <p>Kelola konten situs. Hanya konten <em>published</em> yang tampil publik; konten tanpa verifikasi tetap <em>draft</em>.</p>
        </div>
      </div>
      <div className="admin-stats">
        <article className="admin-stat">
          <span className="admin-stat-icon tone-blue"><AdminIcon name="dasbor" /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Total konten</span>
            <span className="admin-stat-value">{contentTotal ?? '—'}</span>
          </div>
          <span className="admin-stat-sub">&Sigma; 5 modul CMS</span>
        </article>
        <article className="admin-stat">
          <span className="admin-stat-icon tone-cyan"><AdminIcon name="articles" /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Published</span>
            <span className="admin-stat-value">{publishedTotal ?? '—'}</span>
          </div>
          <span className="admin-stat-sub">dari {contentTotal ?? '…'} konten</span>
        </article>
        <article className="admin-stat">
          <span className="admin-stat-icon tone-amber"><AdminIcon name="articles" /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Konsep</span>
            <span className="admin-stat-value">{draftTotal ?? '—'}</span>
          </div>
          <span className="admin-stat-sub">menunggu verifikasi</span>
        </article>
        <article className="admin-stat">
          <span className="admin-stat-icon tone-violet"><AdminIcon name="leads" /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Leads baru</span>
            <span className="admin-stat-value">{leadsNew ?? '—'}</span>
          </div>
          <span className="admin-stat-sub">dari {leadsTotal ?? '…'} total leads</span>
        </article>
      </div>
      <div className="dash-grid">
        <section className="admin-panel dash-panel">
          <div className="admin-panel-head">
            <h2 className="admin-panel-title">Status konten modul</h2>
          </div>
          {countsLoading && <p className="loading">Memuat ringkasan…</p>}
          {countsError && (
            <p role="alert" className="field-error admin-panel-error">
              {countsError}{' '}
              <button type="button" className="btn btn-small btn-ghost" onClick={() => void reload()}>Coba lagi</button>
            </p>
          )}
          {counts && !countsError && (
            <div className="dash-status">
              {CONTENT_MODULES.map((m) => {
                const c = counts[m] ?? { total: 0, published: 0, draft: 0, archived: 0 };
                const label = MODULES.find((x) => x.key === m)?.label ?? m;
                const pct = (n: number) => (c.total ? Math.round((n / c.total) * 100) : 0);
                return (
                  <div className="dash-mod" key={m}>
                    <div className="dash-mod-head">
                      <span className="dash-mod-name">{label}</span>
                      <span className="dash-mod-total">{c.total} konten</span>
                    </div>
                    <div
                      className="dash-bar"
                      role="img"
                      aria-label={`Modul ${label}: ${c.published} published, ${c.draft} draft, ${c.archived} arsip, dari total ${c.total} konten.`}
                    >
                      <span className="dash-bar-seg seg-published" style={{ width: `${pct(c.published)}%` }} />
                      <span className="dash-bar-seg seg-draft" style={{ width: `${pct(c.draft)}%` }} />
                      <span className="dash-bar-seg seg-archived" style={{ width: `${pct(c.archived)}%` }} />
                    </div>
                    <div className="dash-mod-nums">
                      <span>{c.published} published</span>
                      <span>{c.draft} draft</span>
                      <span>{c.archived} arsip</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="admin-panel dash-panel">
          <div className="admin-panel-head">
            <h2 className="admin-panel-title">Leads</h2>
            <Link className="admin-panel-link" to="/admin/leads">Kotak Leads →</Link>
          </div>
          {leadsLoading && <p className="loading">Memuat leads…</p>}
          {leadsError && (
            <p role="alert" className="field-error admin-panel-error">
              {leadsError}{' '}
              <button type="button" className="btn btn-small btn-ghost" onClick={() => void reload()}>Coba lagi</button>
            </p>
          )}
          {leadsDist && !leadsError && (
            <div className="dash-dist">
              {([
                ['new', 'baru', leadsDist.new],
                ['in_progress', 'diproses', leadsDist.inProgress],
                ['closed', 'ditutup', leadsDist.closed],
              ] as const).map(([key, hint, n]) => {
                const denom = leadsDist.new + leadsDist.inProgress + leadsDist.closed || 1;
                const width = Math.round((n / denom) * 100);
                return (
                  <div className="dash-dist-row" key={key}>
                    <span className="dash-dist-label">{key} · {hint}</span>
                    <span className="dash-dist-track">
                      <span className={`dash-dist-bar dist-${key.replace(/_/g, '-')}`} style={{ width: `${width}%` }} />
                    </span>
                    <span className="dash-dist-num">{n}</span>
                  </div>
                );
              })}
              <div className="dash-daily">
                <p className="admin-mini-title">7 hari terakhir</p>
                {trend ? (
                  <div className="dash-daily-bars">
                    {trend.map((d) => (
                      <div className="dash-daily-col" key={d.day}>
                        <span className="dash-daily-track">
                          <span className="dash-daily-bar" style={d.count ? { height: `${Math.max(12, Math.round((d.count / (trendMax(trend) || 1)) * 100))}%` } : { height: '0%' }} />
                        </span>
                        <span className="dash-daily-num">{d.count}</span>
                        <span className="dash-daily-day">{d.day.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="form-hint">Tren harian tidak ditampilkan: jumlah leads melebihi satu halaman (100). Ringkasan status di atas tetap akurat.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      <section className="admin-panel dash-recent">
        <div className="admin-panel-head">
          <h2 className="admin-panel-title">Leads terbaru</h2>
          <Link className="admin-panel-link" to="/admin/leads">Kelola leads →</Link>
        </div>
        {leadsLoading && <p className="loading">Memuat leads…</p>}
        {leadsError && !leadsLoading && (
          <p role="alert" className="field-error admin-panel-error">
            {leadsError}{' '}
            <button type="button" className="btn btn-small btn-ghost" onClick={() => void reload()}>Coba lagi</button>
          </p>
        )}
        {recentLeads && !leadsLoading && (
          recentLeads.length ? (
            <div className="table-wrap">
              <table className="data table-slim-actions">
                <thead><tr><th>Tanggal</th><th>Nama</th><th>Kebutuhan</th><th>Status</th><th className="th-actions">Aksi</th></tr></thead>
                <tbody>
                  {recentLeads.map((row) => (
                    <tr key={String(row['id'])}>
                      <td>{String(row['created_at']).slice(0, 10)}</td>
                      <td className="td-name">{String(row['name'])}</td>
                      <td>{String(row['need_category'])}</td>
                      <td>{statusBadge(row['state'])}</td>
                      <td className="td-actions">
                        <Link className="btn btn-small btn-ghost" to={`/admin/leads/${row['id']}`}>Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Belum ada leads." />
          )
        )}
      </section>
      <div className="admin-section-head">
        <h2>Tindakan cepat</h2>
      </div>
      <div className="dash-quick">
        {MODULES.map((m) => (
          <Link key={m.key} className="dash-chip" to={`/admin/${m.key}`}>
            <AdminIcon name={m.key} />
            {m.label}
          </Link>
        ))}
      </div>
    </>
  );
}

function trendMax(days: { day: string; count: number }[]): number {
  return days.reduce((max, d) => Math.max(max, d.count), 0);
}

function statusBadge(status: unknown) {
  return <span className={`badge badge-${String(status).replace(/_/g, '-')}`}>{String(status)}</span>;
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** features_id/limits_id are JSON arrays server-side; edited one-per-line. */
function jsonToLines(v: unknown): string {
  if (typeof v !== 'string' || !v) return '';
  try {
    const parsed: unknown = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string').join('\n');
  } catch { /* fall through to raw */ }
  return v;
}

function linesToJson(v: string): string | null {
  const lines = v.split('\n').map((s) => s.trim()).filter(Boolean);
  return lines.length ? JSON.stringify(lines) : null;
}

function priceLabel(row: ContentRow): string {
  if (Number(row['is_custom_quote']) === 1 || row['price_amount'] == null) return 'Konsultasi';
  const n = Number(row['price_amount']);
  return Number.isFinite(n) ? `Rp ${n.toLocaleString('id-ID')}` : '—';
}

/** Public route for a published row's module (existing routes only).
 *  Pricing has no per-item public page — it links to the pricing page. */
function publicHref(module: string, slug: string): string | null {
  if (module === 'services') return `/layanan/${slug}`;
  if (module === 'products') return `/produk/${slug}`;
  if (module === 'portfolio') return `/portofolio/${slug}`;
  if (module === 'articles') return `/artikel/${slug}`;
  if (module === 'pricing') return '/harga';
  return null;
}

const SERVICE_SLUGS = [
  'website-company-profile', 'website-development', 'mobile-development',
  'custom-systems', 'pos-systems', 'erp', 'wedding-planning',
];

interface ContentForm {
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: string;
  tagline: string;
  readiness: string;
  demoUrl: string;
  features: string;
  clientName: string;
  price: string;
  customQuote: boolean;
  serviceRef: string;
  limits: string;
}

const EMPTY_FORM: ContentForm = {
  slug: '', title: '', summary: '', body: '', status: 'draft',
  tagline: '', readiness: 'in_development', demoUrl: '', features: '',
  clientName: '', price: '', customQuote: false, serviceRef: '', limits: '',
};

/** Server `fields` keys → form input keys. */
function fieldKey(serverKey: string): string {
  const map: Record<string, string> = {
    slug: 'slug', title_id: 'title', name_id: 'title',
    summary_id: 'summary', excerpt_id: 'summary',
    body_id: 'body', description_id: 'body',
    tagline_id: 'tagline', readiness: 'readiness', demo_url: 'demoUrl',
    features_id: 'features', limits_id: 'limits', price_amount: 'price',
    service_ref: 'serviceRef', client_name: 'clientName', status: 'status',
  };
  return map[serverKey] ?? '';
}

/** Generic admin list with modal create/edit (Phase 2D-R3) and publish/unpublish/
 *  archive/delete. The permanently visible create form was replaced by a native
 *  <dialog> opened from the full-width "+ Tambah Data" band; row "Ubah" reuses
 *  the same dialog prefilled. Field editing still covers the module's writable
 *  fields (existing API only). */
export function ContentList({ module }: { module: string }) {
  const { auth } = useAuth();
  const [items, setItems] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ContentForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function refresh(sf = statusFilter, q = appliedQuery) {
    setLoading(true);
    try {
      const params: string[] = [];
      if (sf) params.push(`status=${encodeURIComponent(sf)}`);
      if (q) params.push(`q=${encodeURIComponent(q)}`);
      const res = await admin.list(module, params.length ? `?${params.join('&')}` : '');
      setItems(res.data);
      setTotal(res.meta.total);
      setError('');
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal memuat data.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { setStatusFilter(''); setQuery(''); setAppliedQuery(''); setEditing(null); setForm(EMPTY_FORM); setNotice(''); setFieldErrors({}); void refresh('', ''); }, [module]);

  function set(k: keyof ContentForm, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function fail(err: unknown, fallback: string, setE: (message: string) => void = setError) {
    const withFields = err as Error & { fields?: Record<string, string>; status?: number };
    if (withFields.fields) {
      const mapped: Record<string, string> = {};
      let rest = '';
      for (const [k, msg] of Object.entries(withFields.fields)) {
        const fk = fieldKey(k);
        if (fk) mapped[fk] = msg;
        else rest += (rest ? ' ' : '') + msg;
      }
      setFieldErrors(mapped);
      setE(rest || fallback);
    } else if (isSessionExpired(err)) {
      setFieldErrors({});
      setE(SESSION_EXPIRED);
    } else {
      setFieldErrors({});
      setE(messageForApiError(err, fallback));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || saving) return;
    setError('');
    setFieldErrors({});
    setSaveError('');
    const body: Record<string, unknown> = { slug: form.slug.trim(), status: form.status };
    if (module === 'services' || module === 'portfolio' || module === 'articles') {
      body['title_id'] = form.title.trim();
      body['body_id'] = form.body.trim() || null;
      if (module === 'services') {
        body['summary_id'] = form.summary.trim() || null;
        if (!editing) body['category'] = form.slug.trim();
      } else if (module === 'portfolio') {
        body['summary_id'] = form.summary.trim() || null;
        body['client_name'] = form.clientName.trim() || null;
      } else {
        body['excerpt_id'] = form.summary.trim() || null;
      }
    } else if (module === 'products') {
      body['name_id'] = form.title.trim();
      body['tagline_id'] = form.tagline.trim() || null;
      body['description_id'] = form.body.trim() || null;
      body['readiness'] = form.readiness;
      body['demo_url'] = form.demoUrl.trim() || null;
      body['features_id'] = linesToJson(form.features);
    } else if (module === 'pricing') {
      body['name_id'] = form.title.trim();
      if (form.customQuote) {
        body['price_amount'] = null;
        body['is_custom_quote'] = 1;
      } else if (form.price.trim() === '') {
        body['price_amount'] = null;
        body['is_custom_quote'] = 0;
      } else {
        const n = Number(form.price);
        if (!Number.isInteger(n) || n < 0) {
          setFieldErrors({ price: 'Harga harus bilangan bulat ≥ 0, atau gunakan harga khusus.' });
          return;
        }
        body['price_amount'] = n;
        body['is_custom_quote'] = 0;
      }
      body['service_ref'] = form.serviceRef.trim() || null;
      body['features_id'] = linesToJson(form.features);
      body['limits_id'] = linesToJson(form.limits);
    }
    setSaving(true);
    try {
      if (editing) {
        await admin.update(module, auth.csrf, editing, body);
        setNotice('Perubahan tersimpan.');
      } else {
        await admin.create(module, auth.csrf, body);
        setNotice(createContentNotice(form.status));
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setSaveError('');
      await refresh();
    } catch (err) {
      // Keep the modal open with in-dialog feedback: page-level alerts are
      // inert/background while the native dialog holds the a11y tree.
      fail(err, 'Penyimpanan gagal.', setSaveError);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    if (!auth) return;
    setError('');
    try {
      await admin.update(module, auth.csrf, String(id), { status });
      setNotice(statusChangeNotice(status));
      await refresh();
    } catch (err) {
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal mengubah status.'));
    }
  }

  async function remove(id: string, slug: string) {
    if (!auth) return;
    if (!window.confirm(deleteConfirmMessage(slug))) return;
    setError('');
    try {
      await admin.remove(module, auth.csrf, String(id));
      setNotice('Data dihapus (soft-delete).');
      await refresh();
    } catch (err) {
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal menghapus.'));
    }
  }

  function startEdit(row: ContentRow) {
    setEditing(String(row['id']));
    setNotice('');
    setFieldErrors({});
    setSaveError('');
    setForm({
      slug: String(row['slug'] ?? ''),
      title: String(row['title_id'] ?? row['name_id'] ?? ''),
      summary: String(row['summary_id'] ?? row['excerpt_id'] ?? ''),
      body: String(row['body_id'] ?? row['description_id'] ?? ''),
      status: String(row['status'] ?? 'draft'),
      tagline: String(row['tagline_id'] ?? ''),
      readiness: String(row['readiness'] ?? 'in_development'),
      demoUrl: String(row['demo_url'] ?? ''),
      features: jsonToLines(row['features_id']),
      clientName: String(row['client_name'] ?? ''),
      price: row['price_amount'] == null ? '' : String(row['price_amount']),
      customQuote: Number(row['is_custom_quote']) === 1,
      serviceRef: String(row['service_ref'] ?? ''),
      limits: jsonToLines(row['limits_id']),
    });
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSaveError('');
    setNotice('');
    setModalOpen(true);
  }

  /** Batal/×/Escape: close without persisting anything (R3 modal contract). */
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSaveError('');
  }

  function extraHead(): string {
    if (module === 'products') return 'Kesiapan';
    if (module === 'pricing') return 'Harga';
    if (module === 'portfolio') return 'Klien';
    if (module === 'articles') return 'Kutipan';
    return 'Kategori';
  }

  function extraCell(row: ContentRow): ReactNode {
    if (module === 'products') return statusBadge(row['readiness'] ?? 'in_development');
    if (module === 'pricing') return <span className="price">{priceLabel(row)}</span>;
    if (module === 'portfolio') return asText(row['client_name']) || '—';
    if (module === 'articles') {
      const ex = asText(row['excerpt_id']);
      return ex ? (ex.length > 48 ? `${ex.slice(0, 48)}…` : ex) : '—';
    }
    return asText(row['category']) || asText(row['slug']);
  }

  const showSummary = module === 'services' || module === 'portfolio' || module === 'articles';
  // pricing_packages has no description column; do not show a field the API
  // cannot persist (P3-14). Other modules keep their long-form body editor.
  const showBody = module !== 'pricing';

  return (
    <>
      <div className="admin-head">
        <h1>Kelola {module}</h1>
        <p role="status" className="admin-head-total">
          Total: <strong>{loading ? '…' : error ? '—' : total}</strong>
        </p>
      </div>
      {error && (
        <p role="alert" className="field-error admin-panel-error">
          {error}{' '}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => void refresh()}>Coba lagi</button>
        </p>
      )}
      {notice && <p role="status" className="success">{notice}</p>}
      <section className="admin-list admin-panel">
        <div className="admin-add-row">
          <button type="button" className="btn btn-primary admin-add-btn" onClick={openCreate}>+ Tambah Data</button>
        </div>
        <form
          aria-label="Filter konten"
          className="toolbar admin-panel-bar"
        onSubmit={(e) => { e.preventDefault(); setAppliedQuery(query); void refresh(statusFilter, query); }}
      >
        <label>Status
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); void refresh(e.target.value, appliedQuery); }}>
            <option value="">Semua</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label>Cari
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="slug atau judul…" />
        </label>
          <button type="submit" className="btn btn-small btn-primary">Cari</button>
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={() => { setQuery(''); setAppliedQuery(''); setStatusFilter(''); void refresh('', ''); }}
        >
          Reset
        </button>
        </form>
        {loading ? (
          <Loading />
        ) : error ? null : (
          <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Slug/Judul</th><th>{extraHead()}</th><th>Status</th><th className="th-actions">Aksi</th></tr></thead>
            <tbody>
              {items.map((row) => {
                const status = String(row['status']);
                const slug = String(row['slug']);
                const pubHref = status === 'published' ? publicHref(module, slug) : null;
                return (
                  <tr key={String(row['id'])}>
                    <td className="td-name">{slug} — {String(row['title_id'] ?? row['name_id'] ?? '')}</td>
                    <td>{extraCell(row)}</td>
                    <td>{statusBadge(row['status'])}</td>
                    <td className="td-actions">
                      <span className="btn-row row-actions">
                        {pubHref && (
                          <Link className="btn btn-small btn-ghost" to={pubHref} aria-label={`Lihat publik ${slug}`}>Lihat</Link>
                        )}
                        <button className="btn btn-small btn-ghost" onClick={() => startEdit(row)} aria-label={`Ubah ${slug}`}>Ubah</button>
                        {status === 'published'
                          ? <button className="btn btn-small btn-ghost" onClick={() => void setStatus(String(row['id']), 'draft')} aria-label={`Unpublish ${slug}`}>Unpublish</button>
                          : <button className="btn btn-small btn-accent-outline" onClick={() => void setStatus(String(row['id']), 'published')} aria-label={`Publish ${slug}`}>Publish</button>}
                        {status !== 'archived' && (
                          <button className="btn btn-small btn-ghost" onClick={() => void setStatus(String(row['id']), 'archived')} aria-label={`Arsipkan ${slug}`}>Arsip</button>
                        )}
                        <button className="btn btn-small btn-danger-outline" onClick={() => void remove(String(row['id']), slug)} aria-label={`Hapus ${slug}`}>Hapus</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        {!loading && !error && !items.length && <Empty text="Belum ada data." />}
      </section>
      <AdminModal open={modalOpen} title={editing ? `Ubah: ${form.slug}` : 'Tambah data'} busy={saving} onClose={closeModal}>
      <form onSubmit={save} aria-label="Formulir konten" className="admin-form admin-modal-form">
        <div className="admin-modal-body">
          {saveError && <p role="alert" className="field-error">{saveError}</p>}
        <p className="form-hint">Tanda * menandai kolom wajib. Kolom lainnya opsional.</p>
        <fieldset>
          <legend>Identitas</legend>
          <div>
            <label>Slug * <input value={form.slug} onChange={(e) => set('slug', e.target.value)} required disabled={!!editing} /></label>
            <FieldError message={fieldErrors['slug']} />
          </div>
          <div>
            <label>Judul/Nama * <input value={form.title} onChange={(e) => set('title', e.target.value)} required /></label>
            <FieldError message={fieldErrors['title']} />
          </div>
        </fieldset>
        {showBody && (
          <fieldset>
            <legend>Isi</legend>
            {showSummary && (
              <div>
                <label>Ringkasan <input value={form.summary} onChange={(e) => set('summary', e.target.value)} /></label>
                <FieldError message={fieldErrors['summary']} />
              </div>
            )}
            {module === 'products' && (
              <div>
                <label>Tagline <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={200} /></label>
                <FieldError message={fieldErrors['tagline']} />
              </div>
            )}
            <div>
              <label>Isi <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={4} /></label>
              <FieldError message={fieldErrors['body']} />
            </div>
          </fieldset>
        )}
        {module === 'products' && (
          <fieldset>
            <legend>Detail produk</legend>
            <div>
              <label>Kesiapan
                <select value={form.readiness} onChange={(e) => set('readiness', e.target.value)}>
                  <option value="in_development">Dalam pengembangan</option>
                  <option value="available">Tersedia</option>
                  <option value="coming_soon">Segera hadir</option>
                </select>
              </label>
              <p className="form-hint">Tandai Tersedia hanya sesuai konfirmasi pemilik.</p>
              <FieldError message={fieldErrors['readiness']} />
            </div>
            <div>
              <label>URL demo (kosongkan bila belum ada) <input value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} inputMode="url" placeholder="https://…" /></label>
              <p className="form-hint">URL eksternal terverifikasi saja; tanpa URL tidak ada label Live Demo.</p>
              <FieldError message={fieldErrors['demoUrl']} />
            </div>
            <div>
              <label>Fitur (satu per baris) <textarea value={form.features} onChange={(e) => set('features', e.target.value)} rows={3} /></label>
              <FieldError message={fieldErrors['features']} />
            </div>
          </fieldset>
        )}
        {module === 'portfolio' && (
          <fieldset>
            <legend>Detail studi kasus</legend>
            <div>
              <label>Nama klien (hanya bila disetujui publikasi) <input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} maxLength={160} /></label>
              <FieldError message={fieldErrors['clientName']} />
            </div>
          </fieldset>
        )}
        {module === 'pricing' && (
          <fieldset>
            <legend>Detail paket</legend>
            <div>
              <label>Harga IDR (angka, kosong = tanpa harga pasti) <input type="number" min={0} step={1} value={form.price} onChange={(e) => set('price', e.target.value)} disabled={form.customQuote} /></label>
              <FieldError message={fieldErrors['price']} />
            </div>
            <div>
              <input id="f-quote" type="checkbox" checked={form.customQuote} onChange={(e) => set('customQuote', e.target.checked)} />
              <label htmlFor="f-quote">Harga khusus — tampilkan “Hubungi via WhatsApp”</label>
            </div>
            <div>
              <label>Layanan terkait <input value={form.serviceRef} onChange={(e) => set('serviceRef', e.target.value)} list="service-ref-list" placeholder="mis. pos-systems" /></label>
              <datalist id="service-ref-list">
                {SERVICE_SLUGS.map((s) => <option key={s} value={s} />)}
              </datalist>
              <FieldError message={fieldErrors['serviceRef']} />
            </div>
            <div>
              <label>Fitur (satu per baris) <textarea value={form.features} onChange={(e) => set('features', e.target.value)} rows={3} /></label>
              <FieldError message={fieldErrors['features']} />
            </div>
            <div>
              <label>Batasan (satu per baris) <textarea value={form.limits} onChange={(e) => set('limits', e.target.value)} rows={2} /></label>
              <FieldError message={fieldErrors['limits']} />
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend>Publikasi</legend>
          <div>
            <label>Status
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <p className="form-hint">Publikasikan hanya konten yang sudah terverifikasi.</p>
            <FieldError message={fieldErrors['status']} />
          </div>
        </fieldset>
        </div>
        <div className="admin-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={saving}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </form>
      </AdminModal>
    </>
  );
}

export function ModuleRoute() {
  const { module = '' } = useParams();
  if (module === 'leads') return <LeadsInbox />;
  if (module === 'settings') return <SettingsPage />;
  return <ContentList module={module} />;
}

export function LeadsInbox() {
  const { auth } = useAuth();
  const [items, setItems] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh(f = filter) {
    setLoading(true);
    try {
      const res = await admin.list('leads', f ? `?state=${f}` : '');
      setItems(res.data);
      setTotal(res.meta.total);
      setError('');
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal memuat leads.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, [filter]);
  async function setState(id: string, state: string) {
    if (!auth) return;
    setError('');
    try {
      await admin.update('leads', auth.csrf, id, { state });
      await refresh();
    } catch (err) {
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal mengubah status lead.'));
    }
  }
  return (
    <>
      <div className="admin-head">
        <h1>Leads</h1>
        <p role="status" className="admin-head-total">
          Total: <strong>{loading ? '…' : error ? '—' : total}</strong>
        </p>
      </div>
      {error && (
        <p role="alert" className="field-error admin-panel-error">
          {error}{' '}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => void refresh()}>Coba lagi</button>
        </p>
      )}
      <section className="admin-list admin-panel">
        <div className="toolbar admin-panel-bar">
          <label htmlFor="leads-filter">Status</label>
          <select id="leads-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Semua</option>
            <option value="new">new</option>
            <option value="in_progress">in_progress</option>
            <option value="closed">closed</option>
          </select>
        </div>
        {loading ? (
          <Loading />
        ) : error ? null : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Nama</th><th>Kontak</th><th>Kebutuhan</th><th>Tanggal</th><th>Status</th><th className="th-actions">Aksi</th></tr></thead>
              <tbody>
                {items.map((row) => (
                  <tr key={String(row['id'])}>
                    <td className="td-name">{String(row['name'])}</td>
                    <td>{String(row['contact'])}</td>
                    <td>{String(row['need_category'])}</td>
                    <td>{String(row['created_at']).slice(0, 10)}</td>
                    <td>{statusBadge(row['state'])}</td>
                    <td className="td-actions">
                      <span className="btn-row row-actions">
                        <Link className="btn btn-small btn-ghost" to={`/admin/leads/${row['id']}`}>Detail</Link>
                        <button className="btn btn-small btn-accent-outline" onClick={() => void setState(String(row['id']), 'in_progress')} aria-label={`Proses ${String(row['name'])}`}>Proses</button>
                        <button className="btn btn-small btn-ghost" onClick={() => void setState(String(row['id']), 'closed')} aria-label={`Tutup ${String(row['name'])}`}>Tutup</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && !items.length && <Empty text="Belum ada leads." />}
      </section>
    </>
  );
}

export function LeadDetail() {
  const { auth } = useAuth();
  const { id = '' } = useParams();
  const [row, setRow] = useState<ContentRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setLoadError(null);
    setRow(null);
    admin.get('leads', id)
      .then((r) => { if (active) { setRow(r); setLoaded(true); } })
      .catch((err) => { if (active) { setLoadError(err); setLoaded(true); } });
    return () => { active = false; };
  }, [id, attempt]);
  async function setState(state: string) {
    if (!auth || !row) return;
    setError('');
    try {
      const updated = await admin.update('leads', auth.csrf, String(row['id']), { state });
      setRow(updated);
      setNotice(state === 'closed' ? 'Lead ditutup.' : 'Lead diproses.');
    } catch (err) {
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal mengubah status lead.'));
    }
  }
  if (!loaded) return <Loading />;
  if (loadError && isNotFound(loadError)) return <Empty text="Lead tidak ditemukan." />;
  if (loadError) {
    return <LoadFailure error={loadError} fallback="Gagal memuat detail lead." onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!row) return <Empty text="Lead tidak ditemukan." />;
  return (
    <>
      <div className="admin-head">
        <h1>Detail Lead</h1>
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
      {notice && <p role="status" className="success">{notice}</p>}
      <section className="admin-detail admin-panel">
        <dl className="facts">
          <dt>Nama</dt><dd>{String(row['name'])}</dd>
          <dt>Kontak</dt><dd>{String(row['contact'])}</dd>
          <dt>Perusahaan</dt><dd>{String(row['company'] ?? '-')}</dd>
          <dt>Kebutuhan</dt><dd>{String(row['need_category'])}</dd>
          <dt>Pesan</dt><dd>{String(row['message'])}</dd>
          <dt>Status</dt><dd>{statusBadge(row['state'])}</dd>
          <dt>Dibuat</dt><dd>{String(row['created_at'])}</dd>
          <dt>Diperbarui</dt><dd>{String(row['updated_at'])}</dd>
        </dl>
        <div className="btn-row">
          <button type="button" className="btn btn-small btn-accent-outline" onClick={() => void setState('in_progress')} aria-label={`Proses ${String(row['name'])}`}>Proses</button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => void setState('closed')} aria-label={`Tutup ${String(row['name'])}`}>Tutup</button>
        </div>
      </section>
      <p className="admin-back-link"><Link to="/admin/leads">← Kembali ke inbox</Link></p>
    </>
  );
}

/** Per-key input hints (JSON contract stays as-is; this only documents it). */
const SETTING_HINTS: Record<string, string> = {
  site_name: 'String JSON dalam tanda kutip ganda, mis. "PipleSolution".',
  seo_defaults: 'Objek JSON untuk meta default situs; simpan dalam satu baris.',
  whatsapp_number: 'String JSON berupa nomor format E.164 (contoh placeholder: "+6200000000000"). Jika tidak disetel, situs menampilkan placeholder WhatsApp yang tidak bisa diklik.',
  whatsapp_templates: 'Objek JSON berisi template pesan WhatsApp per konteks.',
};

/** R3 edit modal always offers the full allowlist union (the same 4 keys the
 *  select already exposes): stored rows show their values, unstored keys show
 *  "—" so the admin sees what is not configured yet. PUT remains an upsert. */
const SETTINGS_ALLOWLIST = ['site_name', 'seo_defaults', 'whatsapp_number', 'whatsapp_templates'] as const;

export function SettingsPage() {
  const { auth } = useAuth();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [key, setKey] = useState('site_name');
  const [value, setValue] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  async function refresh() {
    setLoading(true);
    try {
      setRows(await admin.settings());
      setError('');
    } catch (err) {
      setRows([]);
      setError(isSessionExpired(err) ? SESSION_EXPIRED : messageForApiError(err, 'Gagal memuat pengaturan.'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);
  /** R3: settings are edit-only (creating keys is impossible on the allowlist).
   *  Opens the same modal pattern as content modules: stored values prefilled,
   *  unstored keys start empty (value_json min length 1 keeps it honest). */
  function startEditSetting(editKey: string, row: ContentRow | null) {
    setKey(editKey);
    setValue(row != null ? String(row['value_json'] ?? '') : '');
    setIsPublic(row != null ? Number(row['is_public']) === 1 : false);
    setSaveError('');
    setNotice('');
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setSaveError('');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || saving) return;
    setError('');
    setNotice('');
    setSaveError('');
    setSaving(true);
    try {
      await admin.saveSetting(auth.csrf, key, value, isPublic);
      setValue('');
      setModalOpen(false);
      setNotice('Pengaturan tersimpan.');
      await refresh();
    } catch (err) {
      const withFields = err as Error & { fields?: Record<string, string>; status?: number };
      const fieldError = withFields.fields?.['key']
        ?? withFields.fields?.['value_json']
        ?? withFields.fields?.['is_public'];
      if (fieldError) setSaveError(fieldError);
      else if (isSessionExpired(err)) setSaveError(SESSION_EXPIRED);
      else setSaveError(messageForApiError(err, 'Gagal menyimpan pengaturan.'));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Pengaturan</h1>
          <p>Hanya kunci dalam allowlist yang dapat disimpan; centang publik hanya untuk data CTA publik.</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="field-error admin-panel-error">
          {error}{' '}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => void refresh()}>Coba lagi</button>
        </p>
      )}
      {notice && <p role="status" className="success">{notice}</p>}
      <section className="admin-list admin-panel">
        {loading ? (
          <Loading />
        ) : error ? null : (
          <div className="table-wrap">
            <table className="data table-settings">
              <thead><tr><th>Kunci</th><th>Nilai</th><th>Publik</th><th className="th-actions">Aksi</th></tr></thead>
              <tbody>
                {SETTINGS_ALLOWLIST.map((k) => {
                  const stored = rows.find((r) => String(r['key']) === k) ?? null;
                  return (
                    <tr key={k}>
                      <td className="td-name">{k}</td>
                      <td>{stored ? <code>{String(stored['value_json']).slice(0, 80)}</code> : <span className="mut">—</span>}</td>
                      <td>{stored ? (Number(stored['is_public']) === 1 ? 'ya' : 'tidak') : <span className="mut">—</span>}</td>
                      <td className="td-actions">
                        <button type="button" className="btn btn-small btn-ghost" onClick={() => startEditSetting(k, stored)} aria-label={`Ubah ${k}`}>Ubah</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <AdminModal open={modalOpen} title="Ubah pengaturan" busy={saving} onClose={closeModal}>
      <form onSubmit={save} aria-label="Formulir pengaturan" className="admin-form admin-modal-form">
        <div className="admin-modal-body">
          {saveError && <p role="alert" className="field-error">{saveError}</p>}
        <div>
          <label>Kunci
            <select value={key} onChange={(e) => setKey(e.target.value)}>
              <option value="site_name">site_name</option>
              <option value="seo_defaults">seo_defaults</option>
              <option value="whatsapp_number">whatsapp_number</option>
              <option value="whatsapp_templates">whatsapp_templates</option>
            </select>
          </label>
        </div>
        <div>
          <label>Nilai (JSON) <input value={value} onChange={(e) => setValue(e.target.value)} required placeholder='"PipleSolution" atau {"title_suffix":"…"}' /></label>
          <p className="form-hint">{SETTING_HINTS[key]}</p>
        </div>
        <div>
          <label><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Tampilkan ke publik (allowlist)</label>
        </div>
        </div>
        <div className="admin-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={saving}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
      </AdminModal>
    </>
  );
}
