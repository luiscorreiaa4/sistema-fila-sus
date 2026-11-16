# OpenSpec 03 — Check-in, Fila Polimórfica, Atendimento e Painel Público (`RF010`, `RF011`, `RF005`, `RF016`)

## 1. Escopo
Especifica o fluxo presencial na unidade de saúde: confirmação de chegada (`RF010`), seleção polimórfica e registro de chamadas/atendimentos (`RF011`), acompanhamento em tempo real pelo cidadão (`RF005`) e exibição no Painel Público em conformidade com a LGPD (`RF016`).

---

## 2. Regras de Negócio e Endpoints

### 2.1. Check-in / Confirmação de Chegada (`RF010`)
- `POST /api/fila/check-in` — `ATENDENTE` ou `ADMINISTRADOR` vinculado à unidade do agendamento.
  - **Payload:** `{ protocolo?: string, cpf?: string, unidadeId: string }` (pelo menos `protocolo` ou `cpf` obrigatório).
  - **Regras:**
    1. Localiza o agendamento na `unidadeId` com `status = 'AGENDADO'` para a data atual (considerando o fuso `America/Maceio`).
    2. **Idempotência:** Se já existir uma entrada em `entradas_fila` para aquele `agendamentoId` com situação ativa (`AGUARDANDO`, `CHAMADO`, `EM_ATENDIMENTO`), retorna `200 OK` com a entrada existente.
    3. **Prioridade Legal (Domínio `Paciente`):**
       - Se `paciente.ehPrioritarioLegal(agora)` for `true` (idade >= 60 anos ou `possuiDeficiencia === 'SIM'`), `grupoAtendimento = 'PRIORITARIO'` e `criterioPrioridade = paciente.obterCriterioPrioridade(agora)` (`IDOSO_60_MAIS`, `PCD` ou `AMBOS`).
       - Caso contrário, `grupoAtendimento = 'COMUM'` e `criterioPrioridade = 'PADRAO'`.
    4. Gera `senhaAtendimento` legível do dia na unidade: prefixo `P-XXX` para prioritário ou `C-XXX` para comum (sincronizada também com o agendamento para o painel), e `ordemEntrada` sequencial da fila do dia na unidade.
    5. Cria `EntradaFila` com `situacao = 'AGUARDANDO'` e `dataHoraChegada = now()`.

### 2.2. Chamada Polimórfica e Transições (`RF011`)
- `POST /api/fila/chamar-proximo` — `ATENDENTE` ou `PROFISSIONAL_SAUDE` vinculado à `unidadeId`.
  - **Payload:** `{ unidadeId: string, guicheSala: string(min 2), estrategia?: 'RODIZIO_5_1' | 'ORDEM_CHEGADA' }`.
  - **Execução Transacional:**
    1. Dentro de transação PostgreSQL, executa lock pessimista (`SELECT ... FROM entradas_fila WHERE unidade_id = :unidadeId AND situacao = 'AGUARDANDO' FOR UPDATE SKIP LOCKED`) impedindo que dois guichês/salas selecionem o mesmo paciente simultaneamente.
    2. Conta quantos atendimentos `PRIORITARIO` foram chamados em sequência desde a última chamada `COMUM` na unidade no dia (`prioritariosSeguidosNoCiclo`).
    3. Instancia a estratégia via interface polimórfica `EstrategiaChamadaFila` (`RodizioPrioritarioComumStrategy` padrão 5:1 ou `OrdemChegadaStrategy`) e executa `selecionarProximaEntrada(...)`.
    4. Se fila vazia -> retorna `200 OK` `{ chamada: null, mensagem: "Nenhum paciente aguardando na fila" }`.
    5. Atualiza `EntradaFila.chamar()` (`AGUARDANDO -> CHAMADO`) e cria `ChamadaFila` (`estado = 'CHAMADO'`, `tentativa = contagem + 1`, `guicheSala`, `dataHoraChamada = now()`).

- `POST /api/fila/chamadas/:entradaId/rechamar` — Emite nova chamada para o mesmo paciente em estado `CHAMADO` (incrementando `tentativa` e atualizando `dataHoraChamada` para reaparecer em destaque no painel).
- `PATCH /api/fila/chamadas/:entradaId/iniciar` — Transição `CHAMADO -> EM_ATENDIMENTO` (preenche `dataHoraInicio = now()`).
- `PATCH /api/fila/chamadas/:entradaId/concluir` — Transição `EM_ATENDIMENTO -> CONCLUIDO` (calcula `duracaoMinutos` em `ChamadaFila` e atualiza o `Agendamento` vinculado para `REALIZADO`).
- `PATCH /api/fila/chamadas/:entradaId/ausente` — Transição `CHAMADO -> NAO_ATENDIDO` (exige `{ motivoAusencia?: string }`):
  - Se `entrada.recolocacoes === 0`, permite recolocar uma única vez ao fim do mesmo grupo (`recolocacoes = 1`, `situacao = 'AGUARDANDO'`, nova `ordemEntrada` ao final do dia), preservando histórico da chamada como `NAO_ATENDIDO`.
  - Se já houve 1 recolocação (ou operador optar por encerrar definitivamente), marca `EntradaFila` como `NAO_ATENDIDO` e `Agendamento` como `NAO_REALIZADO`.

### 2.3. Listagem Operacional da Fila (Autenticada)
- `GET /api/fila/unidade/:unidadeId` — `ATENDENTE`, `PROFISSIONAL_SAUDE`, `ADMINISTRADOR` vinculados à unidade.
  - Retorna fila do dia ordenada (aguardando, chamados, em atendimento e concluídos recentes), exibindo nome de exibição do paciente (`nomeSocial || nomeCompleto`), critério de prioridade, senha e protocolo.

### 2.4. Acompanhamento pelo Cidadão (`RF005`)
- `GET /api/fila/minha-posicao` — Somente `PACIENTE` autenticado.
  - Retorna para cada entrada ativa do paciente no dia: `unidadeNome`, `senhaAtendimento`, `grupoAtendimento`, `situacao`, `posicaoNaFila`, `pessoasAFrente` (calculado considerando a política de prioridade vigente na unidade) e, se `situacao` for `CHAMADO` ou `EM_ATENDIMENTO`, o `guicheSala` e `dataHoraChamada`.
  - Frontend realiza polling a cada **4 segundos**.

### 2.5. Painel Público LGPD (`RF016`)
- `GET /api/publico/painel/:unidadeId` — Rota **pública** (sem JWT de paciente/profissional).
  - Consulta exclusivamente `SELECT unidade_id, unidade_nome, senha_atendimento, guiche_sala, horario_chamada, tentativa, estado FROM vw_painel_chamadas_publico WHERE unidade_id = :unidadeId ORDER BY horario_chamada DESC LIMIT 10`.
  - **Regra LGPD estrita:** O JSON de resposta **nunca** inclui `nomeCompleto`, `nomeSocial`, `cpf`, `cns`, `pacienteId`, `tiposDeficiencia` ou `criterioPrioridade`.
  - Frontend realiza polling a cada **4 segundos**, destacando a última senha chamada e reproduzindo alerta sonoro via Web Audio API quando `horarioChamada` / `tentativa` da chamada mais recente mudar.

---

## 3. Cenários de Comportamento (Given / When / Then)

- **Cenário 1 — Check-in idempotente e prioridade automática:**
  - *Dado* um paciente de 65 anos com agendamento `AGENDADO` para hoje na UBS Centro;
  - *Quando* o atendente executa `POST /api/fila/check-in` duas vezes seguidas com o mesmo protocolo;
  - *Então* apenas 1 `EntradaFila` é criada com `grupoAtendimento = 'PRIORITARIO'`, `criterioPrioridade = 'IDOSO_60_MAIS'`, e a segunda chamada devolve o registro existente.
- **Cenário 2 — Rodízio 5:1 sem ociosidade:**
  - *Dado* 5 chamadas prioritárias seguidas já realizadas e 2 pacientes `COMUM` aguardando;
  - *Quando* o profissional clica em "Chamar Próximo";
  - *Então* `RodizioPrioritarioComumStrategy` seleciona o primeiro paciente `COMUM`. Caso não haja nenhum `COMUM` aguardando, seleciona o próximo `PRIORITARIO` sem travar o atendimento.
- **Cenário 3 — Privacidade no Painel Público:**
  - *Dado* uma chamada ativa para Maria Silva (Idosa, CPF `123...`);
  - *Quando* a TV consulta `GET /api/publico/painel/:unidadeId`;
  - *Então* o retorno contém apenas `{ senhaAtendimento: "P-001", guicheSala: "Consultorio 02", unidadeNome: "UBS Centro", horarioChamada: "..." }`.
