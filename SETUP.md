# Guia de Setup Completo - AI Marketing Specialist

## 📋 Pré-requisitos

- Node.js 20+
- Conta Cloudflare (Free ou Pro)
- Conta GitHub
- Contas nas plataformas de ads (Meta, Google)

---

## 🔧 Passo 1: Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/ai-marketing-specialist.git
cd ai-marketing-specialist
npm install
```

---

## ☁️ Passo 2: Configurar Cloudflare

### 2.1 Login no Cloudflare

```bash
npx wrangler login
```

### 2.2 Criar D1 Database

```bash
npx wrangler d1 create ai-marketing-db
```

Copie o `database_id` gerado e cole em `wrangler.toml`.

### 2.3 Criar KV Namespaces

```bash
npx wrangler kv:namespace create "CACHE"
npx wrangler kv:namespace create "CONFIG"
```

Copie os IDs gerados e cole em `wrangler.toml`.

### 2.4 Criar R2 Bucket

```bash
npx wrangler r2 bucket create ai-marketing-storage
```

### 2.5 Criar Vectorize Index

```bash
npx wrangler vectorize create knowledge-base --dimensions=768 --metric=cosine
```

### 2.6 Executar Migrações

```bash
npm run db:migrate
```

---

## 🔑 Passo 3: Configurar Secrets

### 3.1 Meta Ads

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie um app
3. Obtenha o Access Token

```bash
npx wrangler secret put META_ACCESS_TOKEN
npx wrangler secret put META_AD_ACCOUNT_ID
npx wrangler secret put META_PIXEL_ID
npx wrangler secret put META_PAGE_ID
```

### 3.2 Google Ads

1. Acesse [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
2. Configure OAuth 2.0
3. Obtenha Developer Token

```bash
npx wrangler secret put GOOGLE_ADS_CUSTOMER_ID
npx wrangler secret put GOOGLE_ADS_DEVELOPER_TOKEN
npx wrangler secret put GOOGLE_ADS_CLIENT_ID
npx wrangler secret put GOOGLE_ADS_CLIENT_SECRET
npx wrangler secret put GOOGLE_ADS_REFRESH_TOKEN
```

### 3.3 Google Analytics 4

1. Acesse [GA4](https://analytics.google.com/)
2. Crie propriedade
3. Obtenha Measurement ID e API Secret

```bash
npx wrangler secret put GA4_MEASUREMENT_ID
npx wrangler secret put GA4_API_SECRET
npx wrangler secret put GA4_PROPERTY_ID
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

---

## 🚀 Passo 4: Deploy

### 4.1 Testar Localmente

```bash
npm run dev
```

Acesse http://localhost:8787

### 4.2 Deploy para Staging

```bash
npm run deploy:staging
```

### 4.3 Deploy para Production

```bash
npm run deploy:production
```

---

## 🐙 Passo 5: Configurar GitHub

### 5.1 Criar Repositório no GitHub

```bash
gh repo create ai-marketing-specialist --public --source=. --remote=origin
```

### 5.2 Adicionar Secrets no GitHub

Vá em **Settings → Secrets and variables → Actions** e adicione:

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
META_ACCESS_TOKEN
META_AD_ACCOUNT_ID
META_PIXEL_ID
GOOGLE_ADS_CUSTOMER_ID
GOOGLE_ADS_DEVELOPER_TOKEN
GA4_MEASUREMENT_ID
GA4_API_SECRET
WORKER_API_KEY
```

### 5.3 Push para GitHub

```bash
git push -u origin main
```

O GitHub Actions fará deploy automático! 🎉

---

## ✅ Passo 6: Testar a IA

### 6.1 Criar Campanha

```bash
curl -X POST https://ai-marketing-specialist.workers.dev/api/campaign/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "meta",
    "product": "Forro de Gesso",
    "budget": 80,
    "region": "Belo Horizonte"
  }'
```

### 6.2 Gerar Landing Page

```bash
curl -X POST https://ai-marketing-specialist.workers.dev/api/page/generate \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Forro de Gesso"
  }'
```

### 6.3 Verificar Campanhas

```bash
curl https://ai-marketing-specialist.workers.dev/api/campaigns
```

---

## 🎯 Próximos Passos

1. **Revisar campanhas criadas** no Meta Ads Manager
2. **Ativar campanhas** após revisão
3. **Monitorar alertas** em `/api/alerts`
4. **Verificar relatórios** semanais

---

## 🆘 Troubleshooting

### Erro: "Database not found"
```bash
npm run db:migrate
```

### Erro: "Unauthorized"
Verifique se os secrets estão configurados corretamente:
```bash
npx wrangler secret list
```

### Erro: "Rate limit exceeded"
Aguarde alguns minutos. As APIs têm rate limits.

---

## 📚 Recursos

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-api)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)

---

**Pronto! Sua IA está rodando! 🚀**
