# 🚀 AI Forsikringsguiden - Deployment Guide

## 📋 **Prerequisites**
Før deployment skal du have:
- [x] Build success ✅ (vi har lige løst det)
- [ ] Environment variables setup
- [ ] Deployment platform konto (Vercel anbefales)

---

## 🔧 **1. Environment Variables Setup**

### Opret `.env.production` fil:
```bash
# OpenAI Configuration
OPENAI_API_KEY=din-openai-api-key-her
OPENAI_API_KEY_BACKUP=backup-key-hvis-du-har-en

# Database (Supabase)
DATABASE_URL=din-supabase-connection-string
SUPABASE_URL=https://din-projekt.supabase.co
SUPABASE_ANON_KEY=din-supabase-anon-key

# Next.js
NEXTAUTH_SECRET=generate-random-string-her
NEXTAUTH_URL=https://din-domain.vercel.app

# Optional: Error Monitoring
SENTRY_DSN=din-sentry-dsn-hvis-du-bruger-det
```

### 🔑 **Hvordan får du API keys:**

**OpenAI API Key:**
1. Gå til https://platform.openai.com/api-keys
2. Log ind og klik "Create new secret key"
3. Kopier nøglen (starter med `sk-`)

**Supabase Setup:**
1. Gå til https://supabase.com/dashboard
2. Opret nyt projekt eller brug eksisterende
3. Gå til Settings → API
4. Kopier "URL" og "anon/public" key

---

## 🌐 **2. Deployment til Vercel (Anbefalet)**

### Option A: Via Vercel Dashboard (Nemmest)

1. **Gå til https://vercel.com og opret konto**

2. **Connect GitHub:**
   - Klik "New Project"
   - Connect dit GitHub repository
   - Vælg "AI forsikrings guiden" repo

3. **Configure Build Settings:**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Add Environment Variables:**
   - Gå til "Environment Variables" sektionen
   - Tilføj hver variable fra `.env.production`
   - Set Environment til "Production"

5. **Deploy:**
   - Klik "Deploy"
   - Vent ca. 2-3 minutter

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login til Vercel
vercel login

# Deploy fra projektet
vercel --prod

# Følg prompterne og vælg indstillinger
```

---

## 🔧 **3. Deployment til Railway (Alternativ)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set OPENAI_API_KEY=din-key-her
railway variables set DATABASE_URL=din-database-url

# Deploy
railway up
```

---

## 🔧 **4. Environment Variables Checklist**

Før deployment, tjek at du har sat disse:

- [ ] `OPENAI_API_KEY` - **KRITISK for chat & AI features**
- [ ] `DATABASE_URL` - **KRITISK for policies & data**
- [ ] `SUPABASE_URL` & `SUPABASE_ANON_KEY` - **For embeddings**
- [ ] `NEXTAUTH_SECRET` - **For session security**
- [ ] `NEXTAUTH_URL` - **Din production URL**

---

## 🧪 **5. Test Deployment**

Efter deployment, test disse endpoints:

```bash
# Health check
curl https://din-app.vercel.app/api/health

# Tryghedsscore calculation
curl -X POST https://din-app.vercel.app/api/tryghedsscore/calculate \
  -H "Content-Type: application/json" \
  -d '{"profile":{"age":30,"location":"København"}}'

# Policies endpoint
curl https://din-app.vercel.app/api/policies
```

---

## 🚨 **Troubleshooting**

### Build Fejl:
```bash
# Hvis build fejler, kør lokalt først:
npm run build

# Check for TypeScript errors:
npm run type-check
```

### Environment Variable Fejl:
```bash
# Test environment variables lokalt:
node -e "console.log(process.env.OPENAI_API_KEY)"
```

### Database Connection Fejl:
- Tjek at DATABASE_URL er korrekt
- Kør `npx prisma generate` hvis Prisma fejler
- Test connection: `npx prisma db pull`

---

## 📊 **6. Monitoring Efter Deployment**

### Vercel Dashboard:
- Functions → Se API response times
- Analytics → Track usage
- Logs → Se real-time errors

### Custom Monitoring:
```javascript
// Vi har allerede implementeret logging i alle API routes
// Check logs for disse patterns:
console.log('[CHAT_API_INFO]', ...args);
console.log('[TRYGHEDSSCORE_API_ERROR]', ...args);
```

---

## 🎯 **Quick Start Commands**

```bash
# 1. Sæt environment variables i Vercel dashboard
# 2. Kør dette for at tjekke alt er OK:

npm run build          # Tjek build virker
npm run start          # Test production build lokalt
npx prisma generate    # Generer Prisma client
```

---

## 🔗 **Nyttige Links**

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Supabase Setup**: https://supabase.com/docs/guides/getting-started

---

## ✅ **Success Checklist**

Efter deployment skal du kunne:
- [ ] Tilgå din app på `https://dit-projekt.vercel.app`
- [ ] Chat funktionalitet virker
- [ ] Tryghedsscore beregning fungerer
- [ ] Policy upload og analyse virker
- [ ] Logs vises i Vercel dashboard

🎉 **Du er nu live i production!**