# AGENTS.md — Diretrizes do Projeto

Este arquivo define as regras obrigatórias para agentes de IA (Antigravity) atuando neste repositório.

## 1. Contexto e Objetivo
- **Projeto:** Sistema de Transparência de Filas Públicas (SUS) — CESMAC.
- **Escopo do MVP:** Definido em `docs/requisitos-mvp.md` (8 RFs essenciais formando fluxo ponta a ponta).
- **Prazo final:** 27 de novembro de 2026.
- **Stack:**
  - Frontend: React + TypeScript (Vite).
  - Backend: Node.js + TypeScript + Prisma ORM.
  - Banco de Dados: PostgreSQL instalado localmente (sem Docker).

---

## 2. Regras Obrigatórias de POO (AV03 — 60% da nota)
Nunca concentre regras de negócio em rotas/controllers ou em chamadas diretas ao `prisma.*`. A camada de domínio em TypeScript deve aplicar explicitamente os 4 pilares da Orientação a Objetos:

1. **Abstração e Herança:**
   - Criar classe base abstrata `Usuario` (ou `Pessoa`) com atributos e contratos comuns (`id`, `cpf`, `nomeCompleto`, `email`, `senhaHash`).
   - `Paciente` e `Profissional` devem estender essa classe base.
2. **Encapsulamento:**
   - Regras de validação (dígitos verificadores de CPF, algoritmo de CNS, força de senha) e transições válidas de estado de agendamento/fila devem ficar encapsuladas em métodos das próprias entidades/domínio.
3. **Polimorfismo:**
   - Usar interfaces/classes abstratas para estratégias de chamada/prioridade da fila (ex.: `EstrategiaOrdenacaoFila` com rodízio prioritário/comum) e interfaces de repositório (`IPacienteRepository`, `IAgendamentoRepository`, etc.) desacopladas das implementações concretas com Prisma.
4. **Documentação Obrigatória (Markdown):**
   - Manter `/docs`, `prd.md`, `docs/arquitetura.md` (com diagramas **Mermaid**: `classDiagram`, `erDiagram`, `sequenceDiagram`) e `specs/**.md` (via OpenSpec).

---

## 3. Regras Obrigatórias de Banco de Dados (3AF — 5 pontos)
O banco é PostgreSQL local. Como o Prisma não gera todas as estruturas avançadas no `schema.prisma`, toda a parte SQL exigida na 3AF deve ser criada em migration SQL customizada e/ou consolidada em `sql/estrutura_3af.sql` contendo explicitamente:

1. **DDL com as 4 Integridades:** Entidade (`PRIMARY KEY`), Referencial (`FOREIGN KEY`), Domínio (`NOT NULL`, `ENUM`, `CHECK`) e Usuário (regras de negócio via constraints/triggers).
2. **Trigger:** Pelo menos 1 `TRIGGER` em PL/pgSQL (ex.: auditoria automática de mudanças de status em agendamentos ou entradas da fila).
3. **Campo Indexado:** `CREATE INDEX` explícito para colunas de busca/ordenação frequente.
4. **Contas e Permissões:** `CREATE ROLE` / `CREATE USER` e `GRANT` separando permissões (ex.: usuário da aplicação vs. usuário somente leitura para painel/relatórios).
5. **View:** Pelo menos 1 `VIEW` (ex.: `vw_painel_chamadas_publico`) exibindo apenas senha, guichê/sala e horário, sem expor dados pessoais (LGPD).

---

## 4. Registro Automático de Prompts (Obrigatório para a 3AF)
Sempre que o usuário enviar um prompt relevante para **arquitetura, specs (`grill-me` / `openspec`), modelagem do Prisma ou SQL (DDL, Trigger, Index, Roles/Grants, View)**:

1. Crie ou atualize um arquivo numerado em `docs/prompts/` (ex.: `01-grill-me.md`, `02-openspec.md`, `03-banco-sql.md`) antes de finalizar a tarefa.
2. Registre obrigatoriamente:
   - **Data**
   - **Etapa / Assunto**
   - **Ferramenta:** Antigravity
   - **Modelo utilizado**
   - **Prompt literal:** cópia exata do texto enviado pelo usuário em bloco de citação ou código.
