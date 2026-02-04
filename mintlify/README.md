# Documentação Mintlify — Agente de Criativos Instagram

Esta pasta contém a documentação da API do agente de criativos para Instagram, para uso na [Mintlify](https://mintlify.com).

## Estrutura

- **docs.json** — Configuração do site (tema, cores, navegação, OpenAPI).
- **openapi.yaml** — Especificação do endpoint `POST /creative/generate`.
- **intro.mdx** — Página de introdução.
- **best-practices.mdx** — Boas práticas para instruções.
- **limitations.mdx** — Observações técnicas e limitações.

## Como publicar na Mintlify

1. Acesse [mintlify.com/start](https://mintlify.com/start) e conecte seu repositório GitHub.
2. Se a documentação estiver numa subpasta (`mintlify/`), configure o **documentation path** para `mintlify` no dashboard.
3. O Mintlify gera as páginas da API a partir de `openapi.yaml` e publica as páginas MDX.

## Preview local (opcional)

Com o [Mintlify CLI](https://www.mintlify.com/docs/installation) instalado:

```bash
npm i -g mint
cd mintlify
mintlify dev
```

A documentação fica disponível em `http://localhost:3000`.
