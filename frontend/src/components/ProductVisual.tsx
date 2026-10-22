// Public product visuals (Phase 2A follow-up + ERP integration). Real
// owner-supplied screenshots only — no fabricated screens. `ShotPlaceholder`
// remains as a fallback for slugs without supplied shots (never a broken
// <img>).
//
// Conventions established here:
// - Public copies live in `frontend/public/produk/` (clean slug names).
// - Runtime copies live with the frontend; non-runtime source references are not part of this repository.
// - Every shot is presented with `object-fit: contain` (no crop, no stretch)
//   plus native width/height attributes (CLS hints).
// - Alt text describes the visible screen only; no invented functionality.

export interface ProductShotDef {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
}

export const PRODUCT_SHOTS: Record<string, ProductShotDef[]> = {
  'pos-kasir-otomatis': [
    {
      src: '/produk/pos-kasir-belanja.png',
      alt: 'Tampilan pemesanan POS Kasir Otomatis: kolom nama warung, daftar produk, dan ringkasan keranjang belanja',
      width: 1891,
      height: 900,
      caption: 'Layar pemesanan — daftar produk dan keranjang',
    },
    {
      src: '/produk/pos-kasir-beranda.png',
      alt: 'Tampilan awal POS Kasir Otomatis: pengantar belanja dan panduan Cara Belanja empat langkah',
      width: 1870,
      height: 899,
      caption: 'Layar awal — pengantar dan panduan belanja',
    },
    {
      src: '/produk/pos-kasir-dashboard.png',
      alt: 'Dasbor admin POS Kasir Otomatis: ringkasan produk, pesanan hari ini, produk terbaru, dan pesanan terbaru',
      width: 1883,
      height: 894,
      caption: 'Dasbor admin — ringkasan toko dan aktivitas',
    },
    {
      src: '/produk/pos-kasir-detail-pesanan.png',
      alt: 'Detail pesanan POS Kasir Otomatis: informasi pesanan, daftar item, dan ringkasan pembayaran',
      width: 1914,
      height: 902,
      caption: 'Detail pesanan — item dan ringkasan pembayaran',
    },
  ],
  'pos-pemesanan-penginapan': [
    {
      src: '/produk/pos-penginapan-dashboard.jpg',
      alt: 'Dasbor POS Pemesanan Penginapan: ringkasan reservasi, okupansi, invoice, grafik pendapatan, dan reservasi terakhir',
      width: 1908,
      height: 1463,
      caption: 'Dasbor — ringkasan operasional properti',
    },
    {
      src: '/produk/pos-penginapan-kamar.jpg',
      alt: 'Manajemen kamar POS Pemesanan Penginapan: denah lantai dan daftar kamar beserta statusnya',
      width: 1908,
      height: 973,
      caption: 'Daftar kamar — denah lantai dan status kamar',
    },
    {
      src: '/produk/pos-penginapan-keuangan.jpg',
      alt: 'Laporan penjualan dan pendapatan POS Pemesanan Penginapan: ringkasan total, pendapatan per sumber, dan riwayat transaksi',
      width: 1908,
      height: 1615,
      caption: 'Keuangan — penjualan, pendapatan, dan riwayat transaksi',
    },
  ],
  'erp-laundry': [
    {
      src: '/produk/erp-laundry-dashboard.png',
      alt: 'Dasbor ERP Laundry: ringkasan pendapatan dan pesanan hari ini, grafik pendapatan 7 hari, layanan terlaris, antrean tahap, dan panel perhatian',
      width: 1920,
      height: 1080,
      caption: 'Dasbor — ringkasan operasional laundry',
    },
    {
      src: '/produk/erp-laundry-pesanan.png',
      alt: 'Daftar pesanan ERP Laundry: tabel nomor pesanan, pelanggan, total, status, dan pembayaran dengan pencarian dan filter status',
      width: 1920,
      height: 1080,
      caption: 'Pesanan — daftar, status, dan pembayaran',
    },
    {
      src: '/produk/erp-laundry-inventaris.png',
      alt: 'Inventaris ERP Laundry: tabel barang, stok, status ketersediaan, dan aksi pengelolaan stok',
      width: 1920,
      height: 1080,
      caption: 'Inventaris — stok dan status ketersediaan',
    },
    {
      src: '/produk/erp-laundry-laporan.png',
      alt: 'Laporan ERP Laundry: filter tanggal, ringkasan pendapatan dan pengeluaran, tren harian, dan pendapatan per metode pembayaran',
      width: 1920,
      height: 1080,
      caption: 'Laporan — pendapatan, tren, dan rekapitulasi',
    },
  ],
};

export function shotsFor(slug: string): ProductShotDef[] {
  return PRODUCT_SHOTS[slug] ?? [];
}

export function ProductShot({ shot, eager }: { shot: ProductShotDef; eager?: boolean }) {
  return (
    <figure className="shot">
      <span className="shot-frame">
        <img
          src={shot.src}
          alt={shot.alt}
          width={shot.width}
          height={shot.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          {...(eager ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
        />
      </span>
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}

/** Honest non-deceptive placeholder for products without supplied shots. */
export function ShotPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className={`shot-placeholder${compact ? ' shot-placeholder-compact' : ''}`} role="img" aria-label="Visual produk segera hadir">
      <strong>Visual produk segera hadir</strong>
      <span>Tangkapan layar akan ditampilkan setelah tersedia dari pemilik.</span>
    </div>
  );
}

/** Card thumbnail: primary shot, or honest placeholder (fallback). */
export function ProductThumb({ slug, eager }: { slug: string; eager?: boolean }) {
  const shots = shotsFor(slug);
  if (shots.length === 0) return <ShotPlaceholder compact />;
  const first = shots[0]!;
  return <ProductShot shot={first} eager={eager} />;
}

/** Detail-page gallery: all supplied views for the slug, else placeholder. */
export function ProductGallery({ slug }: { slug: string }) {
  const shots = shotsFor(slug);
  if (shots.length === 0) {
    return (
      <>
        <ShotPlaceholder />
        <p className="form-hint">Galeri tampilan akan dilengkapi setelah screenshot produk tersedia.</p>
      </>
    );
  }
  return (
    <div className="gallery-grid">
      {shots.map((s) => (
        <ProductShot key={s.src} shot={s} />
      ))}
    </div>
  );
}

/** Homepage hero banner: single owner-supplied company-profile image.
 *  Rendered as one coherent <img> (no text recreation/translation/overlay,
 *  no cropping — contain-fit preserves the full 720x900 banner). Product
 *  screenshots stay in their strip/gallery/registry entries, untouched. */
export function HeroVisual() {
  return (
    <div className="hero-banner" aria-label="Banner profil perusahaan PipleSolution">
      <figure className="hero-banner-figure">
        <span className="hero-banner-frame">
          <img
            src="/brand/hero-banner.jpg"
            alt="Banner PipleSolution — Your Ideas, Our Digital Solutions"
            width={720}
            height={900}
            loading="eager"
            decoding="async"
            {...({ fetchpriority: 'high' } as Record<string, string>)}
          />
        </span>
      </figure>
    </div>
  );
}
