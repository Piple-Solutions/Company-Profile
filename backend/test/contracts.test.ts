import { describe, expect, it } from 'vitest';
import {
  serviceSlug, publishStatus, readiness, publicSettings,
  inquiryInput, loginInput, bootstrapInput, demoUrl, demoStateFor,
} from '../../shared/src/index.ts';

const validInquiry = {
  name: 'Budi Santoso',
  contact: 'budi@example.id',
  company: 'PT Contoh',
  need_category: 'website-company-profile',
  message: 'Kami membutuhkan website company profile untuk perusahaan kami.',
  consent: true,
};

describe('shared contracts (D-27 fields, allowlist, demo policy)', () => {
  it('accepts a valid inquiry', () => {
    expect(inquiryInput.safeParse(validInquiry).success).toBe(true);
  });

  it('trims before enforcing inquiry minimum lengths', () => {
    const r = inquiryInput.safeParse({ ...validInquiry, name: '  A  ', message: '          ' });
    expect(r.success).toBe(false);
    const ok = inquiryInput.safeParse({ ...validInquiry, name: '  Budi  ', contact: '  budi@example.id  ' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toMatchObject({ name: 'Budi', contact: 'budi@example.id' });
  });

  it('rejects bad email, short name/message, missing consent with ID messages', () => {
    const r = inquiryInput.safeParse({ ...validInquiry, contact: 'bukan-email', name: 'A', message: 'pendek', consent: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
      expect(fields['contact']).toMatch(/Email/);
      expect(fields['name']).toMatch(/Nama/);
      expect(fields['message']).toMatch(/Deskripsi/);
      expect(fields['consent']).toMatch(/Persetujuan/);
    }
  });

  it('rejects unknown service categories (incl. portfolio)', () => {
    for (const bad of ['portfolio', 'layanan-lain', '']) {
      expect(inquiryInput.safeParse({ ...validInquiry, need_category: bad }).success).toBe(false);
    }
    expect(serviceSlug.safeParse('portfolio').success).toBe(false);
    expect(serviceSlug.safeParse('wedding-planning').success).toBe(true);
  });

  it('accepts the 3 product slugs as need_category (documented values)', () => {
    for (const s of ['pos-kasir-otomatis', 'pos-pemesanan-penginapan', 'erp-laundry']) {
      expect(inquiryInput.safeParse({ ...validInquiry, need_category: s }).success).toBe(true);
    }
  });

  it('public settings schema is strict: unknown keys rejected', () => {
    expect(publicSettings.safeParse({ site_name: 'X', evil: 1 }).success).toBe(false);
    expect(publicSettings.safeParse({ site_name: 'PipleSolution' }).success).toBe(true);
  });

  it('demo URLs: http/https only; unsafe schemes rejected; null allowed', () => {
    expect(demoUrl.safeParse('https://demo.example.id/app').success).toBe(true);
    expect(demoUrl.safeParse('http://localhost:3000').success).toBe(true);
    expect(demoUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(demoUrl.safeParse('ftp://files.example.id/x').success).toBe(false);
    expect(demoUrl.safeParse(null).success).toBe(true);
  });

  it('demo_state never implies verified readiness from URL alone', () => {
    expect(demoStateFor('in_development', 'https://d.example.id')).toBe('request_demo');
    expect(demoStateFor('coming_soon', null)).toBe('coming_soon');
    expect(demoStateFor('available', 'https://d.example.id')).toBe('live_demo');
    expect(demoStateFor('available', null)).toBe('coming_soon');
  });

  it('status/readiness enums enforced; login/bootstrap shapes validated', () => {
    expect(publishStatus.safeParse('live').success).toBe(false);
    expect(readiness.safeParse('shipped').success).toBe(false);
    expect(loginInput.safeParse({ email: 'a@b.id', password: 'x' }).success).toBe(true);
    expect(bootstrapInput.safeParse({ email: 'a@b.id', password: 'short', bootstrap_token: 't'.repeat(32) }).success).toBe(false);
  });
});
