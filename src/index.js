/**
 * AI Marketing Specialist - Cloudflare Worker
 * IA Especialista em Marketing Digital
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { AIEngine } from './ai-engine/engine.js';
import { MetaAdsIntegration } from './integrations/meta-ads.js';
import { GoogleAdsIntegration } from './integrations/google-ads.js';
import { GA4Integration } from './integrations/ga4.js';
import { PageGenerator } from './ai-engine/page-generator.js';
import { CampaignMonitor } from './ai-engine/campaign-monitor.js';
import { KnowledgeUpdater } from './knowledge/updater.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    timestamp: Date.now()
  });
});

// API Routes

/**
 * POST /api/campaign/create
 * Criar nova campanha automaticamente
 */
app.post('/api/campaign/create', async (c) => {
  try {
    const body = await c.req.json();
    const { platform, product, budget, region, objective, creatives } = body;

    // Validar input
    if (!platform || !product || !budget) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Inicializar AI Engine
    const aiEngine = new AIEngine(c.env);
    
    // Criar campanha
    const result = await aiEngine.createCampaign({
      platform,
      product,
      budget,
      region,
      objective,
      creatives
    });

    return c.json(result);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/page/generate
 * Gerar landing page otimizada
 */
app.post('/api/page/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { product, template, campaignId } = body;

    if (!product) {
      return c.json({ error: 'Product is required' }, 400);
    }

    const pageGenerator = new PageGenerator(c.env);
    const page = await pageGenerator.generate({
      product,
      template: template || 'landing_page',
      campaignId
    });

    return c.json(page);
  } catch (error) {
    console.error('Error generating page:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/lead
 * Capturar lead de formulário
 */
app.post('/api/lead', async (c) => {
  try {
    const body = await c.req.json();
    const { nome, email, telefone, mensagem, produto, campaignId, utm } = body;

    // Validar
    if (!nome || !email || !telefone) {
      return c.json({ error: 'Nome, email e telefone são obrigatórios' }, 400);
    }

    // Salvar no D1
    await c.env.DB.prepare(`
      INSERT INTO leads (campaign_id, nome, email, telefone, mensagem, produto, 
                         utm_source, utm_medium, utm_campaign, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      campaignId || null,
      nome,
      email,
      telefone,
      mensagem || '',
      produto || '',
      utm?.source || null,
      utm?.medium || null,
      utm?.campaign || null,
      Date.now()
    ).run();

    // Enviar eventos de conversão
    const metaAds = new MetaAdsIntegration(c.env);
    await metaAds.sendConversionEvent({
      eventName: 'Lead',
      email,
      phone: telefone,
      customData: { product: produto, value: 150.00 }
    });

    const ga4 = new GA4Integration(c.env);
    await ga4.sendEvent({
      name: 'generate_lead',
      params: { product: produto, value: 150.00, currency: 'BRL' }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error capturing lead:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/campaigns
 * Listar campanhas
 */
app.get('/api/campaigns', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM campaigns 
      WHERE status != 'archived'
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return c.json({ campaigns: results });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/campaign/:id/metrics
 * Obter métricas de uma campanha
 */
app.get('/api/campaign/:id/metrics', async (c) => {
  try {
    const campaignId = c.req.param('id');
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM performance_metrics
      WHERE campaign_id = ?
      ORDER BY date DESC
      LIMIT 30
    `).bind(campaignId).all();

    return c.json({ metrics: results });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/alerts
 * Listar alertas não resolvidos
 */
app.get('/api/alerts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, c.name as campaign_name
      FROM alerts a
      LEFT JOIN campaigns c ON a.campaign_id = c.id
      WHERE a.resolved = 0
      ORDER BY a.severity DESC, a.created_at DESC
      LIMIT 50
    `).all();

    return c.json({ alerts: results });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Cron Trigger Handler
 * Executado automaticamente em schedule
 */
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    console.log('Cron triggered:', event.cron);

    try {
      // A cada 6 horas: Monitorar campanhas
      if (event.cron === '0 */6 * * *') {
        const monitor = new CampaignMonitor(env);
        await monitor.monitorAll();
      }

      // Diariamente: Atualizar conhecimento
      if (event.cron === '0 0 * * *') {
        const updater = new KnowledgeUpdater(env);
        await updater.checkForUpdates();
      }

      // Semanalmente: Relatório
      if (event.cron === '0 8 * * 1') {
        const monitor = new CampaignMonitor(env);
        await monitor.generateWeeklyReport();
      }
    } catch (error) {
      console.error('Cron error:', error);
    }
  }
};
