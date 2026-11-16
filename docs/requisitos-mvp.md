# Requisitos MVP — Sistema de Transparência de Filas Públicas (SUS)

> Documento base único de requisitos do MVP (referenciado por `AGENTS.md`, `README.md`, `prd.md`, `grill-me` e `openspec/specs/`). Consolida o recorte funcional de ponta a ponta a partir do Documento de Requisitos (Engenharia de Software), das exigências da AV03 (POO), dos critérios da 3AF (Banco de Dados) e das decisões técnicas fechadas no `grill-me`.

---

## 1. Visão Geral e Stack

- **Objetivo:** Permitir que o cidadão se cadastre, agende consultas/procedimentos, acompanhe sua posição na fila presencial do dia e visualize a chamada no painel público da unidade, com operação completa por atendentes, profissionais de saúde e administradores.
- **Stack Consolidada (`grill-me`):**
  - **Frontend:** React + TypeScript (Vite) + Tailwind CSS + React Router.
  - **Backend:** Node.js + TypeScript + Express + Zod + `jsonwebtoken` + `bcryptjs` + Prisma ORM.
  - **Banco de Dados:** PostgreSQL local (`filas_sus`, sem Docker).
- **Prazo de entrega:** 27 de novembro de 2026.

---

## 2. Requisitos Funcionais do MVP (Fluxo Ponta a Ponta)

### RF003 — Cadastro de Unidades de Saúde
- **Atores:** Administrador.
- **Campos:** `id` (auto), `cnes` (7 dígitos, opcional e único quando informado), `cnpj` (validado, pode se repetir entre unidades da mesma rede), `nome` (3–150 chars, único por município), `telefone` (opcional), `email` (opcional), endereço (`cep`, `logradouro`, `numero`, `bairro`, `municipio`, `estado`, `complemento`), `fusoHorario` (IANA, padrão `America/Maceio`), `status` (`ATIVA` | `INATIVA`, motivo obrigatório na inativação).
- **Regras e Critérios de Aceitação:** Sem exclusão física (apenas inativação com motivo >= 5 caracteres e histórico). Unidade inativa não aceita novas agendas ou marcações.

### RF001 — Cadastro de Paciente (Cidadão)
- **Atores:** Cidadão (autoatendimento) ou Atendente (cadastro assistido).
- **Campos:** `cpf` (único, dígitos verificadores válidos, sequências repetidas recusadas, imutável pelo cidadão), `cns` (Cartão Nacional de Saúde, 15 dígitos validados pelo algoritmo oficial), `nomeCompleto` (3–150 chars), `nomeSocial` (opcional; se preenchido, substitui o civil nas telas e chamadas), `dataNascimento` (não futura nem > 130 anos; idade calculada dinamicamente), `email` (único por paciente), `celular`, `celularWhatsapp` (boolean), `possuiDeficiencia` (`SIM` | `NAO` | `PREFIRO_NAO_INFORMAR`), `tiposDeficiencia` (múltipla: `FISICA`, `AUDITIVA`, `VISUAL`, `INTELECTUAL`, `PSICOSSOCIAL`, `TEA`), `preferenciasAcessibilidade`, endereço completo, `senhaHash`, `cienciaPrivacidadeEm` (DateTime), `situacaoCns` (`PENDENTE_CONFIRMACAO` | `CONFIRMADO` | `DIVERGENTE`), `origemCadastro` (`AUTOATENDIMENTO` | `ASSISTIDO`), `status` (`ATIVO` | `INATIVO`).
- **Regras e Critérios de Aceitação:** Pelo menos um contato (`email` ou `celular`) obrigatório. Senha de 8 a 64 caracteres (letras e números, diferente de CPF e data de nascimento), nunca armazenada em texto puro (`bcrypt`). Aceite de privacidade obrigatório no autocadastro. Gravação atômica ao final do fluxo.
- **Simplificação MVP:** Validação de CPF e CNS feita localmente por algoritmo nos Value Objects de domínio; integração externa com CADSUS e ViaCEP simulada ou com fallback manual.

### RF002 — Cadastro de Profissional
- **Atores:** Administrador autenticado.
- **Campos:** `cpf` (único entre profissionais), `nomeCompleto`, `nomeSocial` (opcional), `conselhoProfissional`, `numeroRegistro`, `ufRegistro` (obrigatórios para `PROFISSIONAL_SAUDE`), `email` (único), `celular`, `unidadesVinculadas` (lista de IDs, mínimo 1 ativa), `especialidades` (obrigatório para `PROFISSIONAL_SAUDE`), `nivelAcesso` (`ATENDENTE` | `PROFISSIONAL_SAUDE` | `ADMINISTRADOR`), `credencialHash`, `situacaoAcesso` (`CONVITE_PENDENTE` | `ATIVO` | `BLOQUEADO`), `status` (`ATIVO` | `INATIVO`, motivo obrigatório na inativação).
- **Regras e Critérios de Aceitação:** Cadastro independente da tabela `pacientes` (mesma pessoa pode ter ambos pelo mesmo CPF). Permissões valem apenas por unidade vinculada. Nenhum usuário amplia ou altera o próprio nível de acesso.

### RF007 — Autenticação e Controle de Acesso
- **Atores:** Cidadão, Profissional e Administrador.
- **Campos:** `cpf`, `senha`, `tipoUsuario` (`PACIENTE` | `PROFISSIONAL`), `tentativasMalsucedidas`, `bloqueioTemporarioAte`, `ultimoAcesso`.
- **Regras e Critérios de Aceitação:** Seletor de acesso no login ("Sou Cidadão" / "Sou Profissional") com JWT stateless assinado no servidor. Mensagem genérica em falha de login (`"CPF ou senha inválidos"`). Cadastro/profissional inativo ou bloqueado não autentica. Bloqueio temporário por 15 minutos após 5 tentativas malsucedidas consecutivas (persistido nos registros de `pacientes` e `profissionais`). Autorização validada no servidor por usuário, perfil e unidade (nunca confiar apenas em CPF enviado pelo cliente).

### RF008 — Cadastro de Serviços e Gestão de Agendas
- **Atores:** Administrador e Profissional com permissão de agenda.
- **Campos de Serviço:** `nome` (3–150 chars, único por especialidade), `categoria` (`CONSULTA` | `PROCEDIMENTO` | `CIRURGIA`), `especialidade`, `modoAcesso` (`DIRETO` | `REGULADO` — MVP foca em `DIRETO`), `orientacoesPreparo`, `status` (`ATIVO` | `INATIVO`).
- **Campos de Agenda:** `unidadeId`, `servicoId`, `profissionalId` (opcional), `dataInicio`, `dataFim`, `diasHorarios`, `capacidadePorHorario` (> 0), `situacao` (`PUBLICADA` | `BLOQUEADA` | `ENCERRADA`).
- **Regras e Critérios de Aceitação:** Impedir vagas concorrentes para o mesmo profissional no mesmo intervalo. Publicar a agenda (`PUBLICADA`) materializa os slots na tabela `vagas_agenda` (`capacidade_total`, `vagas_ocupadas = 0`). Unidades ou serviços inativos não aceitam publicação de agendas.

### RF004 — Marcação de Consulta/Procedimento (com Meus Agendamentos / Cancelamento — RF006 e RF012)
- **Atores:** Cidadão (aplicativo) e Atendente (marcação assistida).
- **Campos:** `pacienteId`, `unidadeId`, `servicoId`, `profissionalId`, `vagaId`, `dataHoraAtendimento`, `protocolo` (único, gerado pelo sistema), `senhaAtendimento` (código exibido no painel), `versao` (inicia em 1), `origemMarcacao` (`APLICATIVO` | `ASSISTIDA`), `status` (`AGENDADO` | `REALIZADO` | `CANCELADO` | `NAO_REALIZADO`), `motivoCancelamento`.
- **Regras e Critérios de Aceitação:** Paciente não pode ter dois agendamentos futuros ativos (`AGENDADO`) para o mesmo serviço. Reserva de vaga é **transacional e indivisível** no banco (`vagas_ocupadas < capacidade_total`) para impedir dupla reserva em requisições simultâneas. Cancelamento pelo cidadão ou atendente exige motivo, libera a vaga imediatamente (`vagas_ocupadas - 1`) e registra o evento no histórico via trigger.

### RF010 — Confirmação de Chegada (Check-in) e Entrada na Fila
- **Atores:** Atendente vinculado à unidade.
- **Campos:** `agendamentoId`, `pacienteId`, `unidadeId`, `dataHoraChegada` (gerado pelo servidor), `grupoAtendimento` (`PRIORITARIO` | `COMUM`), `criterioPrioridade`, `senhaAtendimento`, `ordemEntrada`, `situacao` (`AGUARDANDO` | `CHAMADO` | `EM_ATENDIMENTO` | `CONCLUIDO` | `CANCELADO` | `NAO_ATENDIDO`), `recolocacoes`, `atendenteResponsavelId`.
- **Regras e Critérios de Aceitação:** Localização do agendamento do dia por protocolo ou CPF. Operação idempotente: cada agendamento possui no máximo uma entrada ativa na fila do dia (check-in repetido retorna a entrada existente). Prioridade aplicada automaticamente pelo domínio `Paciente` conforme critérios legais (idade >= 60 anos calculada pela data de nascimento ou deficiência declarada) e rodízio configurável (padrão 5 prioritários para 1 comum, sem deixar guichê ocioso se um grupo estiver vazio).

### RF011 — Chamada, Registro de Atendimento + RF005 / RF016 (Acompanhamento e Painel Público)
- **Atores:** Atendente, Profissional de Saúde, Cidadão (leitura no app) e Painel Público.
- **Campos:** `entradaFilaId`, `guicheSala`, `dataHoraChamada`, `tentativa`, `estado`, `dataHoraInicio`, `dataHoraConclusao`, `duracaoMinutos`, `motivoAusencia`, `profissionalChamadorId`.
- **Regras e Critérios de Aceitação:**
  - **Chamar Próximo:** Seleção transacional com lock (`FOR UPDATE SKIP LOCKED`) respeitando o rodízio polimórfico entre `PRIORITARIO` e `COMUM`; chamadas simultâneas nunca selecionam o mesmo paciente.
  - **Transições de Estado:** `AGUARDANDO` -> `CHAMADO` -> `EM_ATENDIMENTO` -> `CONCLUIDO` (marca agendamento como `REALIZADO` e calcula `duracaoMinutos`) ou `NAO_ATENDIDO` (recoloca ao fim do grupo uma vez ou encerra como `NAO_REALIZADO` com motivo).
  - **RF005 (App do Cidadão):** Exibe apenas ao titular autenticado sua posição atual, pessoas à frente e destino da chamada, atualizado via polling HTTP automático (3–5s).
  - **RF016 (Painel Público):** Rota pública alimentada pela view `vw_painel_chamadas_publico`, atualizada via polling HTTP (3–5s) com destaque visual e alerta sonoro simples no navegador, exibindo exclusivamente `senhaAtendimento`, `guicheSala`, `unidadeNome` e `horarioChamada` (nunca expõe nome, CPF, CNS ou deficiência).

---

## 3. Fora de Escopo do MVP (Cortados para o prazo de 27/11)

- `RF013` (Solicitações reguladas e upload de encaminhamento médico).
- `RF014` (Motor completo de acessibilidade nativa com leitor de tela/vibração — manter apenas bom contraste e layout acessível no React).
- `RF015` (Rotina automatizada diária às 08h com envio real de Push/WhatsApp/E-mail).
- `RF017` e `RF018` (Relatórios gerenciais complexos com exportação PDF/CSV e versionamento histórico de parâmetros).

---

## 4. Requisitos Obrigatórios de POO (AV03 — 60% da nota em Pilares de POO)

O backend em TypeScript (`backend/src/`) segue arquitetura em camadas (`domain/entities`, `domain/value-objects`, `domain/strategies`, `domain/repositories`, `application/use-cases`, `infrastructure/database/prisma`, `infrastructure/http`) isolando as regras de negócio do Prisma ORM e aplicando os 4 pilares:

1. **Abstração e Herança:** Classe abstrata `Usuario` contendo atributos comuns (`id`, `cpf`, `nomeCompleto`, `nomeSocial`, `email`, `senhaHash`, controle de bloqueio) e contratos abstratos, estendida por `Paciente` e `Profissional` (com tabelas separadas `pacientes` e `profissionais` no PostgreSQL).
2. **Encapsulamento:** Value Objects (`Cpf`, `Cns`, `Senha`) e transições válidas de estado de agendamento/fila encapsulados em métodos das próprias entidades de domínio (sem expor alteração direta de status sem regra).
3. **Polimorfismo:** Interface `EstrategiaChamadaFila` com implementações `RodizioPrioritarioComumStrategy` (5:1) e `OrdemChegadaStrategy`, além de interfaces de repositório (`IPacienteRepository`, `IAgendamentoRepository`, `IFilaRepository`, etc.) desacopladas das implementações concretas com Prisma.
4. **Documentação exigida na AV03:** Pasta `/docs`, `prd.md`, `docs/arquitetura.md` com diagramas **Mermaid** (`classDiagram`, `erDiagram`, `sequenceDiagram`), pasta `openspec/specs/*.md` (OpenSpec), registro de prompts em `docs/prompts/` e repositório público no GitHub com script do banco.

---

## 5. Requisitos Obrigatórios de Banco de Dados (3AF — 5 pontos)

Script complementar em `sql/estrutura_3af.sql` (e migration customizada no PostgreSQL) contemplando os 5 itens avaliados (1 ponto cada):

1. **DDL com as 4 Integridades:**
   - *Entidade:* `PRIMARY KEY` em todas as tabelas.
   - *Referencial:* `FOREIGN KEY` com ações explícitas (`ON DELETE RESTRICT` / `CASCADE` conforme regra).
   - *Domínio:* `NOT NULL`, `ENUM` e constraints `CHECK` (ex.: `capacidade_por_horario > 0`, `vagas_ocupadas <= capacidade_total`, `duracao_minutos >= 0`).
   - *Usuário:* Regras de negócio no banco via índices únicos parciais (`uq_agendamento_paciente_servico_ativo`) e validação de transições válidas em trigger.
2. **Trigger:** Trigger PL/pgSQL (`fn_validar_e_auditar_status`) validando transições e registrando automaticamente em `historico_eventos` toda alteração de status em `agendamentos` ou `entradas_fila`.
3. **Campo Indexado:** `CREATE INDEX` em colunas de busca/ordenação frequente (`idx_agendamentos_protocolo`, `idx_entradas_fila_unidade_situacao_ordem`, `idx_vagas_agenda_disponiveis`).
4. **Contas e Permissões:** `CREATE ROLE` e `GRANT` separando `role_app_filas` (`SELECT, INSERT, UPDATE`, sem `DELETE` físico) de `role_painel_publico` (`SELECT` exclusivamente em `vw_painel_chamadas_publico`).
5. **View:** `CREATE VIEW vw_painel_chamadas_publico` retornando apenas `chamada_id`, `unidade_id`, `unidade_nome`, `senha_atendimento`, `guiche_sala`, `horario_chamada`, `tentativa` e `estado`, ocultando dados pessoais (LGPD).

> **Lembrete para entrega da 3AF (PDF/TXT):** Incluir breve introdução do projeto, **apenas os trechos SQL** correspondentes aos 5 itens acima (não colar o código inteiro) e informar o **modelo de IA e os prompts utilizados**.
