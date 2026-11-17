# Registro de Prompt 03 — Bloco 2: Camada de Domínio POO + Testes Unitários (`AV03`)

- **Data:** 2026-11-17
- **Etapa / Assunto:** Bloco 2 — Implementação da Camada de Domínio em TypeScript Puro (4 Pilares de POO) e Testes Unitários (`node:test`)
- **Ferramenta:** Antigravity
- **Modelo utilizado:** Orchestrator (Argon)

---

## Prompt Literal

```text
Seguindo @AGENTS.md, @docs/arquitetura.md e @openspec/specs/00-dominio-poo-e-arquitetura.md, execute o Bloco 2 (Camada de Domínio POO + Testes Unitários):

1. Em `backend/src/domain/`, implemente todo o domínio em TypeScript puro aplicando explicitamente os 4 pilares de POO (Abstração, Herança, Encapsulamento e Polimorfismo), sem importar `@prisma/client`, `express` ou `zod` em nenhum arquivo de `domain/`:
   - `errors/`: `DomainError`, `ValidationError`, `UnauthorizedError`, `ConflictError`.
   - `value-objects/`: `Cpf` (dígitos verificadores e bloqueio de sequências repetidas), `Cns` (algoritmo oficial SUS para início 1/2 e 7/8/9) e `Senha` (8–64 chars, letras e números, diferente de CPF e data de nascimento).
   - `entities/`: classe abstrata `Usuario` com `Paciente` e `Profissional` herdando dela, além de `UnidadeSaude`, `Servico`, `Agenda`, `VagaAgenda`, `Agendamento`, `EntradaFila` e `ChamadaFila` com invariantes e transições de estado encapsuladas.
   - `strategies/`: interface `EstrategiaChamadaFila`, `RodizioPrioritarioComumStrategy` (rodízio 5:1 sem ociosidade) e `OrdemChegadaStrategy`.
   - `repositories/`: interfaces `IUnidadeSaudeRepository`, `IPacienteRepository`, `IProfissionalRepository`, `IServicoRepository`, `IAgendaRepository`, `IAgendamentoRepository`, `IFilaRepository` e `IPainelPublicoRepository`.

2. Crie testes unitários (com Vitest ou `node:test`) cobrindo `Cpf`, `Cns`, `Senha`, bloqueio após 5 falhas em `Usuario`, cálculo de prioridade legal em `Paciente`, transições de estado em `Agendamento`/`EntradaFila` e o rodízio 5:1 em `RodizioPrioritarioComumStrategy`.

3. Rode os testes para confirmar que todos passam e registre este prompt em `docs/prompts/`.
```

---

## Resumo das Entregas do Bloco 2

1. **Erros de Domínio (`backend/src/domain/errors/`):**
   - `DomainError`, `ValidationError`, `UnauthorizedError` (suportando `401` e `423 Locked`) e `ConflictError` (`409`).
2. **Value Objects (`backend/src/domain/value-objects/`):**
   - `Cpf` (validação módulo 11 Receita Federal e recusa de sequências repetidas `000...`–`999...`).
   - `Cns` (algoritmo oficial SUS/DATASUS para definitivos início `1`/`2` com sufixos `000`/`001` e provisórios início `7`/`8`/`9`).
   - `Senha` (força 8–64 chars com letras e números, bloqueando igualdade com CPF e data de nascimento, com hash `scrypt` nativo via `node:crypto` e suporte a `hashFn`/`compareFn` injetáveis).
3. **Entidades e Pilares de POO (`backend/src/domain/entities/`):**
   - **Abstração e Herança:** `abstract class Usuario` estendida por `Paciente` e `Profissional`, compartilhando `obterNomeExibicao()`, `estaBloqueado()`, `registrarFalhaAutenticacao()` (bloqueio de 15 min após 5 falhas) e `registrarSucessoAutenticacao()`.
   - **Encapsulamento:** `Paciente` (cálculo de idade, `ehPrioritarioLegal()` e `obterCriterioPrioridade()`), `Profissional` (conselho/UF e proteção contra auto-inativação/autoalteração de perfil), `UnidadeSaude` (validação de CNPJ e CNES), `Servico`, `Agenda` (materialização em `VagaAgenda`), `VagaAgenda`, `Agendamento`, `EntradaFila` e `ChamadaFila` com proteção de invariantes e transições válidas.
4. **Polimorfismo (`backend/src/domain/strategies/` e `backend/src/domain/repositories/`):**
   - Interface `EstrategiaChamadaFila` implementada por `RodizioPrioritarioComumStrategy` (5:1 sem ociosidade) e `OrdemChegadaStrategy`.
   - Interfaces desacopladas `IUnidadeSaudeRepository`, `IPacienteRepository`, `IProfissionalRepository`, `IServicoRepository`, `IAgendaRepository`, `IAgendamentoRepository`, `IFilaRepository` e `IPainelPublicoRepository`.
5. **Testes Unitários (`backend/src/domain/__tests__/domain.test.ts`):**
   - 20 testes unitários em 7 suítes (`node:test`) aprovados via `npm test`, `npm run typecheck` e `npm run build` sem nenhuma dependência de `@prisma/client`, `express` ou `zod` em `backend/src/domain/`.
