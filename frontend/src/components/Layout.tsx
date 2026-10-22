import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { messageForApiError, pub } from '../api';

// Agreed IA direction (routes unchanged from approved sitemap).
const NAV = [
  { to: '/', label: 'Beranda' },
  { to: '/layanan', label: 'Layanan' },
  { to: '/produk', label: 'Produk' },
  { to: '/portofolio', label: 'Portfolio' },
  { to: '/harga', label: 'Paket & Harga' },
  { to: '/artikel', label: 'Wawasan' },
  { to: '/tentang', label: 'Tentang Kami' },
  { to: '/kontak', label: 'Kontak' },
];

interface WhatsAppState {
  status: 'loading' | 'ready' | 'error';
  number: string | null;
  reload: () => void;
}

const WhatsAppCtx = createContext<WhatsAppState>({ status: 'loading', number: null, reload: () => undefined });
const useWhatsApp = () => useContext(WhatsAppCtx);

let publicSettingsRequest: Promise<Record<string, unknown>> | null = null;
function loadPublicSettings(force = false): Promise<Record<string, unknown>> {
  if (!force && publicSettingsRequest) return publicSettingsRequest;
  const request = pub.settingsPublic();
  publicSettingsRequest = request;
  request.catch(() => { if (publicSettingsRequest === request) publicSettingsRequest = null; });
  return request;
}

/** One public-settings request for the whole page, shared by every CTA. */
function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WhatsAppState['status']>('loading');
  const [number, setNumber] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    setNumber(null);
    loadPublicSettings(attempt > 0)
      .then((s) => {
        if (!active) return;
        setNumber(typeof s['whatsapp_number'] === 'string' ? (s['whatsapp_number'] as string) : null);
        setStatus('ready');
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return <WhatsAppCtx.Provider value={{ status, number, reload }}>{children}</WhatsAppCtx.Provider>;
}

function waLink(number: string, context: string): string {
  const text = encodeURIComponent(`Halo PipleSolution, saya tertarik dengan ${context}.`);
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${text}`;
}

/** Inline WhatsApp CTA: working link ONLY with verified configuration,
 * otherwise a clearly-labeled disabled placeholder (D-30). */
export function WhatsAppCta({ context }: { context: string }) {
  const { status, number } = useWhatsApp();
  if (status === 'loading') {
    return <span className="btn btn-disabled" aria-busy="true">Memuat kontak WhatsApp…</span>;
  }
  if (status === 'error') {
    return (
      <span className="btn btn-disabled" title="Gagal memuat kontak WhatsApp">
        Kontak WhatsApp tidak tersedia
      </span>
    );
  }
  if (!number) {
    return (
      <span className="btn btn-disabled" title="Kontak WhatsApp belum dikonfigurasi">
        Chat WhatsApp (belum tersedia)
      </span>
    );
  }
  return (
    <a className="btn btn-primary" href={waLink(number, context)} target="_blank" rel="noopener noreferrer">
      Chat WhatsApp
    </a>
  );
}

/** Persistent WhatsApp entry point (FAB). Same placeholder rule as inline. */
export function WhatsAppFab() {
  const { status, number } = useWhatsApp();
  if (status === 'loading') return null;
  if (status === 'error') {
    return (
      <span className="wa-fab" title="Gagal memuat kontak WhatsApp">
        WhatsApp tidak tersedia
      </span>
    );
  }
  if (!number) {
    return (
      <span className="wa-fab" title="Pintasan WhatsApp belum dikonfigurasi">
        WhatsApp (belum tersedia)
      </span>
    );
  }
  return (
    <a className="wa-fab" href={waLink(number, 'layanan PipleSolution')} target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp">
      WhatsApp
    </a>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return <WhatsAppProvider><LayoutBody>{children}</LayoutBody></WhatsAppProvider>;
}

function LayoutBody({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { status: waStatus, reload: reloadWhatsApp } = useWhatsApp();
  return (
    <>
      <a className="skip-link" href="#konten">Lewati ke konten</a>
      <header className="site-header">
        <nav className="nav" aria-label="Navigasi utama">
          <Link to="/" className="brand brand-lockup">
            <img
              className="brand-mark"
              src="/brand/Asset%201LogoPiple.png"
              alt="Logo PipleSolution"
              width={32}
              height={32}
            />
            <span>Piple<span>Solution</span></span>
          </Link>
          <button className="nav-toggle" aria-expanded={open} aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
          <ul className={`nav-links${open ? ' open' : ''}`}>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {waStatus === 'error' && (
        <div className="container">
          <p role="alert" className="field-error site-status">
            Kontak WhatsApp sementara tidak dapat dimuat.{' '}
            <button type="button" className="btn btn-small btn-ghost" onClick={reloadWhatsApp}>Coba lagi</button>
          </p>
        </div>
      )}
      <main id="konten">{children}</main>
      <WhatsAppFab />
      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img
                className="brand-mark"
                src="/brand/Asset%201LogoPiple.png"
                alt="Logo PipleSolution"
                width={32}
                height={32}
                loading="lazy"
              />
              <h2>PipleSolution</h2>
            </div>
            <p>Software house dan penyedia produk digital. [Profil singkat TBD]</p>
          </div>
          <div>
            <h2>Jelajahi</h2>
            <ul>
              {NAV.slice(0, 4).map((n) => (
                <li key={n.to}><Link to={n.to}>{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Informasi</h2>
            <ul>
              {NAV.slice(4).map((n) => (
                <li key={n.to}><Link to={n.to}>{n.label}</Link></li>
              ))}
              <li><Link to="/privasi">Kebijakan Privasi</Link></li>
            </ul>
          </div>
          <div>
            <h2>Kontak</h2>
            <p>[Kontak bisnis TBD — hanya kanal terverifikasi yang ditampilkan.]</p>
            <p><Link to="/kontak">Hubungi / Konsultasi</Link></p>
          </div>
        </div>
        <div className="footer-base">
          <p>© PipleSolution. Seluruh konten TBD ditandai dan tidak diterbitkan sebagai fakta.</p>
        </div>
      </footer>
    </>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="empty" role="status">{text}</p>;
}

export function Loading({ text = 'Memuat…' }: { text?: string }) {
  return <p className="loading" role="status">{text}</p>;
}

export function LoadFailure({ error, fallback, onRetry }: {
  error: unknown;
  fallback: string;
  onRetry?: () => void;
}) {
  return (
    <p role="alert" className="field-error load-failure">
      {messageForApiError(error, fallback)}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="btn btn-small btn-ghost" onClick={onRetry}>Coba lagi</button>
        </>
      )}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error" role="alert">{message}</p>;
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
    </div>
  );
}

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <p className="crumbs">
        {trail.map((t, i) => (
          <span key={t.label}>
            {i > 0 && ' / '}
            {t.to ? <Link to={t.to}>{t.label}</Link> : <span aria-current="page">{t.label}</span>}
          </span>
        ))}
      </p>
    </nav>
  );
}

export function CtaBand({ title, text, context }: { title: string; text: string; context: string }) {
  return (
    <div className="cta-band">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="cta-row">
        <WhatsAppCta context={context} />
        <Link className="btn" to="/kontak">Minta Konsultasi</Link>
      </div>
    </div>
  );
}

