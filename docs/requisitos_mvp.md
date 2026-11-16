# Requisitos MVP — Sistema de Transparência de Filas Públicas (SUS)

> Documento base para uso com **grill-me** e **OpenSpec** no Antigravity. Consolida o recorte funcional de ponta a ponta a partir do Documento de Requisitos (Engenharia de Software), das exigências da AV03 (POO) e dos critérios da 3AF (Banco de Dados).

---

## 1. Visão Geral e Stack

- **Objetivo:** Permitir que o cidadão se cadastre, agende consultas/procedimentos, acompanhe sua posição na fila presencial do dia e visualize a chamada no painel público da unidade, com operação completa por atendentes, profissionais de saúde e administradores.
- **Stack:** TypeScript + React (Frontend), TypeScript + Node.js (Backend), Prisma ORM + PostgreSQL (Banco de Dados).
- **Prazo de entrega:** 27 de novembro de 2026.

---

## 2. Requisitos Funcionais do MVP (Fluxo Ponta a Ponta)

### RF003 — Cadastro de Unidades de Saúde
- **Atores:** Administrador.
- **Campos:** `id` (auto), `cnes` (7 dígitos, opcional e único quando informado), `cnpj` (validado, pode se repetir entre unidades da mesma rede), `nome` (3–150 chars, único por município), `telefone` (opcional), `email` (opcional), endereço (`cep`, `logradouro`, `numero`, `bairro`, `municipio`, `estado`, `complemento`), `fusoHorario` (IANA, padrão `America/Maceio`), `status` (`ATIVA` | `INATIVA`, motivo obrigatório na inativação).
- **Regras:** Sem exclusão física (apenas inativação com histórico). Unidade inativa não aceita novas agendas ou marcações.

### RF001 — Cadastro de Paciente (Cidadão)
- **Atores:** Cidadão (autoatendimento) ou Atendente (cadastro assistido).
- **Campos:** `cpf` (único, dígitos verificadores válidos, sequências repetidas recusadas, imutável pelo cidadão), `cns` (Cartão Nacional de Saúde, 15 dígitos validados pelo algoritmo oficial), `nomeCompleto` (3–150 chars), `nomeSocial` (opcional; se preenchido, substitui o civil nas telas e chamadas), `dataNascimento` (não futura nem > 130 anos; idade calculada dinamicamente), `email` (único por paciente), `celular`, `celularWhatsapp` (boolean), `possuiDeficiencia` (`SIM` | `NAO` | `PREFIRO_NAO_INFORMAR`), `tiposDeficiencia` (múltipla: `FISICA`, `AUDITIVA`, `VISUAL`, `INTELECTUAL`, `PSICOSSOCIAL`, `TEA`), `preferenciasAcessibilidade`, endereço completo, `senhaHash`, `cienciaPrivacidadeEm` (DateTime), `situacaoCns` (`PENDENTE_CONFIRMACAO` | `CONFIRMADO` | `DIVERGENTE`), `origemCadastro` (`AUTOATENDIMENTO` | `ASSISTIDO`), `status` (`ATIVO` | `INATIVO`).
- **Regras:** Pelo menos um contato obrigatório. Senha de 8 a 64 caracteres (letras e números, diferente de CPF e data de nascimento), nunca armazenada em texto puro. Gravação atômica ao final do fluxo.
- **Simplificação MVP:** Validação de CPF e CNS feita localmente por algoritmo; integração externa com CADSUS e ViaCEP simulada ou com fallback manual.

### RF002 — Cadastro de Profissional
- **Atores:** Administrador autenticado.
- **Campos:** `cpf` (único entre profissionais), `nomeCompleto`, `nomeSocial` (opcional), `conselhoProfissional`, `numeroRegistro`, `ufRegistro` (obrigatórios para `PROFISSIONAL_SAUDE`), `email` (único), `celular`, `unidadesVinculadas` (lista de IDs, mínimo 1 ativa), `especialidades` (obrigatório para `PROFISSIONAL_SAUDE`), `nivelAcesso` (`ATENDENTE` | `PROFISSIONAL_SAUDE` | `ADMINISTRADOR`), `credencialHash`, `situacaoAcesso` (`CONVITE_PENDENTE` | `ATIVO` | `BLOQUEADO`), `status` (`ATIVO` | `INATIVO`, motivo obrigatório na inativação).
- **Regras:** Cadastro independente do cadastro de paciente (mesma pessoa pode ter ambos). Permissões valem por unidade vinculada. Nenhum usuário amplia o próprio nível de acesso.

### RF007 — Autenticação e Controle de Acesso
- **Atores:** Cidadão, Profissional e Administrador.
- **Campos:** `cpf`, `senha`, `tokenSessao`, `tentativasMalsucedidas`, `bloqueioTemporarioAte`, `ultimoAcesso`.
- **Regras:** Mensagem genérica em falha de login ("CPF ou senha inválidos"). Cadastro/profissional inativo não autentica. Bloqueio temporário por 15 minutos após 5 tentativas malsucedidas. Autorização validada no servidor por usuário, perfil e unidade (nunca confiar apenas em CPF enviado pelo cliente).

### RF008 — Cadastro de Serviços e Gestão de Agendas
- **Atores:** Administrador e Profissional com permissão de agenda.
- **Campos de Serviço:** `nome` (3–150 chars, único por especialidade), `categoria` (`CONSULTA` | `PROCEDIMENTO` | `CIRURGIA`), `especialidade`, `modoAcesso` (`DIRETO` | `REGULADO` — MVP foca em `DIRETO`), `orientacoesPreparo`, `status` (`ATIVO` | `INATIVO`).
- **Campos de Agenda:** `unidadeId`, `servicoId`, `profissionalId` (opcional), `dataInicio`, `dataFim`, `diasHorarios`, `capacidadePorHorario` (> 0), `situacao` (`PUBLICADA` | `BLOQUEADA` | `ENCERRADA`).
- **Regras:** Impedir vagas concorrentes para o mesmo profissional no mesmo intervalo. Publicar a agenda gera as vagas disponíveis para marcação.

### RF004 — Marcação de Consulta/Procedimento (com Meus Agendamentos / Cancelamento — RF006 e RF012)
- **Atores:** Cidadão (aplicativo) e Atendente (marcação assistida).
- **Campos:** `pacienteId`, `unidadeId`, `servicoId`, `profissionalId`, `vagaId`, `dataHoraAtendimento`, `protocolo` (único, gerado pelo sistema), `senhaAtendimento` (código exibido no painel), `versao` (inicia em 1), `origemMarcacao` (`APLICATIVO` | `ASSISTIDA`), `status` (`AGENDADO` | `REALIZADO` | `CANCELADO` | `NAO_REALIZADO`).
- **Regras:** Paciente não pode ter dois agendamentos futuros para o mesmo serviço. Reserva de vaga deve ser **transacional e indivisível** no banco para impedir dupla reserva em requisições simultâneas. Cancelamento pelo cidadão ou atendente libera a vaga imediatamente e registra motivo no histórico.

### RF010 — Confirmação de Chegada (Check-in) e Entrada na Fila
- **Atores:** Atendente vinculado à unidade.
- **Campos:** `agendamentoId`, `pacienteId`, `filaId`, `dataHoraChegada` (gerado pelo servidor), `grupoAtendimento` (`PRIORITARIO` | `COMUM`), `criterioPrioridade`, `senha`, `ordemEntrada`, `situacao` (`AGUARDANDO` | `CHAMADO` | `EM_ATENDIMENTO` | `CONCLUIDO` | `CANCELADO` | `NAO_ATENDIDO`), `atendenteResponsavelId`.
- **Regras:** Localização do agendamento por protocolo ou CPF. Cada agendamento possui no máximo uma entrada ativa na fila do dia (check-in repetido retorna a entrada existente). Prioridade aplicada conforme critérios legais (ex.: idade >= 60 anos calculada pela data de nascimento, deficiência comprovada) e rodízio configurável (padrão 5 prioritários para 1 comum, sem deixar guichê ocioso se um grupo estiver vazio).

### RF011 — Chamada, Registro de Atendimento + RF005 / RF016 (Acompanhamento e Painel Público)
- **Atores:** Atendente, Profissional de Saúde, Cidadão (leitura no app) e Painel Público.
- **Campos:** `entradaFilaId`, `guicheSala`, `dataHoraChamada`, `tentativa`, `estado`, `dataHoraInicio`, `dataHoraConclusao`, `duracaoMinutos`, `motivoAusencia`.
- **Regras:**
  - **Chamar Próximo:** Seleção transacional respeitando o rodízio entre `PRIORITARIO` e `COMUM`; chamadas simultâneas nunca selecionam o mesmo paciente.
  - **Transições de Estado:** `AGUARDANDO` -> `CHAMADO` -> `EM_ATENDIMENTO` -> `CONCLUIDO` (marca agendamento como `REALIZADO`) ou `NAO_ATENDIDO` (recoloca ao fim do grupo uma vez ou encerra com motivo).
  - **RF005 (App do Cidadão):** Exibe apenas ao titular autenticado sua posição atual, pessoas à frente e destino da chamada.
  - **RF016 (Painel Público):** Rota pública exibe exclusivamente `senhaAtendimento`, `guicheSala` e `horarioChamada` (nunca expõe nome, CPF, CNS ou deficiência).

---

## 3. Fora de Escopo do MVP (Cortados para o prazo de 27/11)

- `RF013` (Solicitações reguladas e upload de encaminhamento médico).
- `RF014` (Motor completo de acessibilidade nativa com leitor de tela/vibração — manter apenas bom contraste e layout acessível no React).
- `RF015` (Rotina automatizada diária às 08h com envio real de Push/WhatsApp/E-mail).
- `RF017` e `RF018` (Relatórios gerenciais complexos com exportação PDF/CSV e versionamento histórico de parâmetros).

---

## 4. Requisitos Obrigatórios de POO (AV03 — 60% da nota em Pilares de POO)

O backend em TypeScript deve isolar as regras de negócio do Prisma ORM aplicando explicitamente os 4 pilares:

1. **Abstração e Herança:** Classe abstrata `Usuario` (ou `Pessoa`) contendo atributos comuns (`id`, `cpf`, `nomeCompleto`, `email`, `senhaHash`) e contratos de validação, estendida por `Paciente` e `Profissional`.
2. **Encapsulamento:** Validação de CPF, CNS, senha e transições válidas de estado da fila encapsuladas em métodos das próprias entidades/domínio (não expor alteração direta de status sem regra).
3. **Polimorfismo:** Interface ou classe abstrata de estratégia para ordenação/chamada da fila (ex.: `EstrategiaChamadaFila` com implementações de rodízio `RodizioPrioritarioComum` ou variação), além de interfaces de repositório (`IPacienteRepository`, `IAgendamentoRepository`) desacopladas das implementações concretas com Prisma.
4. **Documentação exigida na AV03:** Pasta `/docs`, `prd.md`, arquivo de arquitetura com diagramas **Mermaid** (`classDiagram`, `erDiagram`, `sequenceDiagram`), pasta `specs/**.md` (OpenSpec), registro das skills usadas e repositório público no GitHub com script do banco.

---

## 5. Requisitos Obrigatórios de Banco de Dados (3AF — 5 pontos)

Como o Prisma não gera todas as estruturas avançadas no `schema.prisma`, criar uma migration SQL customizada ou script `.sql` complementar em PostgreSQL contemplando os 5 itens avaliados (1 ponto cada):

1. **DDL com as 4 Integridades:**
   - *Entidade:* `PRIMARY KEY` em todas as tabelas.
   - *Referencial:* `FOREIGN KEY` com ações explícitas (`ON DELETE RESTRICT` / `CASCADE` conforme regra).
   - *Domínio:* `NOT NULL`, `ENUM` e constraints `CHECK` (ex.: `capacidade_por_horario > 0`, `duracao_minutos >= 0`).
   - *Usuário:* Regras de negócio no banco via constraints/triggers (ex.: impedir alteração direta para transição de status inválida ou unicidade condicional).
2. **Trigger:** Trigger em PL/pgSQL (ex.: registrar automaticamente na tabela `auditoria_eventos` ou `historico_agendamentos` toda alteração de status em `agendamentos` ou `entradas_fila`).
3. **Campo Indexado:** `CREATE INDEX` em colunas de busca/ordenação frequente (ex.: `idx_agendamento_protocolo`, `idx_fila_status_ordem`).
4. **Contas e Permissões:** `CREATE ROLE` / `CREATE USER` e `GRANT` separando permissões (ex.: usuário da aplicação com `SELECT, INSERT, UPDATE` vs. usuário somente leitura `SELECT` na View do painel público).
5. **View:** `CREATE VIEW vw_painel_chamadas_publico` retornando apenas `senha`, `guiche_sala`, `unidade_nome` e `horario_chamada`, ocultando dados pessoais (LGPD).

> **Lembrete para entrega da 3AF (PDF/TXT):** Incluir breve introdução do projeto, **apenas os trechos SQL** correspondentes aos 5 itens acima (não colar o código inteiro) e informar o **modelo de IA e os prompts utilizados**.
