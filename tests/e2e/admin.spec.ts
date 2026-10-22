import { test, expect } from '@playwright/test';

// Phase 2B admin CMS refinement regression (permanent).
// Real frontend (:5173) + backend (:8787) + throwaway e2e.db. No mocks.
// Discipline: fresh e2e.db + single worker (`--workers=1`). This file runs
// before app.spec.ts alphabetically; it creates only uniquely-slashed rows
// (`*-2b-trial`) plus one inquiry lead, so later suites are unaffected.
// Login budget: 1 API + 1 UI login in this file (limit 10/hour/IP).
const API = 'http://127.0.0.1:8787';
const BOOTSTRAP_TOKEN = process.env.E2E_BOOTSTRAP_TOKEN ?? '';
const ADMIN = { email: 'e2e-admin@piple.local', password: 'KataSandiKuat123!' };

test.beforeAll(async () => {
  const boot = await fetch(`${API}/api/v1/admin/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ADMIN, bootstrap_token: BOOTSTRAP_TOKEN }),
  });
  expect([200, 403]).toContain(boot.status);
  // One throwaway lead for the detail-action test (no auth needed).
  await fetch(`${API}/api/v1/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Admin E2E', contact: 'admine2e@example.id', company: '',
      need_category: 'erp', message: 'Butuh modul ERP untuk admin kami di sini.',
      consent: true, website: '',
    }),
  });
});

async function uiLogin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
}

test('admin modules render with hierarchy and live counts', async ({ page }) => {
  await uiLogin(page);
  // Dashboard shows live module cards (real totals, link cards).
  await expect(page.getByText('Hanya konten')).toBeVisible();
  await expect(page.locator('.admin-stat').first()).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: 'screenshots/admin-dashboard-1280.png' });
  for (const [path, heading] of [
    ['/admin/services', 'Kelola services'], ['/admin/products', 'Kelola products'],
    ['/admin/portfolio', 'Kelola portfolio'], ['/admin/articles', 'Kelola articles'],
    ['/admin/pricing', 'Kelola pricing'], ['/admin/leads', 'Leads'],
    ['/admin/settings', 'Pengaturan'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  }
  // Sidebar highlights the active module.
  await page.goto('/admin/products');
  await expect(page.locator('.admin-shell aside nav a.active')).toContainText('Produk');
});

test('products lifecycle: validation, readiness fields, publish/archive/delete', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await uiLogin(page);
  await page.goto('/admin/products');
  const form = page.getByRole('form', { name: 'Formulir konten' });
  // R3: create/edit live inside a native <dialog> behind "+ Tambah Data".
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  const focusInside = await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement) ?? false);
  expect(focusInside, 'dialog owns the focus scope when opened').toBe(true);
  // Cancel on create discards everything without persisting.
  await form.locator('input').first().fill('cancel-me-no-save');
  await form.getByRole('button', { name: 'Batal' }).click();
  await expect(page.locator('dialog.admin-modal[open]')).toHaveCount(0);
  await expect(page.locator('tbody td', { hasText: 'cancel-me-no-save' })).toHaveCount(0);
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  // Server validation surfaces as field-level feedback (uppercase slug rejected).
  await form.locator('input').first().fill('AB');
  await form.locator('input').nth(1).fill('Produk 2B Trial');
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  // Valid create with the new product fields (draft by default).
  await form.locator('input').first().fill('prd-2b-trial');
  await form.getByLabel('Tagline').fill('Tagline uji 2B');
  await form.getByLabel('Kesiapan').selectOption('coming_soon');
  await form.getByLabel(/URL demo/).fill('notaurl');
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await form.getByLabel(/URL demo/).fill('');
  await form.getByLabel(/Fitur/).fill('Fitur A\nFitur B');
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByText('tersimpan')).toBeVisible();
  await expect(page.locator('dialog.admin-modal[open]')).toHaveCount(0);
  await expect(page.locator('tbody td:first-child', { hasText: /prd-2b-trial/ })).toBeVisible();
  // Readiness triage column renders the new badge.
  await expect(page.locator('table').getByText('coming_soon')).toBeVisible();
  // Edit tagline (same dialog pattern, prefilled, "Ubah:" title/label), then
  // walk the full status lifecycle.
  await page.getByRole('button', { name: 'Ubah' }).first().click();
  await expect(page.getByRole('dialog', { name: /Ubah: prd-2b-trial/ })).toBeVisible();
  await form.getByLabel('Tagline').fill('Tagline uji 2B revisi');
  await form.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('tersimpan')).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).first().click();
  await expect(page.getByText('dipublikasikan')).toBeVisible();
  // Phase 2D: published rows expose a direct "Lihat publik" link to the
  // real public route of that module.
  await expect(page.getByRole('link', { name: /Lihat publik/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Unpublish' }).first().click();
  await expect(page.getByText('dikembalikan ke draft')).toBeVisible();
  await page.getByRole('button', { name: 'Arsip' }).first().click();
  await expect(page.getByText('diarsipkan')).toBeVisible();
  await page.getByRole('button', { name: 'Hapus' }).first().click();
  await expect(page.getByText('dihapus')).toBeVisible();
  await expect(page.locator('tbody td:first-child', { hasText: /prd-2b-trial/ })).toHaveCount(0);
  await page.screenshot({ path: 'screenshots/admin-products-1280.png' });
});

test('pricing quote, portfolio, articles, settings, lead detail action', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await uiLogin(page);
  // Pricing with custom quote renders the honest quote label. A slowed POST
  // completes exactly once even against a double submit attempt (submit is
  // disabled while saving; the forced second click is ignored by the browser).
  await page.goto('/admin/pricing');
  let pricingPosts = 0;
  // Admin module routes mount directly under /api/v1/admin/<module> (no
  // /content/ segment) — verified in the fixed debug trace.
  await page.route((u) => u.pathname.endsWith('/api/v1/admin/pricing'), async (route) => {
    if (route.request().method() === 'POST') { pricingPosts += 1; await new Promise((r) => setTimeout(r, 350)); }
    await route.continue();
  });
  let form = page.getByRole('form', { name: 'Formulir konten' });
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  await form.locator('input').first().fill('hrg-2b-trial');
  await form.locator('input').nth(1).fill('Paket 2B Trial');
  await form.getByLabel('Harga khusus').check();
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await form.locator('button[type="submit"]').click({ force: true });
  await expect(page.getByRole('cell', { name: 'Konsultasi' })).toBeVisible();
  expect(pricingPosts, 'busy modal must not issue a second create POST').toBe(1);
  await page.getByRole('button', { name: 'Hapus' }).first().click();
  // Portfolio with client name, articles with excerpt mapping.
  await page.goto('/admin/portfolio');
  form = page.getByRole('form', { name: 'Formulir konten' });
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  await form.locator('input').first().fill('port-2b-trial');
  await form.locator('input').nth(1).fill('Portofolio 2B Trial');
  await form.getByLabel(/Nama klien/).fill('Klien Uji');
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.locator('tbody td:first-child', { hasText: /port-2b-trial/ })).toBeVisible();
  await page.getByRole('button', { name: 'Hapus' }).first().click();
  await page.goto('/admin/articles');
  form = page.getByRole('form', { name: 'Formulir konten' });
  await page.getByRole('button', { name: '+ Tambah Data' }).click();
  await expect(page.getByRole('dialog', { name: 'Tambah data' })).toBeVisible();
  await form.locator('input').first().fill('art-2b-trial');
  await form.locator('input').nth(1).fill('Artikel 2B Trial');
  await form.getByLabel('Ringkasan').fill('Kutipan uji 2B');
  await form.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.locator('tbody td:first-child', { hasText: /art-2b-trial/ })).toBeVisible();
  // Excerpt round-trip proves the summary→excerpt_id mapping fix.
  await page.getByRole('button', { name: 'Ubah' }).first().click();
  await expect(page.getByRole('dialog', { name: /Ubah: art-2b-trial/ })).toBeVisible();
  await expect(form.getByLabel('Ringkasan')).toHaveValue('Kutipan uji 2B');
  await form.getByRole('button', { name: 'Batal' }).click();
  await expect(page.locator('dialog.admin-modal[open]')).toHaveCount(0);
  // Escape closes the edit dialog without persisting anything.
  await page.getByRole('button', { name: 'Ubah' }).first().click();
  await expect(page.getByRole('dialog', { name: /Ubah: art-2b-trial/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.admin-modal[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hapus' }).first().click();
  // Status filter narrows the list (existing ?status= param).
  await page.goto('/admin/services');
  await page.getByRole('form', { name: 'Filter konten' }).getByLabel('Status').selectOption('published');
  await expect(page.getByText('Total:')).toBeVisible();
  // Settings: edit-only modal (no create exists for the allowlist) with the
  // same open/fill/save/close pattern (throwaway DB value).
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: /Ubah/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Ubah pengaturan' })).toBeVisible();
  const sform = page.getByRole('form', { name: 'Formulir pengaturan' });
  await sform.getByLabel(/Nilai/).fill('"Piple 2B"');
  await sform.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('tersimpan')).toBeVisible();
  await expect(page.locator('dialog.admin-modal[open]')).toHaveCount(0);
  // Lead detail supports inline status actions.
  await page.goto('/admin/leads');
  await page.getByRole('link', { name: 'Detail' }).first().click();
  await expect(page.getByRole('heading', { name: 'Detail Lead' })).toBeVisible();
  await page.getByRole('button', { name: 'Proses' }).click();
  await expect(page.getByText('diproses')).toBeVisible();
});

test('admin mobile layout scrolls tables without page overflow', async ({ page }) => {
  await uiLogin(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/admin', '/admin/products', '/admin/leads', '/admin/settings']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `360px ${path}`).toBeLessThanOrEqual(1);
  }
});
