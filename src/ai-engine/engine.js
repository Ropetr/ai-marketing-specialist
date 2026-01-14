/**
 * AI Engine - Motor de decisão da IA
 */

import { MetaAdsIntegration } from '../integrations/meta-ads.js';
import { GoogleAdsIntegration } from '../integrations/google-ads.js';
import { generateId } from '../utils/helpers.js';

export class AIEngine {
  constructor(env) {
    this.env = env;
    this.metaAds = new MetaAdsIntegration(env);
    this.googleAds = new GoogleAdsIntegration(env);
  }

  /**
   * Criar campanha automaticamente
   */
  async createCampaign({ platform, product, budget, region, objective, creatives }) {
    console.log('AI Engine: Creating campaign', { platform, product, budget });

    // Analisar produto e definir estratégia
    const strategy = await this.analyzeProductAndDefineStrategy(product, objective);

    // Definir targeting baseado em conhecimento absorvido
    const targeting = await this.defineTargeting(product, region);

    // Criar campanha na plataforma
    let campaignResult;
    if (platform === 'meta') {
      campaignResult = await this.metaAds.createCampaign({
        name: `${product} - Conversões`,
        objective: objective || 'OUTCOME_SALES',
        budget,
        targeting,
        creatives: creatives || []
      });
    } else if (platform === 'google') {
      campaignResult = await this.googleAds.createCampaign({
        name: `${product} - Conversões`,
        type: 'SEARCH',
        budget,
        targeting,
        keywords: strategy.keywords
      });
    }

    // Salvar no D1
    const campaignId = generateId();
    await this.env.DB.prepare(`
      INSERT INTO campaigns (id, platform, account_id, campaign_id, name, objective, 
                             status, daily_budget, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      campaignId,
      platform,
      campaignResult.accountId,
      campaignResult.campaignId,
      campaignResult.name,
      objective || '',
      'paused', // Inicia pausado para revisão
      budget,
      JSON.stringify({ strategy, targeting }),
      Date.now(),
      Date.now()
    ).run();

    // Registrar decisão
    await this.logDecision({
      campaignId,
      decisionType: 'campaign_creation',
      reason: `Campanha criada para ${product} com orçamento de R$ ${budget}/dia`,
      actionTaken: JSON.stringify(campaignResult)
    });

    return {
      success: true,
      campaignId,
      platform,
      ...campaignResult,
      strategy,
      targeting,
      message: 'Campanha criada com sucesso! Revise e ative quando estiver pronto.'
    };
  }

  /**
   * Analisar produto e definir estratégia
   */
  async analyzeProductAndDefineStrategy(product, objective) {
    // Usar conhecimento absorvido para definir estratégia

    const productLower = product.toLowerCase();
    
    // Estratégias baseadas em tipo de produto
    let strategy = {
      funnel: 'bottom', // bottom, middle, top
      keywords: [],
      interests: [],
      bidStrategy: 'TARGET_CPA',
      targetCPA: 50.00
    };

    // Produtos de construção/reforma (ex: forro de gesso)
    if (productLower.includes('forro') || productLower.includes('gesso') || 
        productLower.includes('drywall') || productLower.includes('construção')) {
      
      strategy.keywords = [
        `${product}`,
        `${product} preço`,
        `${product} instalação`,
        `${product} orçamento`,
        `comprar ${product}`,
        `${product} perto de mim`
      ];

      strategy.interests = [
        { id: '6003139266461', name: 'Home improvement' },
        { id: '6003107902433', name: 'Construction' },
        { id: '6003020834693', name: 'Do it yourself (DIY)' }
      ];

      strategy.targetCPA = 40.00; // R$ 40 por lead
    }

    // Ajustar baseado no objetivo
    if (objective === 'awareness') {
      strategy.funnel = 'top';
      strategy.bidStrategy = 'MAXIMIZE_REACH';
    } else if (objective === 'consideration') {
      strategy.funnel = 'middle';
      strategy.bidStrategy = 'MAXIMIZE_CLICKS';
    }

    return strategy;
  }

  /**
   * Definir targeting baseado em produto e região
   */
  async defineTargeting(product, region) {
    const targeting = {
      geoLocations: {},
      ageMin: 25,
      ageMax: 55,
      interests: [],
      behaviors: []
    };

    // Região
    if (region) {
      if (region.includes('Belo Horizonte') || region.includes('BH')) {
        targeting.geoLocations = {
          countries: ['BR'],
          regions: [{ key: '3457' }], // Minas Gerais
          cities: [
            { key: '2800308', name: 'Belo Horizonte' },
            { key: '2802908', name: 'Contagem' },
            { key: '2803203', name: 'Betim' }
          ]
        };
      } else {
        targeting.geoLocations = { countries: ['BR'] };
      }
    }

    // Interesses baseados em produto
    const productLower = product.toLowerCase();
    if (productLower.includes('forro') || productLower.includes('gesso')) {
      targeting.interests = [
        { id: '6003139266461', name: 'Home improvement' },
        { id: '6003107902433', name: 'Construction' }
      ];
      targeting.behaviors = [
        { id: '6015559470583', name: 'Homeowners' }
      ];
    }

    return targeting;
  }

  /**
   * Tomar decisão de otimização
   */
  async makeOptimizationDecision(campaignId, metrics) {
    const decisions = [];

    // Regras de decisão baseadas em métricas

    // CPL muito alto
    if (metrics.cpl > 50) {
      decisions.push({
        type: 'bid_adjustment',
        action: 'decrease_bid',
        reason: `CPL de R$ ${metrics.cpl.toFixed(2)} está acima do target de R$ 50`,
        adjustment: -10 // Reduzir bid em 10%
      });
    }

    // ROAS muito baixo
    if (metrics.roas < 2.0 && metrics.conversions > 10) {
      decisions.push({
        type: 'budget_reallocation',
        action: 'reduce_budget',
        reason: `ROAS de ${metrics.roas.toFixed(2)}x está abaixo do target de 2x`,
        adjustment: -20 // Reduzir orçamento em 20%
      });
    }

    // CTR muito baixo
    if (metrics.ctr < 1.0 && metrics.impressions > 1000) {
      decisions.push({
        type: 'creative_refresh',
        action: 'suggest_new_creatives',
        reason: `CTR de ${metrics.ctr.toFixed(2)}% está muito baixo`,
        suggestion: 'Criar novos criativos com copy mais persuasivo'
      });
    }

    // Gastar muito rápido
    if (metrics.spend > metrics.dailyBudget * 0.8 && new Date().getHours() < 12) {
      decisions.push({
        type: 'pacing_adjustment',
        action: 'slow_down_delivery',
        reason: 'Gastando orçamento muito rápido',
        adjustment: 'Mudar para entrega uniforme'
      });
    }

    // Executar decisões
    for (const decision of decisions) {
      await this.executeDecision(campaignId, decision);
    }

    return decisions;
  }

  /**
   * Executar decisão
   */
  async executeDecision(campaignId, decision) {
    // Buscar campanha
    const campaign = await this.env.DB.prepare(`
      SELECT * FROM campaigns WHERE id = ?
    `).bind(campaignId).first();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Executar via API da plataforma
    let result;
    if (campaign.platform === 'meta') {
      result = await this.metaAds.executeDecision(campaign.campaign_id, decision);
    } else if (campaign.platform === 'google') {
      result = await this.googleAds.executeDecision(campaign.campaign_id, decision);
    }

    // Registrar decisão
    await this.logDecision({
      campaignId,
      decisionType: decision.type,
      reason: decision.reason,
      actionTaken: JSON.stringify({ decision, result })
    });

    return result;
  }

  /**
   * Registrar decisão no D1
   */
  async logDecision({ campaignId, decisionType, reason, actionTaken, metricsBefore = null }) {
    await this.env.DB.prepare(`
      INSERT INTO ai_decisions (campaign_id, decision_type, reason, action_taken, 
                                metrics_before, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      campaignId,
      decisionType,
      reason,
      actionTaken,
      metricsBefore ? JSON.stringify(metricsBefore) : null,
      Date.now()
    ).run();
  }
}
