# Contas e Dados Iniciais do Seed

Este documento reúne as credenciais de acesso e os registros base criados pelo script idempotente [backend/prisma/seed.ts](../backend/prisma/seed.ts).

## Como executar o seed

A partir da raiz do projeto:

```bash
npm run db:seed
```

Ou diretamente na pasta `backend/`:

```bash
npm run db:seed
# equivalente a: npx tsx prisma/seed.ts
```

---

## Resumo das Credenciais de Acesso

| Perfil | Nome | CPF (somente números) | CPF formatado | E-mail | Senha |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrador** | Carlos Eduardo Almeida (Admin) | `11144477735` | `111.444.777-35` | `admin@saude.maceio.gov.br` | `AdminSus2026` |
| **Atendente** | Fernanda Oliveira Santos (Recepção) | `22255588846` | `222.555.888-46` | `atendente@saude.maceio.gov.br` | `AtendeSus2026` |
| **Profissional de Saúde** | Dr. Roberto Mendes Silva | `12345678909` | `123.456.789-09` | `medico@saude.maceio.gov.br` | `MedicoSus2026` |
| **Profissional de Saúde (Cardio)** | Dra. Helena Costa | `45612378955` | `456.123.789-55` | `helena.costa@saude.maceio.gov.br` | `MedicoSus2026` |
| **Paciente (Cidadão)** | Maria da Silva | `52998224725` | `529.982.247-25` | `maria.silva@email.com` | `CidadaoSus2026` |
| **Paciente Demo 1 (Idosa)** | Antônia Ferreira Lima | `85274196373` | `852.741.963-73` | `antonia.lima@email.com` | `CidadaoSus2026` |
| **Paciente Demo 2 (Comum)** | João Pedro Santos | `65498732155` | `654.987.321-55` | `joao.santos@email.com` | `CidadaoSus2026` |

---

## Detalhamento das Contas

### 1. Administrador
- **Nome completo:** Carlos Eduardo Almeida (Admin)
- **CPF:** `11144477735` (`111.444.777-35`)
- **E-mail:** `admin@saude.maceio.gov.br`
- **Celular:** `82999001100`
- **Senha:** `AdminSus2026`
- **Nível de acesso:** `ADMINISTRADOR`
- **Situação de acesso / Status:** `ATIVO` / `ATIVO`
- **Unidade vinculada:** UBS Centro — Maceió (CNES `2001001`)
- **Especialidades:** `Gestão em Saúde`

### 2. Atendente (Recepção)
- **Nome completo:** Fernanda Oliveira Santos (Recepção)
- **CPF:** `22255588846` (`222.555.888-46`)
- **E-mail:** `atendente@saude.maceio.gov.br`
- **Celular:** `82999002200`
- **Senha:** `AtendeSus2026`
- **Nível de acesso:** `ATENDENTE`
- **Situação de acesso / Status:** `ATIVO` / `ATIVO`
- **Unidade vinculada:** UBS Centro — Maceió (CNES `2001001`)
- **Especialidades:** —

### 3. Profissional de Saúde (Clínica Médica)
- **Nome completo:** Dr. Roberto Mendes Silva
- **CPF:** `12345678909` (`123.456.789-09`)
- **Conselho / Registro:** `CRM 12345/AL`
- **E-mail:** `medico@saude.maceio.gov.br`
- **Celular:** `82999003300`
- **Senha:** `MedicoSus2026`
- **Nível de acesso:** `PROFISSIONAL_SAUDE`
- **Situação de acesso / Status:** `ATIVO` / `ATIVO`
- **Unidade vinculada:** UBS Centro — Maceió (CNES `2001001`)
- **Especialidades:** `Clínica Médica`

### 4. Profissional de Saúde (Cardiologia e Clínica Médica)
- **Nome completo:** Dra. Helena Costa
- **CPF:** `45612378955` (`456.123.789-55`)
- **Conselho / Registro:** `CRM 54321/AL`
- **E-mail:** `helena.costa@saude.maceio.gov.br`
- **Celular:** `82999004400`
- **Senha:** `MedicoSus2026`
- **Nível de acesso:** `PROFISSIONAL_SAUDE`
- **Situação de acesso / Status:** `ATIVO` / `ATIVO`
- **Unidades vinculadas:** UBS Centro — Maceió (CNES `2001001`) e Policlínica Benedito Bentes — Maceió (CNES `2001002`)
- **Especialidades:** `Cardiologia`, `Clínica Médica`

### 5. Paciente (Cidadão — Idosa Prioritária)
- **Nome completo:** Maria da Silva
- **CPF:** `52998224725` (`529.982.247-25`)
- **CNS (Cartão SUS):** `123456789010000`
- **Data de nascimento:** `12/04/1958` (`1958-04-12`)
- **E-mail:** `maria.silva@email.com`
- **Celular:** `82999887766` (WhatsApp ativo)
- **Senha:** `CidadaoSus2026`
- **Possui deficiência:** `NAO`
- **Endereço:** Rua Cônego Machado, 100 — Farol, Maceió/AL — CEP `57050000`
- **Situação CNS / Origem / Status:** `CONFIRMADO` / `AUTOATENDIMENTO` / `ATIVO`

### 6. Paciente Demo 1 (Idosa Prioritária — com agendamento na agenda do Dr. Roberto)
- **Nome completo:** Antônia Ferreira Lima
- **CPF:** `85274196373` (`852.741.963-73`)
- **CNS (Cartão SUS):** `700000000000013`
- **Data de nascimento:** `20/08/1956` (`1956-08-20`)
- **E-mail:** `antonia.lima@email.com`
- **Celular:** `82999112233` (WhatsApp ativo)
- **Senha:** `CidadaoSus2026`
- **Possui deficiência:** `NAO`
- **Endereço:** Av. Fernandes Lima, 500 — Farol, Maceió/AL — CEP `57050000`
- **Situação CNS / Origem / Status:** `CONFIRMADO` / `AUTOATENDIMENTO` / `ATIVO`

### 7. Paciente Demo 2 (Atendimento Comum — com agendamento na agenda do Dr. Roberto)
- **Nome completo:** João Pedro Santos
- **CPF:** `65498732155` (`654.987.321-55`)
- **CNS (Cartão SUS):** `900000000000008`
- **Data de nascimento:** `14/05/1993` (`1993-05-14`)
- **E-mail:** `joao.santos@email.com`
- **Celular:** `82999445566` (WhatsApp ativo)
- **Senha:** `CidadaoSus2026`
- **Possui deficiência:** `NAO`
- **Endereço:** Av. Fernandes Lima, 500 — Farol, Maceió/AL — CEP `57050000`
- **Situação CNS / Origem / Status:** `CONFIRMADO` / `AUTOATENDIMENTO` / `ATIVO`

---

## Demais Dados Populados pelo Seed

### Unidade de Saúde
- **Nome:** UBS Centro — Maceió
- **CNES:** `2001001`
- **CNPJ:** `11222333000181`
- **Telefone:** `(82) 3312-5000`
- **E-mail:** `ubscentro@saude.maceio.al.gov.br`
- **Endereço:** Rua Barão de Alagoas, 250 — Centro, Maceió/AL — CEP `57020050`
- **Fuso horário:** `America/Maceio`
- **Status:** `ATIVA`

### Serviço
- **Nome:** Consulta em Clínica Médica
- **Categoria:** `CONSULTA`
- **Especialidade:** `Clínica Médica`
- **Modo de acesso:** `DIRETO`
- **Orientações de preparo:** Chegar com 15 minutos de antecedência portando documento oficial com foto e Cartão SUS (CNS).
- **Status:** `ATIVO`

### Agenda Publicada
- **Vínculo:** UBS Centro — Maceió × Consulta em Clínica Médica × Dr. Roberto Mendes Silva
- **Período:** da data atual (fuso `America/Maceio`) até `+14 dias`
- **Dias da semana:** todos os dias (`0` a `6`)
- **Horários:** `08:00`, `09:00`, `10:00`, `14:00`, `15:00`, `16:00`, `23:30`
- **Capacidade por horário:** `5` vagas
- **Situação:** `PUBLICADA` (com vagas materializadas para o fuso `-03:00` e 2 agendamentos de demonstração para Antônia e João Pedro, mantendo Maria da Silva livre para novos agendamentos)

### Dados Adicionais de Rede (Busca & Multiunidade)
- **Unidade 2:** Policlínica Benedito Bentes — Maceió
  - **CNES:** `2001002`
  - **CNPJ:** `11222333000181`
  - **Telefone:** `(82) 3312-5400`
  - **E-mail:** `policlinica.bb@saude.maceio.al.gov.br`
  - **Endereço:** Av. Cachoeira do Meirim, 880 — Benedito Bentes, Maceió/AL — CEP `57084000`
  - **Fuso horário / Status:** `America/Maceio` / `ATIVA`
- **Médica 2:** Dra. Helena Costa (`CRM 54321/AL`) — Cardiologia e Clínica Médica
- **Serviços extras:** Consulta em Cardiologia (`CONSULTA`), Eletrocardiograma (ECG) (`PROCEDIMENTO`) e Consulta em Pediatria (`CONSULTA`)
- **Agendas da Dra. Helena:** Consulta em Cardiologia na UBS Centro (seg–sex, `08:30`, `09:30`, `10:30`, `14:30`, `15:30`, cap. `4`) e Eletrocardiograma na Policlínica Benedito Bentes (todos os dias, `08:00`, `09:00`, `14:00`, cap. `3`)
