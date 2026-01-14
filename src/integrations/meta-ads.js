/**
 * Meta Ads Integration
 * Integração completa com Meta Marketing API e Conversions API
 */

export class MetaAdsIntegration {
  constructor(env) {
    this.env = env;
    this.accessToken = env.META_ACCESS_TOKEN;
    this.pixelId = env.META_PIXEL_ID;
    this.apiVersion = 'v22.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Criar campanha no Meta Ads
   */
  async createCampaign({ name, objective, budget, targeting, creatives }) {
    const accountId = this.env.META_AD_ACCOUNT_ID;

    try {
      // 1. Criar Campaign
      const campaignResponse = await fetch(`${this.baseUrl}/act_${accountId}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          objective: objective || 'OUTCOME_SALES',
          status: 'PAUSED', // Inicia pausado
          special_ad_categories: [],
          access_token: this.accessToken
        })
      });

      const campaign = await campaignResponse.json();

      if (campaign.error) {
        throw new Error(`Meta API Error: ${campaign.error.message}`);
      }

      // 2. Criar Ad Set
      const adSetResponse = await fetch(`${this.baseUrl}/act_${accountId}/adsets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${name} - Ad Set 1`,
          campaign_id: campaign.id,
          targeting: this.formatTargeting(targeting),
          optimization_goal: 'OFFSITE_CONVERSIONS',
          billing_event: 'IMPRESSIONS',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          daily_budget: Math.round(budget * 100), // Centavos
          status: 'PAUSED',
          access_token: this.accessToken
        })
      });

      const adSet = await adSetResponse.json();

      if (adSet.error) {
        throw new Error(`Meta API Error: ${adSet.error.message}`);
      }

      // 3. Criar Ads (se criativos fornecidos)
      const ads = [];
      if (creatives && creatives.length > 0) {
        for (const creative of creatives) {
          const adResponse = await this.createAd(accountId, adSet.id, creative);
          ads.push(adResponse);
        }
      }

      return {
        success: true,
        accountId,
        campaignId: campaign.id,
        adSetId: adSet.id,
        ads,
        name,
        reviewUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaign.id}`
      };

    } catch (error) {
      console.error('Meta Ads API Error:', error);
      throw error;
    }
  }

  /**
   * Criar anúncio
   */
  async createAd(accountId, adSetId, creative) {
    const adCreativeResponse = await fetch(`${this.baseUrl}/act_${accountId}/adcreatives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: creative.name || 'Creative 1',
        object_story_spec: {
          page_id: this.env.META_PAGE_ID,
          link_data: {
            image_hash: creative.imageHash, // Precisa fazer upload antes
            link: creative.link,
            message: creative.primaryText,
            name: creative.headline,
            description: creative.description,
            call_to_action: {
              type: creative.cta || 'LEARN_MORE'
            }
          }
        },
        access_token: this.accessToken
      })
    });

    const adCreative = await adCreativeResponse.json();

    if (adCreative.error) {
      throw new Error(`Meta API Error: ${adCreative.error.message}`);
    }

    // Criar Ad
    const adResponse = await fetch(`${this.baseUrl}/act_${accountId}/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: creative.name || 'Ad 1',
        adset_id: adSetId,
        creative: { creative_id: adCreative.id },
        status: 'PAUSED',
        access_token: this.accessToken
      })
    });

    const ad = await adResponse.json();
    return ad;
  }

  /**
   * Formatar targeting para Meta Ads
   */
  formatTargeting(targeting) {
    const formatted = {
      geo_locations: targeting.geoLocations || { countries: ['BR'] },
      age_min: targeting.ageMin || 18,
      age_max: targeting.ageMax || 65
    };

    if (targeting.interests && targeting.interests.length > 0) {
      formatted.interests = targeting.interests.map(i => ({ id: i.id, name: i.name }));
    }

    if (targeting.behaviors && targeting.behaviors.length > 0) {
      formatted.behaviors = targeting.behaviors.map(b => ({ id: b.id, name: b.name }));
    }

    return formatted;
  }

  /**
   * Enviar evento de conversão (Conversions API)
   */
  async sendConversionEvent({ eventName, email, phone, customData }) {
    try {
      const eventTime = Math.floor(Date.now() / 1000);
      const eventId = `${eventTime}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${this.baseUrl}/${this.pixelId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: [{
            event_name: eventName,
            event_time: eventTime,
            event_id: eventId,
            action_source: 'website',
            user_data: {
              em: email ? await this.hashSHA256(email) : undefined,
              ph: phone ? await this.hashSHA256(phone) : undefined
            },
            custom_data: customData || {}
          }],
          access_token: this.accessToken
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(`Conversions API Error: ${result.error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Conversions API Error:', error);
      throw error;
    }
  }

  /**
   * Obter métricas de campanha
   */
  async getCampaignMetrics(campaignId, dateRange = 'last_7d') {
    try {
      const response = await fetch(
        `${this.baseUrl}/${campaignId}/insights?` +
        `fields=impressions,clicks,spend,conversions,ctr,cpc,cpm,cpp&` +
        `date_preset=${dateRange}&` +
        `access_token=${this.accessToken}`
      );

      const result = await response.json();
      return result.data?.[0] || {};
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  /**
   * Executar decisão de otimização
   */
  async executeDecision(campaignId, decision) {
    const accountId = this.env.META_AD_ACCOUNT_ID;

    switch (decision.type) {
      case 'bid_adjustment':
        // Ajustar bid do ad set
        // Meta Ads usa budget, não bid direto
        return { success: true, message: 'Bid adjustment não aplicável no Meta Ads' };

      case 'budget_reallocation':
        // Ajustar orçamento
        const newBudget = decision.newBudget || (decision.currentBudget * (1 + decision.adjustment / 100));
        await fetch(`${this.baseUrl}/${campaignId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daily_budget: Math.round(newBudget * 100),
            access_token: this.accessToken
          })
        });
        return { success: true, newBudget };

      case 'pause_campaign':
        // Pausar campanha
        await fetch(`${this.baseUrl}/${campaignId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'PAUSED',
            access_token: this.accessToken
          })
        });
        return { success: true, status: 'PAUSED' };

      default:
        return { success: false, message: 'Decision type not implemented' };
    }
  }

  /**
   * Hash SHA256 para Advanced Matching
   */
  async hashSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.toLowerCase().trim());
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
