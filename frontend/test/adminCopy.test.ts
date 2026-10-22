import { describe, expect, it } from 'vitest';
import { createContentNotice, deleteConfirmMessage, statusChangeNotice } from '../src/adminCopy';

describe('admin mutation copy matches the saved state', () => {
  it('reports the actual create status', () => {
    expect(createContentNotice('published')).toContain('dipublikasikan');
    expect(createContentNotice('draft')).toContain('sebagai draft');
    expect(createContentNotice('archived')).toContain('sebagai arsip');
  });

  it('reports status transitions accurately', () => {
    expect(statusChangeNotice('published')).toContain('dipublikasikan');
    expect(statusChangeNotice('draft')).toContain('dikembalikan ke draft');
    expect(statusChangeNotice('archived')).toContain('diarsipkan');
  });

  it('does not promise a restore path that does not exist', () => {
    const copy = deleteConfirmMessage('contoh');
    expect(copy).toContain('tidak dapat dipulihkan dari CMS ini');
    expect(copy).not.toContain('dapat dipulihkan.');
  });
});
