# PRD — Sistema de Transparência de Filas Públicas (SUS)

## 1. Visão Geral do Produto e Contexto Acadêmico

O **Sistema de Transparência de Filas Públicas (SUS)** é uma aplicação web ponta a ponta desenvolvida para digitalizar o agendamento de consultas e procedimentos, o check-in presencial, a chamada ordenada por prioridade legal e o painel público de transparência em unidades básicas e ambulatoriais do SUS.

O projeto integra três disciplinas do **CESMAC (2026.2)** com entrega prevista para **27 de novembro de 2026**:

1. **Engenharia de Software:** Entrega de um MVP funcional ponta a ponta cobrindo os requisitos essenciais descritos em [`docs/requisitos-mvp.md`](docs/requisitos-mvp.md).
2. **Programação Orientada a Objetos (POO — AV03):** Aplicação explícita dos **4 pilares da Orientação a Objetos** (Abstração, Herança, Encapsulamento e Polimorfismo) na camada de domínio em TypeScript, isolada do Prisma ORM, acompanhada de `prd.md`, `docs/arquitetura.md` (com diagramas Mermaid) e especificações em `openspec/specs/*.md`.
3. **Banco de Dados (3AF):** Modelagem e implementação em PostgreSQL local contemplando as 4 integridades no DDL, Trigger em PL/pgSQL, Índices explícitos, Contas/Permissões (`CREATE ROLE`/`GRANT`) e View pública em conformidade com a LGPD.

---

## 2. Stack Tecnológica Definida

- **Frontend:** React + TypeScript (Vite) + Tailwind CSS + React Router.
- **Backend:** Node.js + TypeScript + Express + Zod + `jsonwebtoken` + `bcryptjs` + Prisma ORM.
- **Banco de Dados:** PostgreSQL local (sem Docker), banco `filas_sus`.
- **Especificação e Documentação:** OpenSpec (`openspec/specs/*.md`) + Mermaid + Markdown.

---

## 3. Atores e Perfis de Acesso

| Ator / Perfil | Descrição | Principais Responsabilidades no MVP |
| :--- | :--- | :--- |
| **Cidadão / Paciente** | Usuário final atendido pela rede pública. | Realizar autocadastro (`RF001`), autenticar-se (`RF007`), agendar consultas/procedimentos (`RF004`), consultar/cancelar seus agendamentos (`RF006`/`RF012`) e acompanhar sua posição em tempo real na fila após o check-in (`RF005`). |
| **Atendente** | Profissional de recepção vinculado a uma ou mais unidades. | Realizar cadastro assistido de pacientes (`RF001`), marcação assistida (`RF004`), cancelamento assistido (`RF012`), confirmar chegada via protocolo ou CPF (`RF010`) e gerenciar chamadas de recepção (`RF011`). |
| **Profissional de Saúde** | Médico, enfermeiro ou especialista com conselho profissional. | Gerir agendas de seus serviços (quando autorizado) (`RF008`), chamar próximo paciente da fila para sua sala/consultório, iniciar e concluir atendimentos ou registrar ausência (`RF011`). |
| **Administrador** | Gestor da rede ou unidade de saúde. | Cadastrar e inativar unidades de saúde (`RF003`), cadastrar e vincular profissionais (`RF002`), cadastrar serviços (`RF008`) e publicar/bloquear agendas (`RF008`). |
| **Painel Público (TV/Totem)** | Tela de exibição pública instalada na recepção da unidade. | Consultar continuamente a View pública (`RF016`) exibindo exclusivamente senha de atendimento, guichê/sala, unidade e horário da chamada (LGPD). |

---

## 4. Fluxo Ponta a Ponta do MVP (Jornada do Usuário)

1. **Configuração da Unidade e Oferta (`Administrador`):**
   - Cadastra a unidade de saúde (`RF003`), cadastra o profissional (`RF002`) com vínculo à unidade ativa, cria o serviço (`RF008`) e publica a agenda (`RF008`), materializando os slots em `vagas_agenda`.
2. **Cadastro e Acesso do Cidadão (`Paciente` / `Atendente`):**
   - O cidadão realiza autocadastro (ou é cadastrado de forma assistida pelo atendente) validando CPF e CNS (`RF001`) e autentica-se com CPF e senha (`RF007`).
3. **Agendamento Transacional (`Paciente` / `Atendente`):**
   - O usuário seleciona unidade, serviço e horário disponível em uma agenda `PUBLICADA`. O sistema reserva a vaga de forma atômica, verifica ausência de agendamento futuro duplicado para o mesmo serviço e gera `protocolo` único e `senhaAtendimento` (`RF004`).
4. **Gestão de Meus Agendamentos (`Paciente` / `Atendente`):**
   - O usuário consulta seus agendamentos (`RF006`) e pode cancelar antes da realização, informando motivo e liberando imediatamente a vaga (`RF012`).
5. **Check-in na Recepção (`Atendente`):**
   - No dia do atendimento, o atendente localiza o agendamento por protocolo ou CPF e confirma a chegada (`RF010`). O sistema calcula o grupo (`PRIORITARIO` ou `COMUM`) com base na idade (>= 60 anos) ou deficiência declarada e cria uma entrada única na fila do dia (`AGUARDANDO`).
6. **Chamada Polimórfica e Atendimento (`Atendente` / `Profissional de Saúde`):**
   - O operador solicita "Chamar Próximo" (`RF011`). O motor de fila aplica a estratégia de rodízio configurada (padrão 5 prioritários para 1 comum, sem deixar guichê ocioso se um grupo estiver vazio), realiza seleção transacional evitando colisão simultânea e registra a chamada (`CHAMADO`).
   - O profissional inicia (`EM_ATENDIMENTO`) e conclui (`CONCLUIDO`, atualizando o agendamento para `REALIZADO`) ou registra ausência (`NAO_ATENDIDO`, permitindo 1 recolocação no fim do grupo ou encerramento com motivo).
7. **Transparência em Tempo Real (`Cidadão` e `Painel Público`):**
   - O aplicativo do cidadão consulta a cada 3–5 segundos sua posição exata, quantas pessoas estão à frente e o guichê/sala quando chamado (`RF005`).
   - O painel público da unidade consulta a cada 3–5 segundos a rota pública alimentada pela `VIEW` `vw_painel_chamadas_publico` (`RF016`), emitindo alerta visual e sonoro simples sem expor nenhum dado pessoal.

---

## 5. Requisitos Funcionais e Critérios de Aceitação

### RF003 — Cadastro de Unidades de Saúde
- **Campos:** `id`, `cnes` (7 dígitos numéricos, opcional e único quando informado), `cnpj` (14 dígitos validados, pode repetir entre unidades da mesma rede), `nome` (3–150 caracteres, único por `municipio`), `telefone`, `email`, endereço completo (`cep`, `logradouro`, `numero`, `bairro`, `municipio`, `estado`, `complemento`), `fusoHorario` (padrão `America/Maceio`), `status` (`ATIVA` | `INATIVA`), `motivoInativacao`.
- **Critérios de Aceitação:**
  - Não existe exclusão física (`DELETE`) de unidades.
  - Inativação exige `motivoInativacao` não vazio.
  - Unidades com status `INATIVA` não permitem criação/publicação de novas agendas nem novos agendamentos.

### RF001 — Cadastro de Paciente (Cidadão)
- **Campos:** `cpf` (11 dígitos válidos, sequências repetidas recusadas, único e imutável pelo cidadão), `cns` (15 dígitos validados pelo algoritmo oficial do SUS), `nomeCompleto` (3–150 chars), `nomeSocial` (opcional; substitui o nome civil em telas autenticadas e chamadas internas quando preenchido), `dataNascimento` (não futura e idade <= 130 anos), `email` (único por paciente), `celular`, `celularWhatsapp`, `possuiDeficiencia` (`SIM` | `NAO` | `PREFIRO_NAO_INFORMAR`), `tiposDeficiencia` (`FISICA`, `AUDITIVA`, `VISUAL`, `INTELECTUAL`, `PSICOSSOCIAL`, `TEA`), `preferenciasAcessibilidade`, endereço completo, `senhaHash`, `cienciaPrivacidadeEm`, `situacaoCns` (`PENDENTE_CONFIRMACAO` | `CONFIRMADO` | `DIVERGENTE`), `origemCadastro` (`AUTOATENDIMENTO` | `ASSISTIDO`), `status` (`ATIVO` | `INATIVO`).
- **Critérios de Aceitação:**
  - Pelo menos um contato (`email` ou `celular`) é obrigatório.
  - Senha entre 8 e 64 caracteres contendo letras e números, diferente do CPF e da data de nascimento; armazenada com hash `bcrypt`.
  - Aceite de privacidade (`cienciaPrivacidadeEm`) obrigatório no autocadastro.
  - Validação algorítmica local de CPF e CNS no Value Object de domínio; endereço e validação cadastral operam com fallback manual sem dependência de API externa.

### RF002 — Cadastro de Profissional
- **Campos:** `cpf` (11 dígitos válidos, único entre profissionais), `nomeCompleto`, `nomeSocial`, `conselhoProfissional`, `numeroRegistro`, `ufRegistro` (obrigatórios para `PROFISSIONAL_SAUDE`), `email` (único entre profissionais), `celular`, `unidadesVinculadas` (mínimo 1 unidade `ATIVA`), `especialidades` (obrigatório para `PROFISSIONAL_SAUDE`), `nivelAcesso` (`ATENDENTE` | `PROFISSIONAL_SAUDE` | `ADMINISTRADOR`), `credencialHash`, `situacaoAcesso` (`CONVITE_PENDENTE` | `ATIVO` | `BLOQUEADO`), `status` (`ATIVO` | `INATIVO`), `motivoInativacao`.
- **Critérios de Aceitação:**
  - Cadastro independente da tabela `pacientes`: o mesmo CPF pode existir simultaneamente como paciente e como profissional.
  - Permissões são restritas às `unidadesVinculadas` ao profissional.
  - Nenhum profissional pode alterar seu próprio `nivelAcesso`.
  - Inativação exige `motivoInativacao` e bloqueia novos logins.

### RF007 — Autenticação e Controle de Acesso
- **Campos:** `cpf`, `senha`, `tipoUsuario` (`PACIENTE` | `PROFISSIONAL` selecionado na tela de login), `tentativasMalsucedidas`, `bloqueioTemporarioAte`, `ultimoAcesso`.
- **Critérios de Aceitação:**
  - Falha de login retorna sempre a mensagem genérica `"CPF ou senha inválidos"`, sem revelar se o CPF existe.
  - Paciente com `status = INATIVO` ou profissional com `status = INATIVO` ou `situacaoAcesso = BLOQUEADO` não autentica.
  - Após **5 tentativas malsucedidas** consecutivas, o usuário é bloqueado por **15 minutos** (`bloqueioTemporarioAte = now + 15min`), zerando o contador após login bem-sucedido.
  - Token JWT assinado contém identificador, tipo de usuário, perfil e unidades vinculadas; toda autorização é validada no servidor.

### RF008 — Cadastro de Serviços e Gestão de Agendas
- **Serviço:** `nome` (3–150 chars, único por especialidade), `categoria` (`CONSULTA` | `PROCEDIMENTO` | `CIRURGIA`), `especialidade`, `modoAcesso` (`DIRETO` | `REGULADO` — MVP opera em `DIRETO`), `orientacoesPreparo`, `status` (`ATIVO` | `INATIVO`).
- **Agenda:** `unidadeId`, `servicoId`, `profissionalId` (opcional), `dataInicio`, `dataFim`, `diasHorarios` (dias da semana + horários de atendimento), `capacidadePorHorario` (> 0), `situacao` (`PUBLICADA` | `BLOQUEADA` | `ENCERRADA`).
- **Critérios de Aceitação:**
  - Impedir criação/publicação de agenda com sobreposição de horário para o mesmo `profissionalId`.
  - Ao publicar uma agenda (`PUBLICADA`), o sistema materializa os registros correspondentes na tabela `vagas_agenda` com `capacidade_total = capacidadePorHorario` e `vagas_ocupadas = 0`.
  - Não é permitido publicar agenda em unidade `INATIVA` ou serviço `INATIVO`.

### RF004, RF006 e RF012 — Marcação, Meus Agendamentos e Cancelamento
- **Campos do Agendamento:** `pacienteId`, `unidadeId`, `servicoId`, `profissionalId`, `vagaId`, `dataHoraAtendimento`, `protocolo` (único), `senhaAtendimento`, `versao`, `origemMarcacao` (`APLICATIVO` | `ASSISTIDA`), `status` (`AGENDADO` | `REALIZADO` | `CANCELADO` | `NAO_REALIZADO`), `motivoCancelamento`.
- **Critérios de Aceitação:**
  - Paciente não pode possuir dois agendamentos futuros com status `AGENDADO` para o mesmo `servicoId`.
  - Reserva de vaga ocorre dentro de transação no PostgreSQL incrementando `vagas_ocupadas` apenas se `vagas_ocupadas < capacidade_total`, garantindo zero dupla reserva em concorrência.
  - Cancelamento (`RF012`) exige motivo, altera o status para `CANCELADO`, decrementa `vagas_ocupadas` na `vagas_agenda` atomicamente e registra o evento no histórico.

### RF010 — Confirmação de Chegada (Check-in) e Entrada na Fila
- **Campos:** `agendamentoId`, `pacienteId`, `unidadeId`, `dataHoraChegada` (gerado no servidor), `grupoAtendimento` (`PRIORITARIO` | `COMUM`), `criterioPrioridade` (`IDOSO_60_MAIS` | `PCD` | `AMBOS` | `PADRAO`), `senhaAtendimento`, `ordemEntrada`, `situacao` (`AGUARDANDO` | `CHAMADO` | `EM_ATENDIMENTO` | `CONCLUIDO` | `CANCELADO` | `NAO_ATENDIDO`), `recolocacoes` (contagem de retorno ao fim da fila), `atendenteResponsavelId`.
- **Critérios de Aceitação:**
  - Atendente vinculado à unidade localiza o agendamento do dia por `protocolo` ou `cpf`.
  - Operação idempotente: se o agendamento já possuir entrada ativa na fila do dia, retorna a entrada existente sem duplicar.
  - Prioridade automática calculada no domínio: idade >= 60 anos (pela `dataNascimento`) ou `possuiDeficiencia = SIM` classificam no grupo `PRIORITARIO`.

### RF011, RF005 e RF016 — Chamada, Atendimento, Acompanhamento e Painel Público
- **Campos da Chamada:** `entradaFilaId`, `guicheSala`, `dataHoraChamada`, `tentativa`, `estado` (`CHAMADO` | `EM_ATENDIMENTO` | `CONCLUIDO` | `NAO_ATENDIDO`), `dataHoraInicio`, `dataHoraConclusao`, `duracaoMinutos`, `motivoAusencia`, `profissionalChamadorId`.
- **Critérios de Aceitação:**
  - **Chamar Próximo (`RF011`):** Seleção transacional com lock no banco respeitando o rodízio configurável (padrão 5 `PRIORITARIO` para 1 `COMUM`, avançando para o outro grupo se o grupo da vez estiver vazio). Chamadas concorrentes nunca selecionam o mesmo paciente.
  - **Transições de Estado:** `AGUARDANDO` -> `CHAMADO` -> `EM_ATENDIMENTO` -> `CONCLUIDO` (atualiza agendamento para `REALIZADO` e calcula `duracaoMinutos`) ou `NAO_ATENDIDO` (permite 1 recolocação ao fim do mesmo grupo ou encerra o agendamento como `NAO_REALIZADO` com `motivoAusencia`).
  - **App do Cidadão (`RF005`):** Rota autenticada retorna somente ao titular sua senha, grupo, posição atual, quantidade de pessoas à frente e `guicheSala` quando chamado (polling 3–5s).
  - **Painel Público (`RF016`):** Rota pública `GET /api/publico/painel/:unidadeId` consulta exclusivamente `vw_painel_chamadas_publico` e retorna apenas `senhaAtendimento`, `guicheSala`, `unidadeNome`, `horarioChamada` e `tentativa`.

---

## 6. Escopo Fora do MVP e Simplificações Assumidas

- **Cortados do MVP:**
  - `RF013`: Solicitações reguladas e upload de encaminhamento médico.
  - `RF014`: Motor nativo completo de acessibilidade (manter contraste adequado, foco visível e semântica HTML no React).
  - `RF015`: Job diário automatizado às 08h com envio real de Push/WhatsApp/E-mail.
  - `RF017` e `RF018`: Relatórios gerenciais complexos com exportação PDF/CSV e versionamento de parâmetros.
- **Simplificações Técnicas Validadas:**
  - Validação algorítmica local de CPF e CNS (sem chamada real ao CADSUS) e preenchimento de endereço com fallback manual (sem dependência obrigatória do ViaCEP).
  - Atualização em tempo real do Painel Público e App do Cidadão via polling HTTP a cada 3–5 segundos, com alerta sonoro via Web Audio API no navegador.

---

## 7. Requisitos Não Funcionais

- **Isolamento POO (AV03):** Entidades, Value Objects, Estratégias e Interfaces de Repositório em `backend/src/domain` não devem importar `PrismaClient` ou módulos HTTP (`express`).
- **Segurança e LGPD:** Senhas e credenciais sempre com hash `bcrypt`; JWT assinado no servidor; Painel Público sem qualquer exposição de `nomeCompleto`, `nomeSocial`, `cpf`, `cns` ou `tiposDeficiencia`.
- **Integridade Transacional:** Reserva/cancelamento de vagas e seleção do próximo paciente da fila executados em transações atômicas PostgreSQL (`SERIALIZABLE` ou lock pessimista `FOR UPDATE SKIP LOCKED` / update condicional).
- **Auditoria e Banco de Dados (3AF):** Toda mudança de status em `agendamentos` e `entradas_fila` validada e registrada automaticamente por Trigger PL/pgSQL em `historico_eventos`; ausência de exclusão física em entidades críticas.
