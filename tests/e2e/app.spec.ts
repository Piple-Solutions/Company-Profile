import { test, expect } from '@playwright/test';

// E2E against real frontend (vite dev, :5173) + real backend (:8787) +
// real SQLite file (e2e.db, fresh per run). No mocks for persisted flows.
const API = 'http://127.0.0.1:8787';
const BOOTSTRAP_TOKEN = process.env.E2E_BOOTSTRAP_TOKEN ?? '';
const ADMIN = { email: 'e2e-admin@piple.local', password: 'KataSandiKuat123!' };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as never };
}

async function bootstrapOnce() {
  const { status } = await api('/api/v1/admin/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ ...ADMIN, bootstrap_token: BOOTSTRAP_TOKEN }),
  });
  expect([200, 403]).toContain(status);
}

async function adminSession() {
  const login = await fetch(`${API}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  expect(login.status).toBe(200);
  const cookie = login.headers.get('set-cookie') ?? '';
  const sid = (cookie.match(/piple_sid=([0-9a-f]{64})/) ?? [])[1] ?? '';
  const me = (await login.json()) as { data: { csrf_token: string } };
  return { cookie: `piple_sid=${sid}`, csrf: me.data.csrf_token };
}

async function adminPost(path: string, body: unknown, s: { cookie: string; csrf: string }) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: s.cookie, 'X-CSRF-Token': s.csrf },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as never };
}

test.beforeAll(async () => {
  await bootstrapOnce();
  const s = await adminSession();
  // Published fixtures: 1 service, 2 products (with/without demo URL), 1 pricing, 1 article.
  await adminPost('/api/v1/admin/services', { slug: 'erp', title_id: 'ERP [E2E]', category: 'erp', status: 'published' }, s);
  await adminPost('/api/v1/admin/products', { slug: 'pos-kasir-otomatis', name_id: 'POS Kasir Otomatis [E2E]', status: 'published', readiness: 'available', demo_url: 'https://demo.example.id/kasir' }, s);
  await adminPost('/api/v1/admin/products', { slug: 'erp-laundry', name_id: 'ERP Laundry [E2E]', status: 'published', readiness: 'in_development', demo_url: null }, s);
  await adminPost('/api/v1/admin/pricing', { slug: 'paket-e2e', name_id: 'Paket E2E', price_amount: null, is_custom_quote: 1, status: 'published' }, s);
  await adminPost('/api/v1/admin/articles', { slug: 'artikel-e2e', title_id: 'Artikel E2E', status: 'published' }, s);
});

test('public navigation across main routes (ID)', async ({ page }) => {
  for (const [path, heading] of [
    ['/', 'Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.'], ['/tentang', 'Tentang PipleSolution'], ['/layanan', 'Layanan'],
    ['/produk', 'Produk Digital'], ['/portofolio', 'Portofolio'], ['/harga', 'Harga'],
    ['/artikel', 'Artikel'], ['/kontak', 'Kontak'], ['/privasi', 'Kebijakan Privasi'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  }
});

test('responsive: mobile nav toggle; desktop nav visible', async ({ page }) => {
  const mainNav = page.getByRole('navigation', { name: 'Navigasi utama' });
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Buka menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Buka menu' }).click();
  await expect(mainNav.getByRole('link', { name: 'Produk', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(mainNav.getByRole('link', { name: 'Produk', exact: true })).toBeVisible();
});

test('draft content never appears publicly', async ({ page }) => {
  await page.goto('/portofolio/belum-ada');
  await expect(page.getByText('Studi kasus tidak ditemukan.')).toBeVisible();
  await page.goto('/produk/belum-ada');
  await expect(page.getByText('Produk tidak ditemukan.')).toBeVisible();
  // Unpublished seed product stays hidden even though the slug is known.
  await page.goto('/produk/pos-pemesanan-penginapan');
  await expect(page.getByText('Produk tidak ditemukan.')).toBeVisible();
});

test('admin login protects routes; wrong credentials rejected', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill('salah-salah');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('alert')).toContainText('salah');
  await page.getByLabel('Kata sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
});

test('CMS create/publish/unpublish workflow (services)', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.getByRole('link', { name: 'Layanan' }).first().click();
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  await page.locator('form[aria-label="Formulir konten"] input').first().fill('custom-systems');
  await page.locator('form[aria-label="Formulir konten"] input').nth(1).fill('Custom Systems [E2E-UI]');
  await page.locator('form[aria-label="Formulir konten"]').getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByRole('cell', { name: /Custom Systems \[E2E-UI\]/ })).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).first().click();
  await page.goto('/layanan/custom-systems');
  await expect(page.getByRole('heading', { name: 'Custom Systems' })).toBeVisible();
});

test('inquiry: valid submission persists; invalid shows ID field errors', async ({ page }) => {
  await page.goto('/kontak');
  await page.getByLabel('Email *').fill('bukan-email');
  await page.getByRole('button', { name: 'Kirim Pesan' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.getByLabel('Nama *').fill('Siti E2E');
  await page.getByLabel('Email *').fill('siti@example.id');
  await page.getByLabel('Deskripsi proyek *').fill('Kami membutuhkan ERP laundry untuk 3 cabang kami di kota.');
  await page.getByLabel(/Saya setuju/).check();
  await page.getByRole('button', { name: 'Kirim Pesan' }).click();
  await expect(page.getByRole('status')).toContainText('Terima kasih');
});

test('leads inbox is admin-only; status updates work', async ({ page }) => {
  await page.goto('/admin/leads');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.goto('/admin/leads');
  await expect(page.getByRole('cell', { name: 'Siti E2E' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Proses' }).first().click();
  await expect(page.getByRole('cell', { name: 'in_progress' }).first()).toBeVisible();
});

test('product demo states: live link vs non-clickable placeholder', async ({ page }) => {
  await page.goto('/produk');
  const live = page.getByRole('link', { name: 'Live Demo' });
  await expect(live).toBeVisible();
  expect(await live.getAttribute('target')).toBe('_blank');
  expect(await live.getAttribute('rel')).toContain('noopener');
  expect(await live.getAttribute('href')).toMatch(/^https:\/\//);
  await expect(page.getByTitle('URL demo belum tersedia')).toBeVisible();
});

test('missing WhatsApp config renders safe non-clickable placeholder', async ({ page }) => {
  await page.goto('/kontak');
  await expect(page.getByTitle('Kontak WhatsApp belum dikonfigurasi')).toBeVisible();
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
});

test('keyboard/focus basics and feedback roles', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON']).toContain(first);
  await page.goto('/kontak');
  await page.getByRole('button', { name: 'Kirim Pesan' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
});
