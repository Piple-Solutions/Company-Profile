// Accurate admin copy for mutation outcomes. Kept pure so the strings can be
// tested without a browser and reused by the CMS components.
export function createContentNotice(status: string): string {
  if (status === 'published') return 'Data baru tersimpan dan dipublikasikan.';
  if (status === 'archived') return 'Data baru tersimpan sebagai arsip.';
  return 'Data baru tersimpan sebagai draft.';
}

export function statusChangeNotice(status: string): string {
  if (status === 'published') return 'Konten dipublikasikan.';
  if (status === 'archived') return 'Konten diarsipkan.';
  return 'Konten dikembalikan ke draft.';
}

export function deleteConfirmMessage(slug: string): string {
  return `Hapus (soft-delete) "${slug}"? Data disembunyikan dari publik dan tidak dapat dipulihkan dari CMS ini.`;
}
