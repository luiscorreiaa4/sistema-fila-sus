# OpenSpec 02 — Serviços, Agendas e Agendamentos (`RF008`, `RF004`, `RF006`, `RF012`)

## 1. Escopo
Especifica o cadastro de Serviços (`RF008`), criação/publicação de Agendas com materialização de vagas (`RF008`), marcação transacional de consultas/procedimentos (`RF004`), consulta de agendamentos (`RF006`) e cancelamento com liberação imediata de vaga (`RF012`).

---

## 2. Regras de Negócio e Endpoints

### 2.1. Serviços (`RF008`)
- `POST /api/servicos` — `ADMINISTRADOR`.
  - **Payload:** `{ nome: string(3..150), categoria: 'CONSULTA' | 'PROCEDIMENTO' | 'CIRURGIA', especialidade: string, modoAcesso: 'DIRETO' | 'REGULADO' (padrão 'DIRETO'), orientacoesPreparo?: string }`.
  - **Regra:** Unicidade de `(nome, especialidade)` (case-insensitive).
- `GET /api/servicos` — Lista serviços ativos (com filtro por `categoria` e `especialidade`).
- `PATCH /api/servicos/:id/inativar` — `ADMINISTRADOR`.

### 2.2. Agendas e Materialização de Vagas (`RF008`)
- `POST /api/agendas` — `ADMINISTRADOR` ou `PROFISSIONAL_SAUDE` vinculado à `unidadeId`.
  - **Payload:**
    ```json
    {
      "unidadeId": "uuid",
      "servicoId": "uuid",
      "profissionalId": "uuid | null",
      "dataInicio": "YYYY-MM-DD",
      "dataFim": "YYYY-MM-DD",
      "diasHorarios": [
        { "diaSemana": 1, "horarios": ["08:00", "09:00", "10:00"] }
      ],
      "capacidadePorHorario": 4,
      "publicar": true
    }
    ```
    *(Onde `diaSemana`: `0 = Domingo` ... `6 = Sábado`.)*
  - **Regras:**
    - `unidade` deve estar `ATIVA` e `servico` deve estar `ATIVO`.
    - `capacidadePorHorario > 0` e `dataFim >= dataInicio`.
    - Se `profissionalId` for informado, validar que ele está vinculado à `unidadeId` e **não possui agenda publicada/concorrente** nos mesmos horários do intervalo `[dataInicio, dataFim]`.
    - Quando `publicar = true` (ou ao chamar `POST /api/agendas/:id/publicar`), a entidade `Agenda.publicar()` gera todos os objetos `VagaAgenda` para as datas do intervalo correspondentes aos `diasHorarios`, iniciando `capacidadeTotal = capacidadePorHorario` e `vagasOcupadas = 0`, persistindo tudo em transação única.
- `GET /api/agendas/disponiveis` — Consulta vagas com `vagasOcupadas < capacidadeTotal`, `dataHoraInicio >= agora` e agenda `PUBLICADA`, filtrando por `unidadeId`, `servicoId` e intervalo de datas.
- `PATCH /api/agendas/:id/situacao` — Permite alterar entre `PUBLICADA`, `BLOQUEADA` e `ENCERRADA`.

### 2.3. Marcação Transacional (`RF004`)
- `POST /api/agendamentos` — `PACIENTE` (para si próprio) ou `ATENDENTE` vinculado à unidade (informando `pacienteId`, marcação assistida).
  - **Payload:** `{ vagaId: string, pacienteId?: string }` (`pacienteId` obrigatório apenas quando chamado por `ATENDENTE`).
  - **Regras e Atomicidade:**
    1. Verificar se a `unidade` está `ATIVA`, a `agenda` está `PUBLICADA` e a `vaga.dataHoraInicio > agora`.
    2. Verificar se o `paciente` já possui outro agendamento futuro com `status = 'AGENDADO'` para o mesmo `servicoId`. Caso sim -> `409 Conflict` (`"Paciente já possui agendamento ativo para este serviço"`).
    3. Gerar `protocolo` único no formato `SUS-YYYYMMDD-XXXXXX` e `senhaAtendimento` no formato `P001` / `C001` (ou prefixo sequencial diário da unidade, sendo o grupo confirmado no check-in).
    4. **Reserva Atômica no PostgreSQL (dentro de `$transaction`):**
       - Executa `UPDATE vagas_agenda SET vagas_ocupadas = vagas_ocupadas + 1 WHERE id = :vagaId AND vagas_ocupadas < capacidade_total`.
       - Se 0 linhas afetadas -> `ROLLBACK` e retorna `409 Conflict` (`"Não há mais vagas disponíveis para este horário"`).
       - Insere `agendamentos` com `versao = 1`, `status = 'AGENDADO'`, `origemMarcacao = 'APLICATIVO' | 'ASSISTIDA'`.

### 2.4. Meus Agendamentos (`RF006`) e Cancelamento (`RF012`)
- `GET /api/agendamentos/meus` — Somente `PACIENTE` (retorna apenas os agendamentos do próprio titular autenticado).
- `GET /api/agendamentos/unidade/:unidadeId` — `ATENDENTE`, `PROFISSIONAL_SAUDE` ou `ADMINISTRADOR` vinculado à unidade; aceita filtro por `protocolo`, `cpf` ou `data`.
- `PATCH /api/agendamentos/:id/cancelar` — `PACIENTE` (apenas seu próprio agendamento) ou `ATENDENTE` (da unidade).
  - **Payload:** `{ motivoCancelamento: string(min 5) }`.
  - **Fluxo Transacional:**
    1. Busca o agendamento e valida no domínio (`agendamento.cancelar(motivo)`): somente status `AGENDADO` pode ser cancelado.
    2. Dentro de `$transaction`: atualiza `status = 'CANCELADO'`, `motivoCancelamento`, incrementa `versao` e executa `UPDATE vagas_agenda SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - 1) WHERE id = :vagaId`.
    3. Trigger PL/pgSQL registra o evento `AGENDADO -> CANCELADO` em `historico_eventos`.

---

## 3. Cenários de Comportamento (Given / When / Then)

- **Cenário 1 — Concorrência na última vaga:**
  - *Dado* uma `VagaAgenda` com `capacidadeTotal = 1` e `vagasOcupadas = 0`;
  - *Quando* dois cidadãos distintos enviam `POST /api/agendamentos` simultaneamente para a mesma `vagaId`;
  - *Então* apenas uma transação atualiza `vagas_ocupadas` para `1` e cria o agendamento (`201 Created`), enquanto a segunda recebe `409 Conflict`.
- **Cenário 2 — Impedimento de duplicidade futura no mesmo serviço:**
  - *Dado* que o paciente já possui um agendamento futuro `AGENDADO` para `Cardiologia`;
  - *Quando* tenta marcar outra consulta para o mesmo `servicoId`;
  - *Então* o sistema bloqueia com `409 Conflict`.
- **Cenário 3 — Cancelamento libera vaga imediatamente:**
  - *Dado* uma vaga lotada (`vagasOcupadas = 1`, `capacidadeTotal = 1`);
  - *Quando* o paciente cancela com motivo válido;
  - *Então* o agendamento vai para `CANCELADO` e `vagasOcupadas` volta a `0`, permitindo nova marcação imediata.
