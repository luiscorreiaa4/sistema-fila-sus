# Registro de Prompt 02 — Bloco 1: Setup e Banco de Dados (`3AF`)

- **Data:** 2026-11-17
- **Etapa / Assunto:** Bloco 1 — Inicialização do Backend/Frontend, Modelagem Prisma ORM (`schema.prisma`) e Script SQL da 3AF (`sql/estrutura_3af.sql`)
- **Ferramenta:** Antigravity
- **Modelo utilizado:** Orchestrator (Argon)

---

## Prompt Literal

```text
Seguindo @AGENTS.md, @docs/arquitetura.md e @openspec/specs/04-banco-dados-3af.md, execute o Bloco 1 (Setup + Banco de Dados):

1. Inicialize `backend/` (Node.js + TypeScript + Express + Zod + jsonwebtoken + bcryptjs + Prisma ORM) com a estrutura de pastas definida em `docs/arquitetura.md`.
2. Inicialize `frontend/` (React + TypeScript + Vite + Tailwind CSS + React Router).
3. Crie `backend/prisma/schema.prisma` mapeando todas as tabelas, enums e relações do `erDiagram` e da spec `04-banco-dados-3af.md`.
4. Crie `sql/estrutura_3af.sql` com os 5 itens obrigatórios da 3AF: DDL com as 4 integridades (PK, FK com RESTRICT/CASCADE, CHECK/ENUM/NOT NULL e índices únicos parciais), Trigger PL/pgSQL (`fn_validar_e_auditar_status` + `historico_eventos`), `CREATE INDEX`, `CREATE ROLE` / `GRANT` (`role_app_filas` e `role_painel_publico`) e a View `vw_painel_chamadas_publico`.
5. Crie também um `backend/.env.example` para PostgreSQL local (sem Docker) e registre este prompt em `docs/prompts/`.
```

---

## Resumo das Entregas do Bloco 1

1. **`backend/` inicializado:**
   - Estrutura de camadas POO criada em `backend/src/{domain/{entities,value-objects,strategies,repositories,errors},application/use-cases,infrastructure/{database/prisma,http/{controllers,middlewares,routes,validators}}}` e `backend/prisma/migrations/`.
   - Configuração em `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/src/infrastructure/database/prisma/client.ts`, `backend/src/infrastructure/http/app.ts` e `backend/src/server.ts`.
2. **`backend/prisma/schema.prisma`:**
   - Mapeamento dos 16 enums PostgreSQL e das 11 tabelas (`unidades_saude`, `pacientes`, `profissionais`, `profissionais_unidades`, `servicos`, `agendas`, `vagas_agenda`, `agendamentos`, `entradas_fila`, `chamadas_fila`, `historico_eventos`).
3. **`sql/estrutura_3af.sql`:**
   - DDL idempotente com as 4 integridades (PK, FK com `RESTRICT`/`CASCADE`, `NOT NULL`/`ENUM`/`CHECK`, índices únicos parciais `uq_agendamento_paciente_servico_ativo` e `uq_cnes_nao_nulo`).
   - Função e triggers PL/pgSQL `fn_validar_e_auditar_status()` em `agendamentos` e `entradas_fila` gravando em `historico_eventos`.
   - Índices de consulta/ordenação (`idx_agendamentos_protocolo`, `idx_agendamentos_paciente_status`, `idx_entradas_fila_unidade_situacao_ordem`, `idx_vagas_agenda_disponiveis`, `idx_chamadas_fila_horario`, `idx_historico_eventos_entidade`).
   - View LGPD `vw_painel_chamadas_publico` sem exposição de dados pessoais.
   - Roles `role_app_filas` (sem `DELETE` operacional, exceto tabela associativa `profissionais_unidades`) e `role_painel_publico` (`SELECT` exclusivo na view).
4. **`frontend/` inicializado:**
   - React + TypeScript + Vite + Tailwind CSS + React Router configurados com estrutura `src/{components,contexts,pages,services}` e `frontend/.env.example`.
