/**
 * Campaign Monitor
 * Monitora campanhas e toma decisões automaticamente
 */

import { MetaAdsIntegration } from '../integrations/meta-ads.js';
import { GoogleAdsIntegration } from '../integrations/google-ads.js';
import { AIEngine } from './engine.js';
import { calculateMetrics } from '../utils/helpers.js';

export class CampaignMonitor {
  constructor(env) {
    this.env = env;
    this.metaAds = new MetaAdsIntegration(env);
    this.googleAds = new GoogleAdsIntegration(env);
    this.aiEngine = new AIEngine(env);
  }

  /**
   * Monitorar todas as campanhas ativas
   */
  async monitorAll() {
    console.log('Starting campaign monitoring...');

    try {
      // Buscar campanhas ativas
      const { results: campaigns } = await this.env.DB.prepare(`
        SELECT * FROM campaigns 
        WHERE status = 'active'
      `).all();

      console.log(`Monitoring ${campaigns.length} active campaigns`);

      for (const campaign of campaigns) {
        await this.monitorCampaign(campaign);
      }

      console.log('Campaign monitoring completed');
    } catch (error) {
      console.error('Error monitoring campaigns:', error);
    }
  }

  /**
   * Monitorar campanha específica
   */
  async monitorCampaign(campaign) {
    console.log(`Monitoring campaign: ${campaign.name}`);

    try {
      // Obter métricas da plataforma
      let platformMetrics;
      if (campaign.platform === 'meta') {
        platformMetrics = await this.metaAds.getCampaignMetrics(campaign.campaign_id);
      } else if (campaign.platform === 'google') {
        platformMetrics = await this.googleAds.getCampaignMetrics(campaign.campaign_id);
      }

      // Calcular métricas derivadas
      const metrics = calculateMetrics({
        impressions: parseInt(platformMetrics.impressions) || 0,
        clicks: parseInt(platformMetrics.clicks) || 0,
        spend: parseFloat(platformMetrics.spend) || 0,
        conversions: parseFloat(platformMetrics.conversions) || 0,
        revenue: 0 // Precisa vir do backend
      });

      // Salvar métricas no D1
      await this.saveMetrics(campaign.id, metrics);

      // Verificar se precisa tomar decisões
      const decisions = await this.aiEngine.makeOptimizationDecision(campaign.id, metrics);

      // Criar alertas se necessário
      await this.checkAndCreateAlerts(campaign, metrics);

      console.log(`Campaign ${campaign.name} monitored. Decisions: ${decisions.length}`);

    } catch (error) {
      console.error(`Error monitoring campaign ${campaign.name}:`, error);
    }
  }

  /**
   * Salvar métricas no D1
   */
  async saveMetrics(campaignId, metrics) {
    const today = new Date().toISOString().split('T')[0];

    await this.env.DB.prepare(`
      INSERT INTO performance_metrics 
        (campaign_id, date, impressions, clicks, conversions, spend, revenue,
         ctr, cpc, cpl, cpa, roas, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(campaign_id, date) DO UPDATE SET
        impressions = excluded.impressions,
        clicks = excluded.clicks,
        conversions = excluded.conversions,
        spend = excluded.spend,
        revenue = excluded.revenue,
        ctr = excluded.ctr,
        cpc = excluded.cpc,
        cpl = excluded.cpl,
        cpa = excluded.cpa,
        roas = excluded.roas
    `).bind(
      campaignId,
      today,
      metrics.impressions || 0,
      metrics.clicks || 0,
      metrics.conversions || 0,
      metrics.spend || 0,
      metrics.revenue || 0,
      metrics.ctr || 0,
      metrics.cpc || 0,
      metrics.cpl || 0,
      metrics.cpa || 0,
      metrics.roas || 0,
      Date.now()
    ).run();
  }

  /**
   * Verificar e criar alertas
   */
  async checkAndCreateAlerts(campaign, metrics) {
    const alerts = [];

    // CPL muito alto
    if (metrics.cpl > 50) {
      alerts.push({
        type: 'high_cpl',
        severity: 'warning',
        message: `CPL de R$ ${metrics.cpl.toFixed(2)} está acima do target de R$ 50`
      });
    }

    // ROAS muito baixo
    if (metrics.roas < 2.0 && metrics.conversions > 10) {
      alerts.push({
        type: 'low_roas',
        severity: 'critical',
        message: `ROAS de ${metrics.roas.toFixed(2)}x está abaixo do target de 2x`
      });
    }

    // Orçamento quase esgotado
    if (metrics.spend > campaign.daily_budget * 0.9) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'info',
        message: `Orçamento diário quase esgotado: R$ ${metrics.spend.toFixed(2)} de R$ ${campaign.daily_budget}`
      });
    }

    // Salvar alertas
    for (const alert of alerts) {
      await this.env.DB.prepare(`
        INSERT INTO alerts (campaign_id, alert_type, severity, message, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        campaign.id,
        alert.type,
        alert.severity,
        alert.message,
        Date.now()
      ).run();
    }
  }

  /**
   * Gerar relatório semanal
   */
  async generateWeeklyReport() {
    console.log('Generating weekly report...');

    try {
      // Buscar métricas da última semana
      const { results: metrics } = await this.env.DB.prepare(`
        SELECT 
          c.name as campaign_name,
          c.platform,
          SUM(m.impressions) as total_impressions,
          SUM(m.clicks) as total_clicks,
          SUM(m.conversions) as total_conversions,
          SUM(m.spend) as total_spend,
          SUM(m.revenue) as total_revenue,
          AVG(m.ctr) as avg_ctr,
          AVG(m.cpc) as avg_cpc,
          AVG(m.cpl) as avg_cpl,
          AVG(m.roas) as avg_roas
        FROM performance_metrics m
        JOIN campaigns c ON m.campaign_id = c.id
        WHERE m.date >= date('now', '-7 days')
        GROUP BY c.id
        ORDER BY total_spend DESC
      `).all();

      // Formatar relatório
      const report = {
        period: 'Last 7 days',
        generated_at: new Date().toISOString(),
        campaigns: metrics,
        summary: {
          total_spend: metrics.reduce((sum, m) => sum + m.total_spend, 0),
          total_conversions: metrics.reduce((sum, m) => sum + m.total_conversions, 0),
          total_revenue: metrics.reduce((sum, m) => sum + m.total_revenue, 0)
        }
      };

      console.log('Weekly report generated:', report);

      // Aqui você pode enviar por email, Slack, etc.

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}
