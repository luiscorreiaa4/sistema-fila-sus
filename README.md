# Sistema de Transparência de Filas Públicas (SUS)

Projeto integrado das disciplinas de **Engenharia de Software**, **Programação Orientada a Objetos (POO)** e **Banco de Dados** — CESMAC (2026.2).

O sistema permite que cidadãos se cadastrem, agendem consultas e procedimentos, acompanhem sua posição na fila presencial do dia e visualizem chamadas em tempo real no painel público da unidade, com operação assistida por atendentes, profissionais de saúde e administradores.

## Stack Tecnológica

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + TypeScript + Prisma ORM
- **Banco de Dados:** PostgreSQL (instalação local)
- **Especificação e Fluxo:** OpenSpec + Mermaid

## Estrutura Planejada do Repositório

```text
├── backend/          # API Node.js + TypeScript (Domínio POO + Prisma)
├── frontend/         # Aplicação Web React + TypeScript
├── docs/             # Documentação em Markdown, diagramas Mermaid e registro de prompts
│   ├── requisitos-mvp.md
│   ├── arquitetura.md
│   └── prompts/
├── openspec/         # Especificações geradas com OpenSpec (specs/**.md)
├── sql/              # Scripts SQL da 3AF (DDL, Trigger, Index, Roles/Grants, View)
├── AGENTS.md         # Regras do projeto para agentes de IA
└── prd.md            # Product Requirements Document
```

## Pré-requisitos

- **Node.js** `22.12.0` ou superior
- **PostgreSQL** instalado localmente (com `psql` ou pgAdmin)
- **Git**

## Configuração Local (sem Docker)

1. **Crie o banco de dados no PostgreSQL local:**
   ```sql
   CREATE DATABASE filas_sus;
   ```

2. **Configure as variáveis de ambiente do backend:**
   Crie o arquivo `backend/.env` (ignorado pelo Git) com a sua conexão local:
   ```env
   DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/filas_sus?schema=public"
   JWT_SECRET="sua_chave_secreta_local"
   PORT=3333
   ```

3. **Instale as dependências e rode as migrations (após inicializar `backend/` e `frontend/`):**
   ```bash
   # Backend
   cd backend
   npm install
   npx prisma migrate dev
   npm run dev

   # Frontend (em outro terminal)
   cd frontend
   npm install
   npm run dev
   ```

## Documentação e Artefatos

- Escopo do MVP: `docs/requisitos-mvp.md`
- Registro de prompts de IA (3AF): `docs/prompts/`
