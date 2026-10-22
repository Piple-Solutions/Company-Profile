import { test, expect } from '@playwright/test';

// Tablet + console-hygiene regression (Phase 2A). No backend writes.
test('tablet 768px: no horizontal overflow on key pages', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const path of ['/', '/layanan', '/produk', '/harga', '/kontak']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test('no page errors or failed local requests on homepage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (!r.ok() && r.url.startsWith('http://localhost:5173')) errors.push(`${r.status()} ${r.url}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ide Besar Bisnis Lo, Kami Wujudkan Jadi Solusi Digital.', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
