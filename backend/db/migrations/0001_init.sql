-- Phase 01 migration 0001: full CMS schema (mirrors docs/DATABASE.md).
-- Forward-only. Portable SQLite/D1 subset only. Seeds stay draft-only.

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'website-company-profile','website-development','mobile-development',
    'custom-systems','pos-systems','erp','wedding-planning')),
  summary_id TEXT,
  body_id TEXT,
  icon_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_id TEXT NOT NULL,
  tagline_id TEXT,
  description_id TEXT,
  features_id TEXT,
  image_url TEXT,
  image_key TEXT,
  cta_label_id TEXT,
  cta_destination TEXT,
  demo_url TEXT,
  readiness TEXT NOT NULL DEFAULT 'in_development'
    CHECK (readiness IN ('available','in_development','coming_soon')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE portfolio_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_id TEXT NOT NULL,
  client_name TEXT,
  summary_id TEXT,
  body_id TEXT,
  cover_image_url TEXT,
  cover_image_key TEXT,
  gallery_json TEXT,
  service_ref TEXT,
  completed_on TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_id TEXT NOT NULL,
  excerpt_id TEXT,
  body_id TEXT,
  cover_image_url TEXT,
  cover_image_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE pricing_packages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  service_ref TEXT,
  name_id TEXT NOT NULL,
  price_amount INTEGER,
  price_currency TEXT NOT NULL DEFAULT 'IDR',
  is_custom_quote INTEGER NOT NULL DEFAULT 0,
  features_id TEXT,
  limits_id TEXT,
  cta_destination TEXT,
  is_highlighted INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  company TEXT,
  need_category TEXT NOT NULL,
  message TEXT NOT NULL,
  source_page TEXT,
  consent_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','in_progress','closed')),
  handled_by TEXT,
  handled_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE settings_history (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT
);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role = 'super_admin'),
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  created_at TEXT NOT NULL
);

-- Atomic single-winner bootstrap guard (portable SQLite/D1 partial index):
-- at most one active super_admin row; concurrent bootstraps collide here.
CREATE UNIQUE INDEX one_active_admin ON admin_users(role) WHERE is_active = 1;
