import { test, expect } from '@playwright/test';

// C1 truthfulness regression: API failures/loading are intercepted, so this
// suite is read-only and does not require (or write to) the backend database.
const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/settings/public', (route) => route.fulfill(json({ data: {} })));
});

test('product list shows loading, then a successful empty state', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/products', async (route) => {
    await gate;
    await route.fulfill(json({ data: [] }));
  });
  await page.goto('/produk', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Memuat katalog produk…')).toBeVisible();
  release();
  await expect(page.getByText('Katalog produk segera hadir.')).toBeVisible();
});

test('product list failure is an error, not an empty catalog', async ({ page }) => {
  await page.route('**/api/v1/products', (route) => route.fulfill(json({
    error: { code: 'INTERNAL_ERROR', message_id: 'Terjadi kesalahan server.' },
  }, 500)));
  await page.goto('/produk');
  await expect(page.getByRole('alert')).toContainText('Server sedang bermasalah');
  await expect(page.getByText('Katalog produk segera hadir.')).toHaveCount(0);
});

test('detail pages distinguish 404 from server failure', async ({ page }) => {
  await page.route('**/api/v1/products/missing', (route) => route.fulfill(json({
    error: { code: 'NOT_FOUND', message_id: 'Data tidak ditemukan.' },
  }, 404)));
  await page.goto('/produk/missing');
  await expect(page.getByText('Produk tidak ditemukan.')).toBeVisible();

  await page.route('**/api/v1/products/outage', (route) => route.fulfill(json({
    error: { code: 'INTERNAL_ERROR', message_id: 'Terjadi kesalahan server.' },
  }, 500)));
  await page.goto('/produk/outage');
  await expect(page.getByRole('alert')).toContainText('Server sedang bermasalah');
  await expect(page.getByText('Produk tidak ditemukan.')).toHaveCount(0);
});

test('WhatsApp settings failure is distinct from missing configuration and retryable', async ({ page }) => {
  await page.unroute('**/api/v1/settings/public');
  await page.route('**/api/v1/settings/public', (route) => route.fulfill(json({
    error: { code: 'INTERNAL_ERROR', message_id: 'Terjadi kesalahan server.' },
  }, 500)));
  await page.goto('/kontak');
  await expect(page.getByRole('alert')).toContainText('Kontak WhatsApp sementara tidak dapat dimuat');
  await expect(page.getByTitle('Gagal memuat kontak WhatsApp').first()).toBeVisible();
  await expect(page.getByText('Chat WhatsApp (belum tersedia)')).toHaveCount(0);

  await page.unroute('**/api/v1/settings/public');
  await page.route('**/api/v1/settings/public', (route) => route.fulfill(json({ data: { whatsapp_number: '+6281234567890' } })));
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByRole('link', { name: 'Chat WhatsApp' }).first()).toBeVisible();
});

test('one public-settings request serves every WhatsApp CTA', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/v1/settings/public', (route) => {
    requests += 1;
    return route.fulfill(json({ data: { whatsapp_number: '+6281234567890' } }));
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Chat WhatsApp' }).first()).toBeVisible();
  expect(requests).toBe(1);
});

test('admin boot outage is an error with retry, not a login redirect', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (route) => route.fulfill(json({
    error: { code: 'INTERNAL_ERROR', message_id: 'Terjadi kesalahan server.' },
  }, 500)));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin tidak dapat dimuat' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Masuk Admin' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
});

test('admin login maps rate limits honestly', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (route) => route.fulfill(json({
    error: { code: 'UNAUTHENTICATED', message_id: 'Sesi tidak valid.' },
  }, 401)));
  await page.route('**/api/v1/admin/auth/login', (route) => route.fulfill(json({
    error: { code: 'RATE_LIMITED', message_id: 'Terlalu banyak percobaan.' },
  }, 429)));
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('admin@example.id');
  await page.getByLabel('Kata sandi').fill('secret');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('alert')).toContainText('Terlalu banyak percobaan masuk');
  await expect(page.getByText('Email atau kata sandi salah.')).toHaveCount(0);
});

test('admin list 401 is a session-expired error with retry, not an empty list', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (route) => route.fulfill(json({
    data: { email: 'admin@example.id', role: 'super_admin', csrf_token: 'csrf' },
  })));
  await page.route('**/api/v1/admin/services', (route) => route.fulfill(json({
    error: { code: 'UNAUTHENTICATED', message_id: 'Sesi tidak valid.' },
  }, 401)));
  await page.goto('/admin/services');
  await expect(page.getByRole('alert')).toContainText('Sesi berakhir');
  await expect(page.getByText('Belum ada data.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
});

test('admin settings failure does not render an empty configured table', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (route) => route.fulfill(json({
    data: { email: 'admin@example.id', role: 'super_admin', csrf_token: 'csrf' },
  })));
  await page.route('**/api/v1/admin/settings', (route) => route.fulfill(json({
    error: { code: 'INTERNAL_ERROR', message_id: 'Terjadi kesalahan server.' },
  }, 500)));
  await page.goto('/admin/settings');
  await expect(page.getByRole('alert')).toContainText('Server sedang bermasalah');
  await expect(page.getByRole('cell', { name: 'site_name' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
});
