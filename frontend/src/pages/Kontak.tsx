import { useState } from 'react';
import { Link } from 'react-router-dom';
import { messageForApiError, pub } from '../api';
import { FieldError, PageHeader, WhatsAppCta } from '../components/Layout';
import { SERVICES } from '../data';
import { inquiryInput } from '@piple/shared';

const PRODUCT_OPTIONS = [
  { slug: 'pos-kasir-otomatis', title: 'POS Kasir Otomatis' },
  { slug: 'pos-pemesanan-penginapan', title: 'POS Pemesanan Penginapan' },
  { slug: 'erp-laundry', title: 'ERP Laundry' },
];

const STEPS = [
  'Isi formulir singkat di bawah — cukup nama, email, dan kebutuhan Anda.',
  'Kami menindaklanjuti melalui kontak yang Anda berikan.',
  'Tidak ada pesan otomatis atau pemasaran tanpa persetujuan.',
];

export function Kontak() {
  const [form, setForm] = useState({ name: '', contact: '', company: '', need_category: 'website-company-profile', message: '', consent: false, website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [serverError, setServerError] = useState('');

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    const parsed = inquiryInput.safeParse(form);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'value';
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }
    setStatus('sending');
    try {
      await pub.inquiry(parsed.data);
      setStatus('sent');
    } catch (err) {
      setStatus('failed');
      const withFields = err as Error & { fields?: Record<string, string> };
      if (withFields.fields) setErrors(withFields.fields);
      else setServerError(messageForApiError(err, 'Pengiriman gagal. Silakan coba lagi.'));
    }
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow="Kontak"
        title="Kontak"
        lede="Pilih jalur yang paling nyaman: WhatsApp untuk respons cepat, atau formulir untuk kebutuhan yang lebih detail."
      />
      <div className="form-grid">
        <section aria-label="Jalur kontak">
          <h2>WhatsApp</h2>
          <p><WhatsAppCta context="umum" /></p>
          <h2>Cara kerja formulir</h2>
          <ol>
            {STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="form-hint">Dengan mengirim formulir, Anda menyetujui <Link to="/privasi">Kebijakan Privasi</Link> kami.</p>
        </section>
        <section aria-label="Formulir pertanyaan">
          <h2>Formulir Pertanyaan</h2>
          {status === 'sent' ? (
            <>
              <p role="status" className="success">Terima kasih! Pesan Anda sudah kami terima dan akan kami tindak lanjuti.</p>
              <p><Link to="/">Kembali ke Beranda</Link></p>
            </>
          ) : (
            <form onSubmit={submit} noValidate aria-label="Formulir pertanyaan">
              <div className="full">
                <label htmlFor="f-name">Nama *</label>
                <input id="f-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={100} autoComplete="name" />
                <FieldError message={errors['name']} />
              </div>
              <div>
                <label htmlFor="f-contact">Email *</label>
                <input id="f-contact" type="email" value={form.contact} onChange={(e) => set('contact', e.target.value)} maxLength={160} autoComplete="email" />
                <FieldError message={errors['contact']} />
              </div>
              <div>
                <label htmlFor="f-company">Perusahaan (opsional)</label>
                <input id="f-company" value={form.company} onChange={(e) => set('company', e.target.value)} maxLength={120} autoComplete="organization" />
                <FieldError message={errors['company']} />
              </div>
              <div className="full">
                <label htmlFor="f-need">Layanan yang diminati *</label>
                <select id="f-need" value={form.need_category} onChange={(e) => set('need_category', e.target.value)}>
                  <optgroup label="Layanan">
                    {SERVICES.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Produk">
                    {PRODUCT_OPTIONS.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.title}</option>
                    ))}
                  </optgroup>
                </select>
                <FieldError message={errors['need_category']} />
              </div>
              <div className="full">
                <label htmlFor="f-message">Deskripsi proyek *</label>
                <textarea id="f-message" value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} rows={5} />
                <FieldError message={errors['message']} />
              </div>
              <div className="full">
                <input id="f-consent" type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
                <label htmlFor="f-consent">Saya setuju data saya digunakan untuk menindaklanjuti pertanyaan ini. <Link to="/privasi">Kebijakan Privasi</Link></label>
                <FieldError message={errors['consent']} />
              </div>
              <input type="text" name="website" value={form.website} onChange={(e) => set('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="honeypot" />
              {serverError && <p role="alert" className="field-error">{serverError}</p>}
              <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                {status === 'sending' ? 'Mengirim…' : status === 'failed' ? 'Coba Lagi' : 'Kirim Pesan'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

