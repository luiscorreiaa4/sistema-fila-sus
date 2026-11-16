# Registro de Prompt 01 — Validação de Decisões e Planejamento (`grill-me`)

- **Data:** 2026-11-16
- **Etapa / Assunto:** Validação de Requisitos, Arquitetura POO, Banco de Dados (3AF) e Planejamento OpenSpec (`grill-me`)
- **Ferramenta:** Antigravity
- **Modelo utilizado:** Orchestrator (Argon)

---

## Prompt Literal

```text
Leia o arquivo @docs/requisitos-mvp.md e use a skill grill-me para validar e fechar todas as decisões técnicas e de negócio antes de começarmos a codar.

Contexto do projeto:
- Repositório atualmente vazio; vamos construir um MVP ponta a ponta até 27/11 em TypeScript + React (frontend) e TypeScript + Node.js + Prisma + PostgreSQL (backend).
- O projeto será avaliado em 3 disciplinas:
  1. Engenharia de Software (requisitos em docs/requisitos-mvp.md).
  2. POO (60% da nota depende de aplicar os 4 pilares de POO no domínio em TypeScript, isolando regras de negócio do Prisma, além de gerar prd.md, docs/arquitetura.md com diagramas Mermaid e specs/**.md via OpenSpec).
  3. Banco de Dados (precisamos de SQL customizado em PostgreSQL cobrindo: 4 integridades no DDL, 1 Trigger, índices, Contas/Permissões com CREATE ROLE/GRANT e 1 View para o painel público).

Me faça perguntas objetivas, uma ou poucas por vez, sobre estrutura de pastas, modelagem de classes/banco, autenticação, simplificações do MVP e fluxo de geração das specs com OpenSpec até fecharmos o plano completo.
```

---

## Decisões Consolidadas (`grill-me`)

Após duas rodadas de perguntas objetivas, ficaram definidas as seguintes decisões técnicas e de negócio:

1. **Stack Complementar:**
   - **Backend HTTP & Validação:** Express + Zod + `jsonwebtoken` + `bcryptjs` + Prisma ORM (PostgreSQL).
   - **Frontend UI & Rotas:** React + TypeScript (Vite) + Tailwind CSS + React Router.
2. **Modelagem POO vs. Banco de Dados (`RF001` e `RF002`):**
   - **Domínio TS:** Classe abstrata `Usuario` estendida por `Paciente` e `Profissional`, garantindo Abstração, Herança e Encapsulamento.
   - **Banco PostgreSQL / Prisma:** Tabelas separadas `pacientes` e `profissionais`, permitindo que o mesmo CPF possua cadastro independente como cidadão e como profissional conforme exigido no `RF002`.
3. **Autenticação e Bloqueio (`RF007`):**
   - JWT stateless assinado no backend, com campos `tentativas_malsucedidas`, `bloqueio_temporario_ate` e `ultimo_acesso` persistidos diretamente nos registros de `pacientes` e `profissionais`, e seletor de acesso no login ("Sou Cidadão" / "Sou Profissional"). Bloqueio de 15 minutos após 5 falhas consecutivas.
4. **Estrutura de Pastas do Backend (`backend/src`):**
   - Arquitetura em camadas orientada a objetos:
     - `domain/entities/`
     - `domain/value-objects/`
     - `domain/strategies/`
     - `domain/repositories/`
     - `application/use-cases/`
     - `infrastructure/database/prisma/`
     - `infrastructure/http/` (`controllers/`, `middlewares/`, `routes/`, `validators/`)
5. **Gestão de Agendas e Reserva Transacional (`RF008` e `RF004`):**
   - Materializar os slots de horário na tabela `vagas_agenda` (`capacidade_total`, `vagas_ocupadas`) no momento de publicar a agenda, realizando reserva e liberação de vagas em transação atômica no PostgreSQL (`vagas_ocupadas < capacidade_total`).
6. **Tempo Real e Simplificações do MVP (`RF005` e `RF016`):**
   - Polling HTTP automático no React (a cada 3–5 segundos) no Painel Público (`RF016`) e no Acompanhamento da Fila (`RF005`), com destaque visual e alerta sonoro simples no navegador.
   - Validação local de CPF e CNS por algoritmo oficial; fallback manual para ViaCEP e CADSUS.
7. **Pacote SQL da 3AF (`sql/estrutura_3af.sql` + migration customizada):**
   - DDL explícito cobrindo as 4 integridades (Entidade, Referencial, Domínio e Usuário).
   - Trigger PL/pgSQL (`trg_auditoria_validacao_status`) validando transições válidas de status e gravando eventos na tabela `historico_eventos`.
   - Índices explícitos para protocolo, fila ativa e vagas disponíveis.
   - Roles `role_app_filas` (sem `DELETE` físico) e `role_painel_publico` (`SELECT` exclusivo na View).
   - View `vw_painel_chamadas_publico` expondo apenas senha, guichê/sala, unidade e horário da chamada (conformidade LGPD).
8. **Fluxo OpenSpec:**
   - Gerar primeiro a documentação e especificações (`docs/prompts/01-grill-me.md`, `prd.md`, `docs/arquitetura.md` com diagramas Mermaid e `openspec/specs/*.md`) para revisão antes de iniciar a implementação de `backend/`, `sql/` e `frontend/`.
