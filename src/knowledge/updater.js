/**
 * Knowledge Updater
 * Sistema de auto-atualização de conhecimento
 */

export class KnowledgeUpdater {
  constructor(env) {
    this.env = env;
    this.sources = [
      {
        platform: 'meta',
        url: 'https://developers.facebook.com/docs/graph-api/changelog',
        type: 'html'
      },
      {
        platform: 'google_ads',
        url: 'https://developers.google.com/google-ads/api/docs/release-notes',
        type: 'html'
      },
      {
        platform: 'ga4',
        url: 'https://developers.google.com/analytics/devguides/collection/ga4/release-notes',
        type: 'html'
      },
      {
        platform: 'cloudflare',
        url: 'https://developers.cloudflare.com/workers/platform/changelog/',
        type: 'html'
      }
    ];
  }

  /**
   * Verificar atualizações em todas as fontes
   */
  async checkForUpdates() {
    console.log('Checking for knowledge updates...');

    try {
      for (const source of this.sources) {
        await this.checkSource(source);
      }

      console.log('Knowledge update check completed');
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Verificar fonte específica
   */
  async checkSource(source) {
    console.log(`Checking ${source.platform}...`);

    try {
      // Buscar conteúdo atual
      const response = await fetch(source.url);
      const content = await response.text();

      // Calcular hash do conteúdo
      const currentHash = await this.hashContent(content);

      // Buscar hash anterior do KV
      const previousHash = await this.env.CONFIG.get(`knowledge:${source.platform}:hash`);

      if (previousHash && currentHash !== previousHash) {
        console.log(`✅ Update detected for ${source.platform}`);

        // Detectar breaking changes
        const breakingChanges = this.detectBreakingChanges(content);

        // Salvar nova versão
        await this.saveNewVersion(source.platform, content, breakingChanges);

        // Atualizar hash
        await this.env.CONFIG.put(`knowledge:${source.platform}:hash`, currentHash);

        // Se houver breaking changes, criar alerta
        if (breakingChanges.length > 0) {
          await this.createBreakingChangeAlert(source.platform, breakingChanges);
        }

        // Atualizar Vectorize (RAG)
        await this.updateVectorize(source.platform, content);

      } else if (!previousHash) {
        // Primeira vez, apenas salvar
        await this.env.CONFIG.put(`knowledge:${source.platform}:hash`, currentHash);
        console.log(`Initial hash saved for ${source.platform}`);
      } else {
        console.log(`No updates for ${source.platform}`);
      }

    } catch (error) {
      console.error(`Error checking ${source.platform}:`, error);
    }
  }

  /**
   * Calcular hash do conteúdo
   */
  async hashContent(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Detectar breaking changes
   */
  detectBreakingChanges(content) {
    const breakingKeywords = [
      'breaking change',
      'deprecated',
      'removed',
      'no longer supported',
      'breaking:',
      'BREAKING:'
    ];

    const breakingChanges = [];
    const lines = content.split('\n');

    for (const line of lines) {
      for (const keyword of breakingKeywords) {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          breakingChanges.push(line.trim());
          break;
        }
      }
    }

    return breakingChanges;
  }

  /**
   * Salvar nova versão
   */
  async saveNewVersion(platform, content, breakingChanges) {
    const version = new Date().toISOString();

    await this.env.DB.prepare(`
      INSERT INTO knowledge_versions (platform, version, changelog, breaking_changes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      platform,
      version,
      JSON.stringify({ summary: 'Auto-detected update' }),
      breakingChanges.length > 0 ? 1 : 0,
      Date.now()
    ).run();

    // Salvar conteúdo completo no R2
    await this.env.STORAGE.put(
      `knowledge/${platform}/${version}.html`,
      content
    );
  }

  /**
   * Criar alerta de breaking change
   */
  async createBreakingChangeAlert(platform, breakingChanges) {
    await this.env.DB.prepare(`
      INSERT INTO alerts (campaign_id, alert_type, severity, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      null,
      'breaking_change_detected',
      'critical',
      `Breaking changes detected in ${platform}: ${breakingChanges.slice(0, 3).join('; ')}`,
      Date.now()
    ).run();

    console.log(`⚠️ Breaking change alert created for ${platform}`);
  }

  /**
   * Atualizar Vectorize (RAG)
   */
  async updateVectorize(platform, content) {
    // Extrair seções relevantes do conteúdo
    const sections = this.extractSections(content);

    // Gerar embeddings e inserir no Vectorize
    for (const section of sections) {
      // Aqui você usaria Workers AI para gerar embeddings
      // const embedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      //   text: section.content
      // });

      // await this.env.VECTORIZE.insert([{
      //   id: `${platform}_${section.id}`,
      //   values: embedding,
      //   metadata: {
      //     platform,
      //     section: section.title,
      //     content: section.content
      //   }
      // }]);
    }

    console.log(`Vectorize updated for ${platform}`);
  }

  /**
   * Extrair seções do conteúdo
   */
  extractSections(content) {
    // Simplificado - em produção, usar parser HTML adequado
    const sections = [];
    const lines = content.split('\n');
    let currentSection = { title: '', content: '' };

    for (const line of lines) {
      if (line.startsWith('<h2') || line.startsWith('<h3')) {
        if (currentSection.content) {
          sections.push({ ...currentSection, id: sections.length });
        }
        currentSection = { title: line, content: '' };
      } else {
        currentSection.content += line + '\n';
      }
    }

    return sections.slice(0, 100); // Limitar para não sobrecarregar
  }
}
