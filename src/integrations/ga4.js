/**
 * GA4 Integration
 * Integração com Google Analytics 4 Data API e Measurement Protocol
 */

export class GA4Integration {
  constructor(env) {
    this.env = env;
    this.measurementId = env.GA4_MEASUREMENT_ID;
    this.apiSecret = env.GA4_API_SECRET;
    this.propertyId = env.GA4_PROPERTY_ID;
  }

  /**
   * Enviar evento via Measurement Protocol (server-side)
   */
  async sendEvent({ name, params, clientId }) {
    try {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId || this.generateClientId(),
            events: [{
              name,
              params: {
                ...params,
                engagement_time_msec: '100'
              }
            }]
          })
        }
      );

      return { success: response.ok };
    } catch (error) {
      console.error('GA4 Measurement Protocol Error:', error);
      throw error;
    }
  }

  /**
   * Obter métricas via Data API
   */
  async getMetrics({ startDate, endDate, dimensions, metrics }) {
    try {
      // Precisa de OAuth access token
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: dimensions || [{ name: 'date' }],
            metrics: metrics || [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'conversions' }
            ]
          })
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GA4 Data API Error:', error);
      throw error;
    }
  }

  /**
   * Gerar Client ID
   */
  generateClientId() {
    return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obter access token (OAuth)
   */
  async getAccessToken() {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        refresh_token: this.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    return data.access_token;
  }
}
