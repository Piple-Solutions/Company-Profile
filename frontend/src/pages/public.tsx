import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isNotFound, pub, type ContentRow } from '../api';
import { Breadcrumbs, CtaBand, Empty, LoadFailure, Loading, PageHeader, WhatsAppCta } from '../components/Layout';
import { HeroVisual, ProductGallery, ProductThumb } from '../components/ProductVisual';
import { SERVICES, serviceBySlug } from '../data';

type PublicLoad<T> = {
  status: 'loading' | 'error' | 'success';
  data: T | null;
  error: unknown;
  reload: () => void;
};

function usePublic<T>(loader: () => Promise<T>, dep = ''): PublicLoad<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<PublicLoad<T>, 'reload'>>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    let active = true;
    setState({ status: 'loading', data: null, error: null });
    Promise.resolve()
      .then(loader)
      .then(
        (data) => { if (active) setState({ status: 'success', data, error: null }); },
        (error) => { if (active) setState({ status: 'error', data: null, error }); },
      );
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, attempt]);
  return { ...state, reload: () => setAttempt((n) => n + 1) };
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Safe multi-paragraph rendering for long-form content (Phase 2D): split on
 *  blank lines into real <p> elements; single newlines become spaces. Plain
 *  text only — no HTML injection, no invented formatting. */
function Paragraphs({ text }: { text: string }) {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim().replace(/\n+/g, ' '))
    .filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <div className="prose">
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

/* ---------------- Beranda ---------------- */

/** Decorative stroke icons for the hero value highlights. Inline SVG only —
 *  no external icon dependency; hidden from assistive tech because each
 *  highlight label is fully descriptive on its own. */
function HeroValueIcon({ kind }: { kind: 'website' | 'sistem' | 'produk' }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'website' && (<>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" />
      </>)}
      {kind === 'sistem' && (<>
        <path d="M12 3l9 5-9 5-9-5 9-5Z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M3 16l9 5 9-5" />
      </>)}
      {kind === 'produk' && (<>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </>)}
    </svg>
  );
}

/** Homepage hero value highlights: three compact icon rows (no cards). */
const HERO_VALUES: { icon: 'website' | 'sistem' | 'produk'; title: string; desc: string }[] = [
  { icon: 'website', title: 'Website & Aplikasi', desc: 'Bangun kehadiran digital yang profesional.' },
  { icon: 'sistem', title: 'Sistem Bisnis', desc: 'Bantu operasional lebih terstruktur.' },
  { icon: 'produk', title: 'Produk Digital', desc: 'Solusi siap pakai untuk kebutuhan tertentu.' },
];

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Partner digital untuk bisnis yang terus bertumbuh</span>
              <h1>Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.</h1>
              <p className="lede">
                Kami membantu bisnis berkembang melalui website profesional, aplikasi
                mobile, dan sistem bisnis yang dirancang sesuai kebutuhan. Dari ide
                awal hingga solusi siap digunakan, kami bangun bersama lo.
              </p>
              <div className="cta-row">
                <Link className="btn btn-primary" to="/kontak">Diskusikan Proyek Lo</Link>
                <Link className="btn" to="/layanan">Jelajahi Layanan</Link>
              </div>
              <ul className="hero-values">
                {HERO_VALUES.map((v) => (
                  <li key={v.title}>
                    <span className="hero-value-icon" aria-hidden="true">
                      <HeroValueIcon kind={v.icon} />
                    </span>
                    <span className="hero-value-text">
                      <strong>{v.title}</strong>
                      <span>{v.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Layanan</span>
          <h2>Apa yang kami kerjakan</h2>
          <p className="lede">Tujuh kategori layanan — pilih yang sesuai kebutuhan, pelajari detailnya, lalu diskusikan dengan kami.</p>
          <div className="grid">
            {SERVICES.map((s) => (
              <article key={s.slug} className="card">
                <h3><Link to={`/layanan/${s.slug}`}>{s.title}</Link></h3>
                <p>{s.summary}</p>
                <p className="card-cta"><Link to={`/layanan/${s.slug}`}>Pelajari →</Link></p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <span className="eyebrow">Produk</span>
          <h2>Produk digital kami</h2>
          <p className="lede">Berbeda dengan jasa pengembangan: produk adalah aplikasi siap pakai dengan status ketersediaan yang jelas.</p>
          <div className="grid">
            {[
              { slug: 'pos-kasir-otomatis', title: 'POS Kasir Otomatis', desc: 'Kasir otomatis untuk operasional penjualan. [Detail TBD]' },
              { slug: 'pos-pemesanan-penginapan', title: 'POS Pemesanan Penginapan', desc: 'Pemesanan dan pengelolaan penginapan. [Detail TBD]' },
              { slug: 'erp-laundry', title: 'ERP Laundry', desc: 'Pengelolaan usaha laundry terintegrasi. [Detail TBD]' },
            ].map((p) => (
              <article key={p.slug} className="card">
                <ProductThumb slug={p.slug} />
                <h3><Link to={`/produk/${p.slug}`}>{p.title}</Link></h3>
                <p>{p.desc}</p>
                <p className="card-cta"><Link to={`/produk/${p.slug}`}>Lihat produk →</Link></p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <CtaBand
            title="Punya kebutuhan software?"
            text="Ceritakan kebutuhan Anda melalui formulir singkat — kami tindak lanjuti."
            context="layanan PipleSolution"
          />
        </div>
      </section>
    </>
  );
}

/* ---------------- Tentang ---------------- */

export function Tentang() {
  return (
    <div className="container">
      <PageHeader
        eyebrow="Tentang kami"
        title="Tentang PipleSolution"
        lede="Software house dan penyedia produk digital untuk pasar Indonesia."
      />
      <section className="section">
        <div className="tentang-grid">
          <div>
            <h2>Profil perusahaan</h2>
            <p>[Profil perusahaan, visi, dan misi TBD — akan dilengkapi pemilik.]</p>
            <h2>Yang kami tawarkan</h2>
            <ul>
              <li>Jasa pengembangan: 7 kategori layanan, dari website hingga ERP.</li>
              <li>Produk digital: POS dan ERP dengan status ketersediaan transparan.</li>
              <li>Layanan perencanaan pernikahan sebagai penawaran jasa tersendiri.</li>
            </ul>
          </div>
          <div>
            {/* Links only: every destination is an existing route with real
                content; nothing on this page is inventoried. */}
            <h2>Layanan</h2>
            <ul className="link-list">
              {SERVICES.map((s) => (
                <li key={s.slug}><Link to={`/layanan/${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
            <h2>Jelajahi</h2>
            <ul className="link-list">
              <li><Link to="/produk">Produk digital kami</Link></li>
              <li><Link to="/portofolio">Portofolio</Link></li>
              <li><Link to="/harga">Paket &amp; Harga</Link></li>
              <li><Link to="/artikel">Wawasan</Link></li>
            </ul>
          </div>
        </div>
        <CtaBand title="Ingin bekerja sama?" text="Mulai dari konsultasi singkat." context="kerja sama" />
      </section>
    </div>
  );
}

/* ---------------- Layanan ---------------- */

export function Layanan() {
  const { data, status, error, reload } = usePublic(() => pub.list('services'));
  const published = new Map(((data ?? []) as ContentRow[]).map((r) => [String(r['slug']), r]));
  return (
    <div className="container">
      <PageHeader
        eyebrow="Layanan"
        title="Layanan"
        lede="Jelajahi tujuh kategori layanan kami — setiap halaman detail menjelaskan ruang lingkup dan langkah konsultasi."
      />
      {status === 'error' && (
        <LoadFailure error={error} fallback="Ringkasan layanan dari server tidak dapat dimuat; ringkasan statis ditampilkan." onRetry={reload} />
      )}
      <div className="grid">
        {SERVICES.map((s) => {
          const row = published.get(s.slug);
          return (
            <article key={s.slug} className="card">
              <h2><Link to={`/layanan/${s.slug}`}>{s.title}</Link></h2>
              <p>{asText(row?.['summary_id']) || s.summary}</p>
              <p className="card-cta"><Link to={`/layanan/${s.slug}`}>Pelajari →</Link></p>
            </article>
          );
        })}
      </div>
      <CtaBand title="Butuh penawaran?" text="Paket dan harga diumumkan setelah disetujui pemilik." context="penawaran layanan" />
    </div>
  );
}

export function LayananDetail({ slug }: { slug: string }) {
  const info = serviceBySlug(slug);
  const { data, status, error, reload } = usePublic(() => pub.detail('services', slug), slug);
  if (!info) return <div className="container"><Empty text="Layanan tidak ditemukan." /></div>;
  const body = asText(data?.['body_id']);
  const missingPublished = status === 'error' && isNotFound(error);
  return (
    <div className="container">
      <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Layanan', to: '/layanan' }, { label: info.title }]} />
      <PageHeader eyebrow="Layanan" title={info.title} />
      {status === 'loading' && <Loading text="Memuat detail layanan…" />}
      {missingPublished && <Empty text="Detail layanan ini belum tersedia untuk publik." />}
      {status === 'error' && !missingPublished && (
        <LoadFailure error={error} fallback="Detail tambahan layanan gagal dimuat; ringkasan statis ditampilkan." onRetry={reload} />
      )}
      {body ? <Paragraphs text={body} /> : <p>{info.summary}</p>}
      <h2>Langkah konsultasi</h2>
      <ol>
        <li>Sampaikan kebutuhan melalui formulir kontak atau WhatsApp.</li>
        <li>Kami diskusikan ruang lingkup dan opsi solusi.</li>
        <li>Penawaran dan paket menyusul setelah disetujui untuk dipublikasikan.</li>
      </ol>
      <p>[Detail paket dan harga TBD — hubungi kami untuk penawaran.]</p>
      <div className="cta-row">
        <WhatsAppCta context={info.title} />
        <Link className="btn" to="/kontak">Isi Formulir</Link>
      </div>
    </div>
  );
}

/* ---------------- Produk ---------------- */

const READINESS_ID: Record<string, string> = {
  available: 'Tersedia',
  in_development: 'Dalam pengembangan',
  coming_soon: 'Segera hadir',
};

const DEMO_STATE_ID: Record<string, string> = {
  live_demo: 'Live Demo',
  request_demo: 'Minta Demo',
  coming_soon: 'Segera Hadir',
};

export function demoBadgeClass(state: string): string {
  return `badge badge-${state.replace('_', '-')}`;
}

/** Product card demo slot (D-28): external URL only; missing URL renders a
 * clear non-clickable placeholder. Never implies verified readiness. */
export function DemoSlot({ product }: { product: ContentRow }) {
  const state = String(product['demo_state'] ?? 'coming_soon');
  const url = typeof product['demo_url'] === 'string' ? product['demo_url'] : null;
  if (state === 'live_demo' && url) {
    return (
      <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer nofollow">
        {DEMO_STATE_ID[state]}
      </a>
    );
  }
  if (state === 'request_demo' && url) {
    return (
      <span className="btn-row">
        <span className="btn btn-disabled" title="Demo tersedia berdasarkan permintaan">
          {DEMO_STATE_ID[state]}
        </span>
        <WhatsAppCta context={String(product['name_id'] ?? 'produk')} />
      </span>
    );
  }
  return <span className="btn btn-disabled" title="URL demo belum tersedia">{DEMO_STATE_ID['coming_soon']}</span>;
}

function readinessBadge(p: ContentRow) {
  const r = String(p['readiness'] ?? 'in_development');
  return <span className="badge">{READINESS_ID[r] ?? r}</span>;
}

export function Produk() {
  const { data, status, error, reload } = usePublic(() => pub.list('products'));
  const rows = (data ?? []) as ContentRow[];
  return (
    <div className="container">
      <PageHeader
        eyebrow="Produk"
        title="Produk Digital"
        lede="Aplikasi siap pakai — berbeda dengan jasa pengembangan kustom. Status ketersediaan ditampilkan jujur per produk."
      />
      {status === 'loading' && <Loading text="Memuat katalog produk…" />}
      {status === 'error' && <LoadFailure error={error} fallback="Gagal memuat produk." onRetry={reload} />}
      {status === 'success' && rows.length === 0 && (
        <Empty text="Katalog produk segera hadir." />
      )}
      {status === 'success' && rows.length > 0 && (
        <div className="grid">
          {rows.map((p) => (
            <article key={String(p['slug'])} className="card">
              <ProductThumb slug={String(p['slug'])} />
              <h2><Link to={`/produk/${p['slug']}`}>{String(p['name_id'])}</Link></h2>
              <p>{readinessBadge(p)} <span className={demoBadgeClass(String(p['demo_state'] ?? ''))}>{DEMO_STATE_ID[String(p['demo_state'] ?? 'coming_soon')]}</span></p>
              <p>{asText(p['tagline_id'])}</p>
              <p className="card-cta"><DemoSlot product={p} /></p>
            </article>
          ))}
        </div>
      )}
      <CtaBand title="Butuh yang kustom?" text="Produk belum cocok? Kami juga membangun sistem sesuai kebutuhan." context="pengembangan kustom" />
    </div>
  );
}

export function ProdukDetail({ slug }: { slug: string }) {
  const { data, status, error, reload } = usePublic(() => pub.detail('products', slug), slug);
  if (status === 'loading') {
    return <div className="container"><Loading text="Memuat detail produk…" /></div>;
  }
  if (status === 'error') {
    return (
      <div className="container">
        <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Produk', to: '/produk' }, { label: 'Detail' }]} />
        {isNotFound(error)
          ? <Empty text="Produk tidak ditemukan." />
          : <LoadFailure error={error} fallback="Gagal memuat detail produk." onRetry={reload} />}
      </div>
    );
  }
  if (!data) return <div className="container"><Empty text="Produk tidak ditemukan." /></div>;

  const p = data as ContentRow;
  let features: string[] = [];
  try {
    const parsed: unknown = JSON.parse(asText(p['features_id']) || '[]');
    if (Array.isArray(parsed)) features = parsed.filter((x): x is string => typeof x === 'string');
  } catch { features = []; }
  return (
    <div className="container">
      <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Produk', to: '/produk' }, { label: String(p['name_id'] ?? 'Detail') }]} />
      <PageHeader eyebrow="Produk" title={String(p['name_id'])} lede={asText(p['tagline_id'])} />
      <p>{readinessBadge(p)} <span className={demoBadgeClass(String(p['demo_state'] ?? ''))}>{DEMO_STATE_ID[String(p['demo_state'] ?? 'coming_soon')]}</span></p>
      {asText(p['description_id']) && <p>{asText(p['description_id'])}</p>}
      <h2>Tampilan produk</h2>
      <ProductGallery slug={slug} />
      {features.length > 0 && (
        <>
          <h2>Fitur utama</h2>
          <ul>{features.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      <h2>Coba demo</h2>
      <p>Demo berjalan di lingkungan terpisah yang dikelola pemilik produk.</p>
      <DemoSlot product={p} />
      <p><WhatsAppCta context={String(p['name_id'])} /></p>
    </div>
  );
}

/* ---------------- Portfolio ---------------- */

export function Portofolio() {
  const { data, status, error, reload } = usePublic(() => pub.list('portfolio'));
  const rows = (data ?? []) as ContentRow[];
  return (
    <div className="container">
      <PageHeader
        eyebrow="Portofolio"
        title="Portofolio"
        lede="Studi kasus pilihan. Hanya proyek dengan persetujuan publikasi yang ditampilkan."
      />
      {status === 'loading' && <Loading text="Memuat portofolio…" />}
      {status === 'error' && <LoadFailure error={error} fallback="Gagal memuat portofolio." onRetry={reload} />}
      {status === 'success' && (rows.length === 0 ? (
        <Empty text="Portofolio segera hadir. Proyek yang ditampilkan menunggu persetujuan publikasi." />
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <article key={String(p['slug'])} className="card">
              <h2><Link to={`/portofolio/${p['slug']}`}>{String(p['title_id'])}</Link></h2>
              <p>{asText(p['summary_id'])}</p>
              <p className="card-cta"><Link to={`/portofolio/${p['slug']}`}>Baca studi kasus →</Link></p>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PortofolioDetail({ slug }: { slug: string }) {
  const { data, status, error, reload } = usePublic(() => pub.detail('portfolio', slug), slug);
  if (status === 'loading') {
    return <div className="container"><Loading text="Memuat studi kasus…" /></div>;
  }
  if (status === 'error') {
    return (
      <div className="container">
        <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Portofolio', to: '/portofolio' }, { label: 'Detail' }]} />
        {isNotFound(error)
          ? <Empty text="Studi kasus tidak ditemukan." />
          : <LoadFailure error={error} fallback="Gagal memuat studi kasus." onRetry={reload} />}
      </div>
    );
  }
  if (!data) return <div className="container"><Empty text="Studi kasus tidak ditemukan." /></div>;
  return (
    <div className="container">
      <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Portofolio', to: '/portofolio' }, { label: String(data['title_id'] ?? 'Detail') }]} />
      <PageHeader eyebrow="Studi kasus" title={String(data['title_id'])} lede={asText(data['summary_id'])} />
      {asText(data['body_id']) && <Paragraphs text={asText(data['body_id'])} />}
    </div>
  );
}

/* ---------------- Harga ---------------- */

export function Harga() {
  const { data, status, error, reload } = usePublic(() => pub.list('pricing'));
  const rows = (data ?? []) as ContentRow[];
  return (
    <div className="container">
      <PageHeader
        eyebrow="Paket & Harga"
        title="Harga"
        lede="Paket layanan akan diumumkan setelah disetujui pemilik. Tidak ada harga fiktif di halaman ini."
      />
      {status === 'loading' && <Loading text="Memuat paket harga…" />}
      {status === 'error' && <LoadFailure error={error} fallback="Gagal memuat paket harga." onRetry={reload} />}
      {status === 'success' && (rows.length ? (
        <>
          <div className="table-wrap">
            <table className="spec-table">
              <thead><tr><th>Paket</th><th>Harga</th><th>Aksi</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={String(p['slug'])}>
                    <td><strong>{String(p['name_id'])}</strong></td>
                    <td className="price">
                      {p['price_amount'] == null || p['is_custom_quote'] ? 'Hubungi via WhatsApp' : `Rp ${Number(p['price_amount']).toLocaleString('id-ID')}`}
                    </td>
                    <td><WhatsAppCta context={String(p['name_id'])} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CtaBand title="Butuh paket kustom?" text="Ceritakan kebutuhan Anda untuk penawaran yang sesuai." context="paket kustom" />
        </>
      ) : (
        <>
          <Empty text="Paket dan harga segera diumumkan. Sementara itu, minta penawaran langsung." />
          <div className="cta-row">
            <WhatsAppCta context="penawaran harga" />
            <Link className="btn" to="/kontak">Minta Penawaran</Link>
          </div>
        </>
      ))}
    </div>
  );
}

/* ---------------- Artikel / Wawasan ---------------- */

export function Artikel() {
  const { data, status, error, reload } = usePublic(() => pub.list('articles'));
  const rows = (data ?? []) as ContentRow[];
  return (
    <div className="container">
      <PageHeader eyebrow="Wawasan" title="Artikel" lede="Tulisan seputar layanan dan produk kami." />
      {status === 'loading' && <Loading text="Memuat artikel…" />}
      {status === 'error' && <LoadFailure error={error} fallback="Gagal memuat artikel." onRetry={reload} />}
      {status === 'success' && (rows.length ? (
        <div className="grid">
          {rows.map((a) => (
            <article key={String(a['slug'])} className="card">
              <h2><Link to={`/artikel/${a['slug']}`}>{String(a['title_id'])}</Link></h2>
              <p>{asText(a['excerpt_id'])}</p>
              <p className="card-cta"><Link to={`/artikel/${a['slug']}`}>Baca →</Link></p>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Belum ada artikel yang diterbitkan." />
      ))}
    </div>
  );
}

export function ArtikelDetail({ slug }: { slug: string }) {
  const { data, status, error, reload } = usePublic(() => pub.detail('articles', slug), slug);
  if (status === 'loading') {
    return <div className="container"><Loading text="Memuat artikel…" /></div>;
  }
  if (status === 'error') {
    return (
      <div className="container">
        <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Wawasan', to: '/artikel' }, { label: 'Detail' }]} />
        {isNotFound(error)
          ? <Empty text="Artikel tidak ditemukan." />
          : <LoadFailure error={error} fallback="Gagal memuat artikel." onRetry={reload} />}
      </div>
    );
  }
  if (!data) return <div className="container"><Empty text="Artikel tidak ditemukan." /></div>;
  return (
    <div className="container">
      <Breadcrumbs trail={[{ label: 'Beranda', to: '/' }, { label: 'Wawasan', to: '/artikel' }, { label: String(data['title_id'] ?? 'Detail') }]} />
      <PageHeader eyebrow="Wawasan" title={String(data['title_id'])} lede={asText(data['excerpt_id'])} />
      {asText(data['body_id']) && <Paragraphs text={asText(data['body_id'])} />}
    </div>
  );
}

/* ---------------- Privasi ---------------- */

export function Privasi() {
  return (
    <div className="container">
      <PageHeader eyebrow="Legal" title="Kebijakan Privasi" />
      <section>
        <h2>Data yang dikumpulkan</h2>
        <p>Formulir kontak mengumpulkan: nama, email, perusahaan (opsional), layanan yang diminati, dan deskripsi proyek, beserta tanda waktu persetujuan.</p>
        <h2>Tujuan dan akses</h2>
        <p>Data digunakan hanya untuk menindaklanjuti pertanyaan Anda dan hanya dapat diakses oleh administrator situs. Data tidak dibagikan ke pihak ketiga dan tidak digunakan untuk pemasaran otomatis.</p>
        <h2>Retensi dan penghapusan</h2>
        <p>Periode retensi [TBD — menunggu keputusan pemilik]. Anda dapat meminta penghapusan data dengan menghubungi kami. Kebijakan ini bersifat operasional sementara, bukan pernyataan kepatuhan hukum.</p>
      </section>
    </div>
  );
}
