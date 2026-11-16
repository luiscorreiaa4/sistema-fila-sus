# OpenSpec 04 — Estrutura de Banco de Dados PostgreSQL (`3AF`)

## 1. Escopo
Especifica o script SQL complementar `sql/estrutura_3af.sql` (e sua aplicação junto às migrations do Prisma no PostgreSQL local `filas_sus`) para atender integralmente aos **5 itens avaliados na 3AF** (1 ponto cada).

---

## 2. Itens Obrigatórios da 3AF

### Item 1 — DDL com as 4 Integridades
1. **Integridade de Entidade:**
   - Todas as tabelas possuem `PRIMARY KEY` (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`), e a tabela associativa `profissionais_unidades` possui chave primária composta `PRIMARY KEY (profissional_id, unidade_id)`.
2. **Integridade Referencial:**
   - Todas as relações usam `FOREIGN KEY ... REFERENCES` com ação explícita:
     - `ON DELETE RESTRICT` nas tabelas operacionais (`agendas`, `vagas_agenda`, `agendamentos`, `entradas_fila`, `chamadas_fila`) para impedir exclusão física de registros com histórico.
     - `ON DELETE CASCADE` apenas na tabela associativa de vínculo `profissionais_unidades`.
3. **Integridade de Domínio:**
   - Colunas obrigatórias marcadas com `NOT NULL`.
   - Tipos `ENUM` nativos do PostgreSQL (`status_unidade`, `possui_deficiencia_enum`, `situacao_cns_enum`, `nivel_acesso_enum`, `categoria_servico_enum`, `situacao_agenda_enum`, `status_agendamento_enum`, `grupo_atendimento_enum`, `situacao_fila_enum`, `estado_chamada_enum`).
   - Constraints `CHECK` explícitas:
     - `chk_unidades_nome_len CHECK (char_length(trim(nome)) BETWEEN 3 AND 150)`
     - `chk_unidades_inativacao CHECK (status = 'ATIVA' OR (motivo_inativacao IS NOT NULL AND char_length(trim(motivo_inativacao)) >= 5))`
     - `chk_agendas_periodo CHECK (data_fim >= data_inicio)`
     - `chk_agendas_capacidade CHECK (capacidade_por_horario > 0)`
     - `chk_vagas_ocupacao CHECK (capacidade_total > 0 AND vagas_ocupadas >= 0 AND vagas_ocupadas <= capacidade_total)`
     - `chk_chamadas_duracao CHECK (duracao_minutos IS NULL OR duracao_minutos >= 0)`
     - `chk_tentativas_login_paciente CHECK (tentativas_malsucedidas >= 0)`
     - `chk_tentativas_login_profissional CHECK (tentativas_malsucedidas >= 0)`
4. **Integridade de Usuário (Regras de Negócio no Banco):**
   - Índice único condicional `CREATE UNIQUE INDEX uq_agendamento_paciente_servico_ativo ON agendamentos (paciente_id, servico_id) WHERE status = 'AGENDADO';` impedindo dois agendamentos ativos para o mesmo serviço por paciente mesmo sob concorrência.
   - Índice único condicional `CREATE UNIQUE INDEX uq_cnes_nao_nulo ON unidades_saude (cnes) WHERE cnes IS NOT NULL;` permitindo `cnes` nulo, mas garantindo unicidade quando informado.
   - Validação de grafo de transição de status em `agendamentos` e `entradas_fila` diretamente no Trigger PL/pgSQL.

### Item 2 — Trigger em PL/pgSQL
- **Tabela de auditoria:** `historico_eventos (id, entidade, entidade_id, status_anterior, status_novo, observacao, ocorrido_em)`.
- **Função `fn_validar_e_auditar_status()`:**
  - Dispara `BEFORE UPDATE` (ou `AFTER` para log + `BEFORE` para bloqueio; usar um trigger `BEFORE UPDATE` que valida a transição e já insere na tabela `historico_eventos` ou dois triggers vinculados à função parametrizada por `TG_TABLE_NAME`).
  - **Regras validadas na função:**
    - Para `agendamentos`: bloqueia com `RAISE EXCEPTION` alterações a partir de estados terminais (`REALIZADO`, `CANCELADO`, `NAO_REALIZADO`), permitindo apenas `AGENDADO -> REALIZADO | CANCELADO | NAO_REALIZADO`.
    - Para `entradas_fila`: permite apenas transições válidas (`AGUARDANDO -> CHAMADO | CANCELADO`, `CHAMADO -> EM_ATENDIMENTO | NAO_ATENDIDO | AGUARDANDO`, `EM_ATENDIMENTO -> CONCLUIDO | NAO_ATENDIDO`).
  - Sempre que `OLD.status IS DISTINCT FROM NEW.status` (ou `situacao` em `entradas_fila`), insere registro automático em `historico_eventos`.
- **Triggers vinculados:**
  - `trg_agendamentos_auditoria_status` (`BEFORE INSERT OR UPDATE ON agendamentos`)
  - `trg_entradas_fila_auditoria_status` (`BEFORE INSERT OR UPDATE ON entradas_fila`)

### Item 3 — Campos Indexados (`CREATE INDEX`)
Índices criados explicitamente para as consultas críticas do sistema:
- `idx_agendamentos_protocolo` em `agendamentos (protocolo)`
- `idx_agendamentos_paciente_status` em `agendamentos (paciente_id, status, data_hora_atendimento)`
- `idx_entradas_fila_unidade_situacao_ordem` em `entradas_fila (unidade_id, situacao, grupo_atendimento, ordem_entrada)`
- `idx_vagas_agenda_disponiveis` em `vagas_agenda (agenda_id, data_hora_inicio) WHERE vagas_ocupadas < capacidade_total`
- `idx_chamadas_fila_horario` em `chamadas_fila (data_hora_chamada DESC)`

### Item 4 — Contas e Permissões (`CREATE ROLE` e `GRANT`)
Criação de duas contas/papéis distintos no PostgreSQL para segregação de privilégios:
1. **`role_app_filas` (`LOGIN`):**
   - `GRANT USAGE ON SCHEMA public TO role_app_filas;`
   - `GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO role_app_filas;`
   - `REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM role_app_filas;` (exceção explícita apenas se necessário em `profissionais_unidades`, reforçando a regra de negócio de não haver exclusão física).
   - `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_app_filas;`
2. **`role_painel_publico` (`LOGIN`):**
   - `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM role_painel_publico;`
   - `GRANT USAGE ON SCHEMA public TO role_painel_publico;`
   - `GRANT SELECT ON vw_painel_chamadas_publico TO role_painel_publico;`
   - Garante princípio do menor privilégio e conformidade com a LGPD no banco de dados.

### Item 5 — View LGPD (`vw_painel_chamadas_publico`)
```sql
CREATE OR REPLACE VIEW vw_painel_chamadas_publico AS
SELECT
    cf.id AS chamada_id,
    ef.unidade_id,
    us.nome AS unidade_nome,
    ef.senha_atendimento,
    cf.guiche_sala,
    cf.data_hora_chamada AS horario_chamada,
    cf.tentativa,
    cf.estado
FROM chamadas_fila cf
INNER JOIN entradas_fila ef ON ef.id = cf.entrada_fila_id
INNER JOIN unidades_saude us ON us.id = ef.unidade_id
WHERE cf.estado IN ('CHAMADO', 'EM_ATENDIMENTO')
ORDER BY cf.data_hora_chamada DESC;
```
- Não projeta nenhuma coluna de identificação civil (`nome_completo`, `nome_social`, `cpf`, `cns`, `possui_deficiencia` ou `criterio_prioridade`).

---

## 3. Critérios de Aceitação
- O script `sql/estrutura_3af.sql` deve executar de forma idempotente ou limpa no PostgreSQL local (`psql -d filas_sus -f sql/estrutura_3af.sql`).
- Um teste com `SET ROLE role_painel_publico; SELECT * FROM pacientes;` deve ser negado pelo PostgreSQL, enquanto `SELECT * FROM vw_painel_chamadas_publico;` deve funcionar normalmente.
- Um `UPDATE` tentando alterar um agendamento `CANCELADO` para `REALIZADO` deve ser bloqueado pela trigger com erro explícito.
