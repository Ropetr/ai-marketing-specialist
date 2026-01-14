/**
 * Page Generator
 * Gera landing pages otimizadas automaticamente
 */

import { generateId } from '../utils/helpers.js';

export class PageGenerator {
  constructor(env) {
    this.env = env;
  }

  /**
   * Gerar landing page completa
   */
  async generate({ product, template, campaignId }) {
    console.log('Generating page for:', product);

    // Gerar conteúdo baseado no produto
    const content = this.generateContent(product);

    // Gerar HTML otimizado
    const html = this.generateHTML(content, product);

    // Gerar CSS otimizado
    const css = this.generateCSS();

    // Gerar JavaScript otimizado
    const js = this.generateJS(product);

    // Salvar no D1
    const pageId = generateId();
    const url = `/lp/${pageId}`;

    await this.env.DB.prepare(`
      INSERT INTO generated_pages (id, campaign_id, url, title, product, template,
                                    html_content, css_content, js_content,
                                    deployed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      pageId,
      campaignId || null,
      url,
      content.title,
      product,
      template,
      html,
      css,
      js,
      0,
      Date.now(),
      Date.now()
    ).run();

    // Deploy no Cloudflare Pages (via R2 ou KV)
    await this.deploy(pageId, html, css, js);

    return {
      success: true,
      pageId,
      url,
      deployedUrl: `https://yourdomain.com${url}`,
      content
    };
  }

  /**
   * Gerar conteúdo baseado no produto
   */
  generateContent(product) {
    return {
      title: `${product} de Qualidade | Orçamento Grátis`,
      headline: `${product} com Instalação Profissional`,
      subheadline: 'Transforme seu ambiente. Orçamento grátis. Parcele em até 10x.',
      benefits: [
        { title: 'Qualidade Garantida', description: 'Materiais de primeira linha com garantia de 5 anos.' },
        { title: 'Instalação Profissional', description: 'Equipe especializada e experiente.' },
        { title: 'Melhor Preço', description: 'Parcelamento em até 10x sem juros.' }
      ],
      cta: 'Solicitar Orçamento Grátis',
      formTitle: 'Solicite Seu Orçamento Grátis'
    };
  }

  /**
   * Gerar HTML otimizado
   */
  generateHTML(content, product) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.subheadline}">
  <link rel="canonical" href="https://yourdomain.com/lp/${product}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${content.title}">
  <meta property="og:description" content="${content.subheadline}">
  
  <!-- Preconnect -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  
  <!-- Critical CSS inline -->
  <style>
    body{margin:0;font-family:system-ui,sans-serif;color:#333}
    .hero{min-height:100vh;display:flex;align-items:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:2rem}
    .hero h1{font-size:clamp(2rem,5vw,4rem);color:#fff;margin:0}
  </style>
  
  <!-- Full CSS -->
  <link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
</head>

<body>
  <section class="hero">
    <div class="container">
      <h1>${content.headline}</h1>
      <p class="lead">${content.subheadline}</p>
      <a href="#orcamento" class="cta-button" data-event="cta_click">${content.cta}</a>
    </div>
  </section>

  <section class="benefits">
    <div class="container">
      <h2>Por Que Escolher Nosso ${product}?</h2>
      <div class="grid">
        ${content.benefits.map(b => `
          <article class="benefit-card">
            <h3>${b.title}</h3>
            <p>${b.description}</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="form-section" id="orcamento">
    <div class="container">
      <h2>${content.formTitle}</h2>
      <form id="orcamento-form" method="POST" action="/api/lead">
        <label for="nome">Nome Completo *</label>
        <input type="text" id="nome" name="nome" required autocomplete="name">
        
        <label for="email">E-mail *</label>
        <input type="email" id="email" name="email" required autocomplete="email">
        
        <label for="telefone">Telefone/WhatsApp *</label>
        <input type="tel" id="telefone" name="telefone" required autocomplete="tel">
        
        <label for="mensagem">Mensagem</label>
        <textarea id="mensagem" name="mensagem" rows="4"></textarea>
        
        <input type="hidden" name="produto" value="${product}">
        
        <button type="submit" class="submit-button" data-event="form_submit">
          Enviar Solicitação
        </button>
      </form>
    </div>
  </section>

  <script src="/main.js" defer></script>
</body>
</html>`;
  }

  /**
   * Gerar CSS otimizado
   */
  generateCSS() {
    return `
/* Reset */
*{box-sizing:border-box;margin:0;padding:0}

/* Typography */
body{font-family:system-ui,-apple-system,sans-serif;color:#333;line-height:1.6}

/* Layout */
.container{max-width:1200px;margin:0 auto;padding:0 2rem}

/* Hero */
.hero{min-height:100vh;display:flex;align-items:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:2rem}
.hero h1{font-size:clamp(2rem,5vw,4rem);color:#fff;margin:0 0 1rem;line-height:1.2}
.hero .lead{font-size:clamp(1.1rem,2vw,1.5rem);color:#fff;margin:0 0 2rem}

/* CTA Button */
.cta-button{display:inline-block;padding:1rem 2rem;background:#ff6b6b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;transition:transform .2s,box-shadow .2s;min-width:44px;min-height:44px}
.cta-button:hover,.cta-button:focus{transform:translateY(-2px);box-shadow:0 8px 16px rgba(0,0,0,.2)}

/* Benefits */
.benefits{padding:4rem 0;background:#f8f9fa}
.benefits h2{text-align:center;margin-bottom:3rem;font-size:clamp(1.8rem,4vw,3rem)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}
.benefit-card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.benefit-card h3{margin-bottom:1rem;color:#667eea}

/* Form */
.form-section{padding:4rem 0}
.form-section h2{text-align:center;margin-bottom:2rem}
form{max-width:600px;margin:0 auto}
label{display:block;margin-bottom:.5rem;font-weight:600}
input,textarea{width:100%;padding:.75rem;margin-bottom:1rem;border:1px solid #ddd;border-radius:4px;font-size:1rem}
input:focus,textarea:focus{outline:3px solid #667eea;outline-offset:2px}
.submit-button{width:100%;padding:1rem;background:#667eea;color:#fff;border:none;border-radius:8px;font-size:1.1rem;font-weight:700;cursor:pointer;transition:background .2s}
.submit-button:hover{background:#5568d3}

/* Focus visible */
*:focus-visible{outline:3px solid #667eea;outline-offset:2px}

/* Responsive */
@media (max-width:768px){
  .container{padding:0 1rem}
  .hero{padding:1rem}
}
`;
  }

  /**
   * Gerar JavaScript otimizado
   */
  generateJS(product) {
    return `
(function(){'use strict';
const form=document.getElementById('orcamento-form');
form?.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const formData=new FormData(form);
  const data=Object.fromEntries(formData);
  try{
    const response=await fetch('/api/lead',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    if(response.ok){
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({
        event:'generate_lead',
        product:'${product}',
        value:150.00,
        currency:'BRL'
      });
      window.location.href='/obrigado';
    }
  }catch(error){
    console.error('Erro:',error);
    alert('Erro ao enviar. Tente novamente.');
  }
});

document.querySelectorAll('[data-event]').forEach(el=>{
  el.addEventListener('click',()=>{
    const event=el.dataset.event;
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event:event});
  });
});
})();
`;
  }

  /**
   * Deploy da página
   */
  async deploy(pageId, html, css, js) {
    // Salvar no KV para servir via Worker
    await this.env.CACHE.put(`page:${pageId}:html`, html);
    await this.env.CACHE.put(`page:${pageId}:css`, css);
    await this.env.CACHE.put(`page:${pageId}:js`, js);

    // Ou salvar no R2
    // await this.env.STORAGE.put(`pages/${pageId}/index.html`, html);

    return true;
  }
}
`;
  }
}
