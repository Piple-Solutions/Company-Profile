import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import {
  Home, Tentang, Layanan, LayananDetail, Produk, ProdukDetail,
  Portofolio, PortofolioDetail, Harga, Artikel, ArtikelDetail, Privasi,
} from './pages/public';
import { Kontak } from './pages/Kontak';
import { AdminProvider, AdminLayout, Login, Dashboard, ModuleRoute, LeadDetail } from './admin/cms';

function SlugRoute({ kind }: { kind: 'layanan' | 'produk' | 'portofolio' | 'artikel' }) {
  const { slug = '' } = useParams();
  if (kind === 'layanan') return <LayananDetail slug={slug} />;
  if (kind === 'produk') return <ProdukDetail slug={slug} />;
  if (kind === 'portofolio') return <PortofolioDetail slug={slug} />;
  return <ArtikelDetail slug={slug} />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminProvider><Login /></AdminProvider>} />
        <Route path="/admin/*" element={<AdminProvider><AdminLayout /></AdminProvider>}>
          <Route index element={<Dashboard />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path=":module" element={<ModuleRoute />} />
        </Route>
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tentang" element={<Tentang />} />
                <Route path="/layanan" element={<Layanan />} />
                <Route path="/layanan/:slug" element={<SlugRoute kind="layanan" />} />
                <Route path="/produk" element={<Produk />} />
                <Route path="/produk/:slug" element={<SlugRoute kind="produk" />} />
                <Route path="/portofolio" element={<Portofolio />} />
                <Route path="/portofolio/:slug" element={<SlugRoute kind="portofolio" />} />
                <Route path="/harga" element={<Harga />} />
                <Route path="/artikel" element={<Artikel />} />
                <Route path="/artikel/:slug" element={<SlugRoute kind="artikel" />} />
                <Route path="/kontak" element={<Kontak />} />
                <Route path="/privasi" element={<Privasi />} />
                <Route path="*" element={<p>Halaman tidak ditemukan.</p>} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

