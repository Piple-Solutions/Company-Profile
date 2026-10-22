// Static service taxonomy (7 commercial categories, D-10). Generic
// descriptions only — no packages, prices, or guarantees (TBD-02/08).
export interface ServiceInfo {
  slug: string;
  title: string;
  summary: string;
}

export const SERVICES: ServiceInfo[] = [
  { slug: 'website-company-profile', title: 'Website Company Profile', summary: 'Website profil perusahaan yang kredibel dan mudah ditemukan.' },
  { slug: 'website-development', title: 'Website Development', summary: 'Pengembangan aplikasi web sesuai kebutuhan bisnis Anda.' },
  { slug: 'mobile-development', title: 'Mobile Development', summary: 'Aplikasi mobile native dan cross-platform.' },
  { slug: 'custom-systems', title: 'Custom Systems', summary: 'Sistem kustom yang dirancang mengikuti alur kerja Anda.' },
  { slug: 'pos-systems', title: 'POS Systems', summary: 'Solusi point-of-sale untuk operasional kasir dan penjualan.' },
  { slug: 'erp', title: 'ERP', summary: 'Sistem perencanaan sumber daya perusahaan yang terintegrasi.' },
  { slug: 'wedding-planning', title: 'Wedding Planning Service', summary: 'Layanan perencanaan pernikahan. Hubungi kami untuk detail ruang lingkup.' },
];

export function serviceBySlug(slug: string): ServiceInfo | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
