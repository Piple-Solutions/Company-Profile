import { test, expect } from '@playwright/test';

// Phase 2A follow-up regression: public product imagery stays intact.
// Real frontend (:5173) + backend (:8787) + throwaway e2e.db. No mocks.
// Discipline: fresh e2e.db + single worker (`--workers=1`); this file runs
// after app.spec.ts alphabetically and publishes `pos-pemesanan-penginapan`
// as a best-effort fixture, so keep single-worker ordering.
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

test.beforeAll(async () => {
  // Best-effort fixtures (rows may already exist from an earlier run).
  await api('/api/v1/admin/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ ...ADMIN, bootstrap_token: BOOTSTRAP_TOKEN }),
  });
  const s = await adminSession();
  const post = (p: string, b: unknown) =>
    fetch(`${API}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: s.cookie, 'X-CSRF-Token': s.csrf },
      body: JSON.stringify(b),
    }).catch(() => null);
  await post('/api/v1/admin/products', { slug: 'pos-kasir-otomatis', name_id: 'POS Kasir Otomatis [E2E]', status: 'published', readiness: 'available', demo_url: 'https://demo.example.id/kasir' });
  await post('/api/v1/admin/products', { slug: 'pos-pemesanan-penginapan', name_id: 'POS Pemesanan Penginapan [E2E]', status: 'published', readiness: 'available', demo_url: null });
  await post('/api/v1/admin/products', { slug: 'erp-laundry', name_id: 'ERP Laundry [E2E]', status: 'published', readiness: 'in_development', demo_url: null });
});

test('followup: images load, contain-fit, no placeholders, no TBD tagline', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e}`));
  page.on('response', (r) => {
    const url = r.url();
    // 304 Not Modified is a healthy cache revalidation, not a failure.
    if (!r.ok() && r.status() !== 304 && url.startsWith('http://localhost:5173')) problems.push(`${r.status()} ${url}`);
  });

  await page.goto('/');
  // Phase 2A hero-content polish: promotional headline is now the h1.
  await expect(page.getByRole('heading', { name: 'Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.', level: 1 })).toBeVisible();
  // Dev-only tagline label removed from rendered page.
  await expect(page.getByText('[Tagline TBD]')).toHaveCount(0);
  // Real brand logo used in header.
  await expect(page.getByAltText('Logo PipleSolution').first()).toBeVisible();
  // Owner-supplied hero banner: single coherent image, intrinsic dims, contain-fit.
  const banner = page.locator('.hero-banner-frame img');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('src', /hero-banner\.jpg/);
  await expect(banner).toHaveAttribute('width', '720');
  await expect(banner).toHaveAttribute('height', '900');
  const bannerFit = await banner.evaluate((el) => getComputedStyle(el).objectFit);
  expect(bannerFit).toBe('contain');
  const bannerBox = await banner.evaluate((el) => {
    const img = el as HTMLImageElement;
    const r = img.getBoundingClientRect();
    return { ok: img.complete && img.naturalWidth === 720 && img.naturalHeight === 900, w: r.width, h: r.height, x: r.x };
  });
  expect(bannerBox.ok, 'hero banner failed to load at native 720x900').toBe(true);
  // Old overlapping POS composition fully removed from the hero only.
  await expect(page.locator('.hero-visual')).toHaveCount(0);
  await expect(page.locator('.browser')).toHaveCount(0);
  await expect(page.locator('.hero-float')).toHaveCount(0);
  await expect(page.locator('.browser-shot')).toHaveCount(0);
  await expect(page.getByText('Tangkapan layar produk asli.')).toHaveCount(0);
  // Hero CTA hierarchy (hero-scoped: the page also has a bottom CTA band
  // with its own consult link): primary consult route + secondary services
  // link; the unconfigured WhatsApp placeholder is not the greeting action.
  const heroPrimary = page.locator('.hero .cta-row a.btn-primary');
  await expect(heroPrimary).toHaveText('Diskusikan Proyek Lo');
  await expect(heroPrimary).toHaveAttribute('href', '/kontak');
  await expect(heroPrimary).toBeVisible();
  const heroSecondary = page.locator('.hero .cta-row a:not(.btn-primary)');
  await expect(heroSecondary).toHaveText('Jelajahi Layanan');
  await expect(heroSecondary).toHaveAttribute('href', '/layanan');
  await expect(heroSecondary).toBeVisible();
  await expect(page.locator('.hero .cta-row .btn-disabled')).toHaveCount(0);
  // Homepage product strip still shows original thumbs (data-driven, untouched).
  expect(await page.locator('.card .shot-frame img').count()).toBeGreaterThanOrEqual(3);

  for (const path of ['/', '/produk', '/produk/pos-kasir-otomatis', '/produk/pos-pemesanan-penginapan', '/produk/erp-laundry']) {
    await page.goto(path);
    // Trigger lazy loads, then require every image to finish.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    try {
      await page.waitForFunction(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.length > 0 && imgs.every((el) => (el as HTMLImageElement).complete);
      }, undefined, { timeout: 15000 });
    } catch {
      const pending = await page.$$eval('img', (els) =>
        els.map((el) => {
          const img = el as HTMLImageElement;
          return `${img.currentSrc || img.src} complete=${img.complete} natural=${img.naturalWidth}x${img.naturalHeight}`;
        }),
      );
      throw new Error(`${path} images never completed: ${pending.join(' | ')}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const imgs = await page.$$eval('img', (els) =>
      els.map((el) => {
        const img = el as HTMLImageElement;
        const cs = getComputedStyle(img);
        return {
          src: img.currentSrc || img.src,
          ok: img.complete && img.naturalWidth > 0,
          natural: `${img.naturalWidth}x${img.naturalHeight}`,
          fit: cs.objectFit,
          w: img.width,
          h: img.height,
        };
      }),
    );
    for (const im of imgs) {
      expect(im.ok, `${path} :: ${im.src} failed to load`).toBe(true);
    }
    // Screenshot frames must use non-cropping presentation.
    const fits = await page.$$eval('.shot-frame img', (els) =>
      els.map((el) => getComputedStyle(el).objectFit),
    );
    for (const f of fits) expect(f).toBe('contain');
  }

  // ERP placeholder fully replaced: no page renders it anymore.
  for (const path of ['/', '/produk', '/produk/pos-kasir-otomatis', '/produk/pos-pemesanan-penginapan', '/produk/erp-laundry']) {
    await page.goto(path);
    await expect(page.getByText('Visual produk segera hadir')).toHaveCount(0);
  }

  // Gallery counts follow the asset plan (kasir 4, penginapan 3, laundry 4).
  await page.goto('/produk/pos-kasir-otomatis');
  expect(await page.locator('.gallery-grid .shot-frame img').count()).toBe(4);
  await page.goto('/produk/pos-pemesanan-penginapan');
  expect(await page.locator('.gallery-grid .shot-frame img').count()).toBe(3);
  await page.goto('/produk/erp-laundry');
  expect(await page.locator('.gallery-grid .shot-frame img').count()).toBe(4);

  expect(problems).toEqual([]);
});

test('followup: responsive 360/390/768/1024/1280, no overflow (incl. Tentang/Harga/Portofolio, Phase 2D)', async ({ page }) => {
  for (const width of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/produk', '/produk/pos-kasir-otomatis', '/produk/erp-laundry', '/tentang', '/portofolio', '/harga']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width}px ${path}`).toBeLessThanOrEqual(1);
    }
    // Hero banner stays fully visible, undistorted, inside the viewport at every width.
    await page.goto('/');
    const banner = page.locator('.hero-banner-frame img');
    await expect(banner).toBeVisible();
    const info = await banner.evaluate((el) => {
      const img = el as HTMLImageElement;
      const r = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      return { ok: img.complete && img.naturalWidth === 720 && img.naturalHeight === 900, fit: cs.objectFit, x: r.x, right: r.right, w: r.width, vw: document.documentElement.clientWidth };
    });
    expect(info.ok, `${width}px banner failed to load`).toBe(true);
    expect(info.fit).toBe('contain');
    expect(info.x, `${width}px banner left overflow`).toBeGreaterThanOrEqual(-1);
    expect(info.right, `${width}px banner right overflow`).toBeLessThanOrEqual(info.vw + 1);
    // CTA buttons + nav stay functional at every width.
    await expect(page.locator('.hero').getByRole('link', { name: 'Jelajahi Layanan' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.screenshot({ path: 'screenshots/followup-home-1280.png' });
  await page.goto('/produk/pos-kasir-otomatis');
  await page.screenshot({ path: 'screenshots/followup-produk-kasir-1280.png' });
  await page.goto('/produk/erp-laundry');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.length > 0 && imgs.every((el) => (el as HTMLImageElement).complete);
  }, undefined, { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'screenshots/followup-produk-erp-1280.png' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.screenshot({ path: 'screenshots/followup-home-360.png' });
});

// Phase 2A follow-up (hero content + balance): locks the refined homepage
// hero — promotional copy, compact value highlights (not cards), two-step
// CTA hierarchy over the working contact route, and the reduced banner cap
// with the preserved 720:900 contain presentation.
test('followup: hero copy, value highlights, CTA hierarchy, banner scale', async ({ page }) => {
  await page.goto('/');
  // Left copy: promotional eyebrow + headline + supporting paragraph.
  await expect(page.locator('.hero .eyebrow')).toHaveText('Partner digital untuk bisnis yang terus bertumbuh');
  await expect(page.getByRole('heading', { name: 'Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.', level: 1 })).toBeVisible();
  await expect(page.locator('.hero .lede')).toContainText('kami bangun bersama lo');
  // Compact value highlights: exactly three, each with an icon, a strong
  // label and a one-line description; old card-style points are gone.
  const values = page.locator('.hero-values li');
  await expect(values).toHaveCount(3);
  for (const title of ['Website & Aplikasi', 'Sistem Bisnis', 'Produk Digital']) {
    await expect(values.filter({ hasText: title })).toHaveCount(1);
  }
  expect(await page.locator('.hero-values .hero-value-icon svg').count()).toBe(3);
  for (const v of await values.all()) {
    await expect(v.locator('.hero-value-icon')).toBeVisible();
    await expect(v.locator('.hero-value-text strong')).not.toBeEmpty();
    await expect(v.locator('.hero-value-text > span').last()).not.toBeEmpty();
  }
  await expect(page.locator('.hero .hero-points')).toHaveCount(0);
  // Two-step CTA hierarchy inside the hero: primary → /kontak, secondary →
  // /layanan, and no disabled WhatsApp placeholder as the opening action.
  const heroPrimary = page.locator('.hero .cta-row a.btn-primary');
  await expect(heroPrimary).toHaveText('Diskusikan Proyek Lo');
  await expect(heroPrimary).toHaveAttribute('href', '/kontak');
  await expect(page.locator('.hero .cta-row')).toHaveCount(1);
  await expect(page.locator('.hero .cta-row .btn-disabled')).toHaveCount(0);
  // Banner scale: reduced cap (26rem), intrinsic 720×900, undistorted
  // (frame keeps the 0.8 aspect ratio via aspect-ratio + contain).
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const banner = page.locator('.hero-banner-frame img');
  await expect(banner).toBeVisible();
  const box = await banner.evaluate((el) => {
    const r = (el as HTMLImageElement).getBoundingClientRect();
    return { ok: (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth === 720, w: r.width, h: r.height };
  });
  expect(box.ok, 'hero banner did not load at native width').toBe(true);
  expect(box.w, 'banner cap should be ≤ 26rem (416px) at 1280px').toBeLessThanOrEqual(26 * 16 + 2);
  expect(Math.abs(box.w / box.h - 720 / 900), 'banner aspect ratio distorted').toBeLessThan(0.01);
  await page.screenshot({ path: 'screenshots/hero-balance-1280.png' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.screenshot({ path: 'screenshots/hero-balance-360.png' });
});
