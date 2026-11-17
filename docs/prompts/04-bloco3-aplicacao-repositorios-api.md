# Registro de Prompt 04 — Bloco 3: Camada de Aplicação, Repositórios Prisma e API HTTP

- **Data:** 2026-11-17
- **Etapa / Assunto:** Bloco 3 — Serviços de Aplicação (`IHashService`, `ITokenService`), Casos de Uso (Specs 01, 02 e 03), Repositórios Prisma (`$transaction`, `FOR UPDATE SKIP LOCKED`, View LGPD), API HTTP (Zod, JWT, RBAC, CORS), Seed e Testes de Integração
- **Ferramenta:** Antigravity
- **Modelo utilizado:** Orchestrator (Argon)

---

## Prompt Literal

```text
Seguindo @AGENTS.md, @docs/arquitetura.md e as specs @openspec/specs/01-unidades-usuarios-autenticacao.md, @openspec/specs/02-servicos-agendas-agendamentos.md e @openspec/specs/03-fila-atendimento-painel.md, execute o Bloco 3 (Aplicação, Repositórios Prisma e API HTTP):

1. Em `backend/src/application/`, crie os serviços auxiliares por interface (`IHashService`, `ITokenService`) e todos os casos de uso das Specs 01, 02 e 03, injetando apenas as interfaces de `domain/repositories/` (sem importar Prisma nos use cases).
2. Em `backend/src/infrastructure/database/prisma/`, implemente os repositórios concretos `Prisma*Repository` mapeando entre modelos do Prisma e entidades de domínio:
   - Use `$transaction` atômica na reserva e liberação de vagas (`vagas_ocupadas < capacidade_total`) e `FOR UPDATE SKIP LOCKED` em `chamarProximoAtomico`.
   - Em `PrismaPainelPublicoRepository`, consulte exclusivamente a view `vw_painel_chamadas_publico` sem retornar dados pessoais.
3. Em `backend/src/infrastructure/http/`, implemente validadores Zod, middlewares de autenticação JWT e autorização por perfil/unidade, controllers, rotas e `server.ts` (com CORS habilitado para o frontend).
4. Crie `backend/prisma/seed.ts` populando 1 unidade ativa, 1 administrador, 1 atendente, 1 profissional de saúde, 1 serviço, 1 agenda publicada com vagas e 1 paciente de teste.
5. Rode `npx tsc --noEmit` (e testes de integração/smoke test nas rotas principais se possível) e registre este prompt em `docs/prompts/`.
```

---

## Resumo das Entregas do Bloco 3

1. **Erros Complementares de Domínio (`backend/src/domain/errors/`):**
   - `NotFoundError` (`404`) e `ForbiddenError` (`403`) exportados em `errors/index.ts`.
2. **Camada de Aplicação (`backend/src/application/`):**
   - Interfaces de serviço `IHashService` e `ITokenService`, utilitário `dataMaceio.ts` e casos de uso em `use-cases/` para `unidades`, `pacientes`, `profissionais`, `auth`, `servicos`, `agendas`, `agendamentos` e `fila` — sem nenhuma importação de `@prisma/client`, `express`, `zod`, `bcryptjs` ou `jsonwebtoken`.
3. **Repositórios Prisma e Segurança (`backend/src/infrastructure/`):**
   - `BcryptHashService` e `JwtTokenService`.
   - `mappers.ts` e repositórios concretos `PrismaUnidadeSaudeRepository`, `PrismaPacienteRepository`, `PrismaProfissionalRepository`, `PrismaServicoRepository`, `PrismaAgendaRepository`, `PrismaAgendamentoRepository` (`$transaction` atômica na reserva/liberação de vagas), `PrismaFilaRepository` (`FOR UPDATE SKIP LOCKED` em `chamarProximoAtomico`) e `PrismaPainelPublicoRepository` (consulta exclusiva à view LGPD `vw_painel_chamadas_publico`).
4. **API HTTP (`backend/src/infrastructure/http/`):**
   - Schemas Zod (`validators/schemas.ts`), serializers (`presenters/presenters.ts`), middlewares JWT/perfil/unidade (`authMiddleware.ts`) e tratamento global de erros (`errorHandler.ts`), 9 controllers, roteador `/api` em `routes/index.ts`, `app.ts` com CORS e `server.ts` com encerramento gracioso.
5. **Seed e Verificação (`backend/prisma/seed.ts` e testes):**
   - Seed idempotente executado com sucesso (`UBS Centro — Maceió`, 1 administrador, 1 atendente, 1 profissional de saúde, 1 serviço, 1 agenda publicada com 105 vagas e 1 paciente de teste).
   - `npx tsc --noEmit`, `npm run build` e `npm run test:all` (24 testes em 8 suítes: 20 unitários de domínio + 4 testes de integração ponta a ponta com PostgreSQL local) executados e aprovados.
