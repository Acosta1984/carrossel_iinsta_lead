# API de Geração de Criativos (Gemini 2.5 Flash Image – Nano Banana)

API REST que gera criativos estáticos (imagens 1:1, 4:5, 9:16) para anúncios e posts a partir de briefing de marca, usando o modelo **gemini-2.5-flash-image** via SDK `@google/genai`.

## Estrutura

```
src/
├── config/           # Configuração (env)
├── domain/           # Tipos, entidades (Creative, Job, Briefing)
├── services/         # Prompt Engine (Nano Banana), Creative Service
├── infrastructure/   # Gemini client, Storage (local/S3)
├── controllers/      # Rotas REST
└── index.ts          # App Express
tests/
├── unit/             # promptEngine, gemini (extractImageFromResponse), storage
└── integration/      # Creatives API (POST/GET)
docs/api/
└── openapi.yaml      # Contrato da API
```

## Setup

```bash
cp .env.example .env
# Edite .env e defina GEMINI_API_KEY (obrigatório para geração)
npm install
```

## Como rodar

```bash
# Desenvolvimento (tsx watch)
npm run dev

# Build + start
npm run build && npm start
```

Servidor em `http://localhost:3000` (ou `PORT` do `.env`).

**Swagger UI:** `http://localhost:3000/api-docs` — documentação interativa para testar os endpoints.

## Como testar

```bash
# Todos os testes
npm test

# Só unitários
npm run test:unit

# Só integração
npm run test:integration
```

**Nota:** Testes de integração que chamam `POST /creatives` podem retornar 500 se `GEMINI_API_KEY` não estiver definido (API real). Os demais testes não dependem da chave.

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/creatives` | Gera lote de criativos (body = briefing) |
| GET | `/creatives/:job_id` | Status e resultados do job |
| GET | `/creatives/asset/:creative_id` | Detalhe de um criativo |
| POST | `/creative/generate` | Agente de criativos Instagram (caption, visual, hashtags, CTA) |
| POST | `/prompts/preview` | Preview de prompts (Nano Banana–ready) |

Contrato completo: `docs/api/openapi.yaml`. Documentação técnica do agente de criativos (Mintlify): pasta `mintlify/` — ver [mintlify/README.md](mintlify/README.md).

## Exemplo de request (POST /creatives)

```json
{
  "brand": { "name": "MinhaMarca", "tone": "modern", "colors": ["#000", "#fff"] },
  "campaign": { "objective": "awareness", "cta": "Saiba mais" },
  "creative_spec": {
    "n_variations": 3,
    "aspect_ratios": ["1:1", "4:5", "9:16"],
    "image_style": "ugc_cinematic",
    "quality": "high"
  },
  "product": { "name": "Produto X", "description": "Descrição curta" }
}
```

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Sim (para geração) | Chave da API Gemini (AI Studio) |
| `PORT` | Não | Porta do servidor (default 3000) |
| `STORAGE_PROVIDER` | Não | `local` (default) ou `s3` |
| `STORAGE_LOCAL_PATH` | Não | Pasta para imagens (local) |
| `CREATIVES_BASE_URL` | Não | URL base dos criativos (ex: CDN) |

## Docker

### Build e execução local

```bash
# Build
docker build -t creatives-api-gemini:local .

# Run (passe GEMINI_API_KEY)
docker run --rm -p 3000:3000 -e GEMINI_API_KEY=your_key creatives-api-gemini:local

# Com volume para persistir criativos
docker run --rm -p 3000:3000 -e GEMINI_API_KEY=your_key -v creatives_data:/app/storage/creatives creatives-api-gemini:local
```

### Docker Compose

```bash
# Crie .env com GEMINI_API_KEY e opcionais (PORT, CREATIVES_BASE_URL, etc.)
docker-compose up -d
```

A API fica em `http://localhost:3000`; imagens geradas são salvas no volume `creatives_storage`.

---

## GitHub e Docker Hub (produção)

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "feat: API de criativos com Gemini 2.5 Flash Image"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/creatives-api-gemini.git
git push -u origin main
```

### 2. Configurar Docker Hub

1. Crie uma conta em [Docker Hub](https://hub.docker.com) (se ainda não tiver).
2. Crie um repositório (ex.: `creatives-api-gemini`).
3. Em **Account Settings → Security → Access Tokens**, crie um token com permissão **Read, Write, Delete**.

### 3. Secrets no GitHub

No repositório GitHub: **Settings → Secrets and variables → Actions**:

| Secret               | Valor                          |
|----------------------|--------------------------------|
| `DOCKERHUB_USERNAME` | Seu usuário Docker Hub         |
| `DOCKERHUB_TOKEN`    | Token de acesso do passo acima |

### 4. Build e push automático

O workflow `.github/workflows/docker-publish.yml`:

- **Push em `main`**: faz build e push da imagem para `SEU_USUARIO/creatives-api-gemini:latest` e `:main`.
- **Release publicado**: gera tags adicionais a partir da release.

Após o push em `main`, a imagem estará disponível em:

```text
docker.io/SEU_USUARIO/creatives-api-gemini:latest
```

### 5. Rodar em produção (servidor)

```bash
# Pull da imagem
docker pull SEU_USUARIO/creatives-api-gemini:latest

# Run com env (ou use um arquivo .env)
docker run -d --name creatives-api \
  -p 3000:3000 \
  -e GEMINI_API_KEY=sua_chave \
  -e CREATIVES_BASE_URL=https://seu-dominio.com/creatives-static \
  -v creatives_data:/app/storage/creatives \
  --restart unless-stopped \
  SEU_USUARIO/creatives-api-gemini:latest
```

Em produção, configure um proxy reverso (Nginx, Caddy, etc.) e sirva os arquivos estáticos em `/creatives-static` ou aponte `CREATIVES_BASE_URL` para um CDN.

---

## Critérios de aceite (PRD)

- POST /creatives gera pelo menos 3 imagens usando **gemini-2.5-flash-image** (verificável em `meta.model` e logs).
- Cada criativo tem `prompt_final`, `meta.model = "gemini-2.5-flash-image"` e URL válida.
- API suporta múltiplos jobs (ex.: 5 jobs × 6 criativos) sem timeouts internos; latência por imagem ~3–10 s.
