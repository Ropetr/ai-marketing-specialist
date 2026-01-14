-- AI Marketing Specialist Database Schema

-- Tabela de campanhas gerenciadas
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- 'meta' ou 'google'
  account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL, -- 'active', 'paused', 'archived'
  daily_budget REAL,
  total_spent REAL DEFAULT 0,
  metadata TEXT, -- JSON com dados específicos da plataforma
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_account ON campaigns(account_id);

-- Tabela de decisões da IA
CREATE TABLE IF NOT EXISTS ai_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT,
  decision_type TEXT NOT NULL, -- 'bid_adjustment', 'pause_campaign', 'budget_reallocation', etc.
  reason TEXT NOT NULL,
  action_taken TEXT NOT NULL, -- JSON com detalhes da ação
  metrics_before TEXT, -- JSON com métricas antes da decisão
  metrics_after TEXT, -- JSON com métricas depois (preenchido posteriormente)
  success BOOLEAN,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX idx_decisions_campaign ON ai_decisions(campaign_id);
CREATE INDEX idx_decisions_type ON ai_decisions(decision_type);
CREATE INDEX idx_decisions_created ON ai_decisions(created_at);

-- Tabela de leads capturados
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  mensagem TEXT,
  produto TEXT,
  source TEXT, -- 'landing_page', 'whatsapp', 'form', etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata TEXT, -- JSON com dados adicionais
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at);

-- Tabela de métricas de performance
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  ctr REAL DEFAULT 0, -- Click-Through Rate
  cpc REAL DEFAULT 0, -- Cost Per Click
  cpl REAL DEFAULT 0, -- Cost Per Lead
  cpa REAL DEFAULT 0, -- Cost Per Acquisition
  roas REAL DEFAULT 0, -- Return on Ad Spend
  metadata TEXT, -- JSON com métricas adicionais
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX idx_metrics_campaign ON performance_metrics(campaign_id);
CREATE INDEX idx_metrics_date ON performance_metrics(date);
CREATE UNIQUE INDEX idx_metrics_campaign_date ON performance_metrics(campaign_id, date);

-- Tabela de versões de conhecimento (auto-atualização)
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL, -- 'meta', 'google_ads', 'ga4', etc.
  version TEXT NOT NULL,
  changelog TEXT, -- JSON com mudanças detectadas
  breaking_changes BOOLEAN DEFAULT 0,
  applied BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_knowledge_platform ON knowledge_versions(platform);
CREATE INDEX idx_knowledge_applied ON knowledge_versions(applied);

-- Tabela de páginas geradas
CREATE TABLE IF NOT EXISTS generated_pages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  product TEXT NOT NULL,
  template TEXT NOT NULL, -- 'landing_page', 'product_page', etc.
  html_content TEXT NOT NULL,
  css_content TEXT NOT NULL,
  js_content TEXT NOT NULL,
  performance_score REAL, -- PageSpeed score
  accessibility_score REAL,
  seo_score REAL,
  deployed BOOLEAN DEFAULT 0,
  deployed_url TEXT,
  metadata TEXT, -- JSON com configurações
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX idx_pages_campaign ON generated_pages(campaign_id);
CREATE INDEX idx_pages_deployed ON generated_pages(deployed);
CREATE INDEX idx_pages_product ON generated_pages(product);

-- Tabela de alertas
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT,
  alert_type TEXT NOT NULL, -- 'high_cpl', 'low_roas', 'budget_exceeded', etc.
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT 0,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE INDEX idx_alerts_campaign ON alerts(campaign_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at INTEGER NOT NULL
);
