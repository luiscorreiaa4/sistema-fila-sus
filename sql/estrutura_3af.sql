-- ============================================================================
-- Sistema de Transparência de Filas Públicas (SUS) — CESMAC
-- Script SQL Consolidado da 3AF (PostgreSQL Local — banco: filas_sus)
-- Execução idempotente: psql -d filas_sus -f sql/estrutura_3af.sql
--
-- Cobre integralmente os 5 itens exigidos na 3AF (openspec/specs/04-banco-dados-3af.md):
--   1. DDL com as 4 Integridades (Entidade, Referencial, Domínio e Usuário)
--   2. Trigger PL/pgSQL (fn_validar_e_auditar_status + historico_eventos)
--   3. Campos Indexados (CREATE INDEX)
--   4. View LGPD (vw_painel_chamadas_publico)
--   5. Contas e Permissões (CREATE ROLE e GRANT / REVOKE)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ITEM 1 — DDL COM AS 4 INTEGRIDADES
-- ============================================================================

-- 1.1 Integridade de Domínio: Tipos ENUM nativos do PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade') THEN
        CREATE TYPE status_unidade AS ENUM ('ATIVA', 'INATIVA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_cadastro_enum') THEN
        CREATE TYPE status_cadastro_enum AS ENUM ('ATIVO', 'INATIVO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'possui_deficiencia_enum') THEN
        CREATE TYPE possui_deficiencia_enum AS ENUM ('SIM', 'NAO', 'PREFIRO_NAO_INFORMAR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_cns_enum') THEN
        CREATE TYPE situacao_cns_enum AS ENUM ('PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'DIVERGENTE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_cadastro_enum') THEN
        CREATE TYPE origem_cadastro_enum AS ENUM ('AUTOATENDIMENTO', 'ASSISTIDO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_acesso_enum') THEN
        CREATE TYPE nivel_acesso_enum AS ENUM ('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_acesso_enum') THEN
        CREATE TYPE situacao_acesso_enum AS ENUM ('CONVITE_PENDENTE', 'ATIVO', 'BLOQUEADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_servico_enum') THEN
        CREATE TYPE categoria_servico_enum AS ENUM ('CONSULTA', 'PROCEDIMENTO', 'CIRURGIA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modo_acesso_servico_enum') THEN
        CREATE TYPE modo_acesso_servico_enum AS ENUM ('DIRETO', 'REGULADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_servico_enum') THEN
        CREATE TYPE status_servico_enum AS ENUM ('ATIVO', 'INATIVO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_agenda_enum') THEN
        CREATE TYPE situacao_agenda_enum AS ENUM ('RASCUNHO', 'PUBLICADA', 'BLOQUEADA', 'ENCERRADA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origem_marcacao_enum') THEN
        CREATE TYPE origem_marcacao_enum AS ENUM ('APLICATIVO', 'ASSISTIDA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_agendamento_enum') THEN
        CREATE TYPE status_agendamento_enum AS ENUM ('AGENDADO', 'REALIZADO', 'CANCELADO', 'NAO_REALIZADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grupo_atendimento_enum') THEN
        CREATE TYPE grupo_atendimento_enum AS ENUM ('PRIORITARIO', 'COMUM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_fila_enum') THEN
        CREATE TYPE situacao_fila_enum AS ENUM ('AGUARDANDO', 'CHAMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'NAO_ATENDIDO', 'CANCELADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_chamada_enum') THEN
        CREATE TYPE estado_chamada_enum AS ENUM ('CHAMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'NAO_ATENDIDO');
    END IF;
END
$$;

-- 1.2 Integridade de Entidade (PRIMARY KEY), Referencial (FOREIGN KEY) e Domínio (NOT NULL / CHECK)

CREATE TABLE IF NOT EXISTS unidades_saude (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnes              VARCHAR(7),
    cnpj              VARCHAR(14) NOT NULL,
    nome              VARCHAR(150) NOT NULL,
    telefone          VARCHAR(20),
    email             VARCHAR(150),
    cep               VARCHAR(8) NOT NULL,
    logradouro        VARCHAR(200) NOT NULL,
    numero            VARCHAR(20) NOT NULL,
    complemento       VARCHAR(100),
    bairro            VARCHAR(100) NOT NULL,
    municipio         VARCHAR(100) NOT NULL,
    estado            CHAR(2) NOT NULL,
    fuso_horario      VARCHAR(50) NOT NULL DEFAULT 'America/Maceio',
    status            status_unidade NOT NULL DEFAULT 'ATIVA',
    motivo_inativacao TEXT,
    created_at        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_unidades_nome_municipio UNIQUE (nome, municipio)
);

CREATE TABLE IF NOT EXISTS pacientes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf                         CHAR(11) NOT NULL UNIQUE,
    cns                         CHAR(15) NOT NULL UNIQUE,
    nome_completo               VARCHAR(150) NOT NULL,
    nome_social                 VARCHAR(150),
    data_nascimento             DATE NOT NULL,
    email                       VARCHAR(150) UNIQUE,
    celular                     VARCHAR(20),
    celular_whatsapp            BOOLEAN NOT NULL DEFAULT FALSE,
    possui_deficiencia          possui_deficiencia_enum NOT NULL DEFAULT 'NAO',
    tipos_deficiencia           TEXT[] NOT NULL DEFAULT '{}',
    preferencias_acessibilidade TEXT,
    cep                         VARCHAR(8) NOT NULL,
    logradouro                  VARCHAR(200) NOT NULL,
    numero                      VARCHAR(20) NOT NULL,
    complemento                 VARCHAR(100),
    bairro                      VARCHAR(100) NOT NULL,
    municipio                   VARCHAR(100) NOT NULL,
    estado                      CHAR(2) NOT NULL,
    senha_hash                  VARCHAR(255) NOT NULL,
    ciencia_privacidade_em      TIMESTAMPTZ(6) NOT NULL,
    situacao_cns                situacao_cns_enum NOT NULL DEFAULT 'PENDENTE_CONFIRMACAO',
    origem_cadastro             origem_cadastro_enum NOT NULL DEFAULT 'AUTOATENDIMENTO',
    status                      status_cadastro_enum NOT NULL DEFAULT 'ATIVO',
    tentativas_malsucedidas     INTEGER NOT NULL DEFAULT 0,
    bloqueio_temporario_ate     TIMESTAMPTZ(6),
    ultimo_acesso               TIMESTAMPTZ(6),
    created_at                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profissionais (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf                     CHAR(11) NOT NULL UNIQUE,
    nome_completo           VARCHAR(150) NOT NULL,
    nome_social             VARCHAR(150),
    conselho_profissional   VARCHAR(30),
    numero_registro         VARCHAR(30),
    uf_registro             CHAR(2),
    especialidades          TEXT[] NOT NULL DEFAULT '{}',
    email                   VARCHAR(150) NOT NULL UNIQUE,
    celular                 VARCHAR(20),
    nivel_acesso            nivel_acesso_enum NOT NULL,
    credencial_hash         VARCHAR(255) NOT NULL,
    situacao_acesso         situacao_acesso_enum NOT NULL DEFAULT 'ATIVO',
    status                  status_cadastro_enum NOT NULL DEFAULT 'ATIVO',
    motivo_inativacao       TEXT,
    tentativas_malsucedidas INTEGER NOT NULL DEFAULT 0,
    bloqueio_temporario_ate TIMESTAMPTZ(6),
    ultimo_acesso           TIMESTAMPTZ(6),
    created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profissionais_unidades (
    profissional_id UUID NOT NULL,
    unidade_id      UUID NOT NULL,
    vinculado_em    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    PRIMARY KEY (profissional_id, unidade_id),
    CONSTRAINT fk_prof_unidades_profissional
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    CONSTRAINT fk_prof_unidades_unidade
        FOREIGN KEY (unidade_id) REFERENCES unidades_saude(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servicos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                VARCHAR(150) NOT NULL,
    categoria           categoria_servico_enum NOT NULL,
    especialidade       VARCHAR(100) NOT NULL,
    modo_acesso         modo_acesso_servico_enum NOT NULL DEFAULT 'DIRETO',
    orientacoes_preparo TEXT,
    status              status_servico_enum NOT NULL DEFAULT 'ATIVO',
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_servicos_nome_especialidade UNIQUE (nome, especialidade)
);

CREATE TABLE IF NOT EXISTS agendas (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id             UUID NOT NULL,
    servico_id             UUID NOT NULL,
    profissional_id        UUID,
    data_inicio            DATE NOT NULL,
    data_fim               DATE NOT NULL,
    dias_horarios          JSONB NOT NULL,
    capacidade_por_horario INTEGER NOT NULL,
    situacao               situacao_agenda_enum NOT NULL DEFAULT 'RASCUNHO',
    created_at             TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agendas_unidade
        FOREIGN KEY (unidade_id) REFERENCES unidades_saude(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendas_servico
        FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendas_profissional
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS vagas_agenda (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agenda_id        UUID NOT NULL,
    data_hora_inicio TIMESTAMPTZ(6) NOT NULL,
    capacidade_total INTEGER NOT NULL,
    vagas_ocupadas   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_vagas_agenda
        FOREIGN KEY (agenda_id) REFERENCES agendas(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS agendamentos (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id           UUID NOT NULL,
    unidade_id            UUID NOT NULL,
    servico_id            UUID NOT NULL,
    profissional_id       UUID,
    vaga_id               UUID NOT NULL,
    data_hora_atendimento TIMESTAMPTZ(6) NOT NULL,
    protocolo             VARCHAR(30) NOT NULL UNIQUE,
    senha_atendimento     VARCHAR(20) NOT NULL,
    versao                INTEGER NOT NULL DEFAULT 1,
    origem_marcacao       origem_marcacao_enum NOT NULL DEFAULT 'APLICATIVO',
    status                status_agendamento_enum NOT NULL DEFAULT 'AGENDADO',
    motivo_cancelamento   TEXT,
    created_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agendamentos_paciente
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_unidade
        FOREIGN KEY (unidade_id) REFERENCES unidades_saude(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_servico
        FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_profissional
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamentos_vaga
        FOREIGN KEY (vaga_id) REFERENCES vagas_agenda(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS entradas_fila (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id           UUID NOT NULL UNIQUE,
    paciente_id              UUID NOT NULL,
    unidade_id               UUID NOT NULL,
    atendente_responsavel_id UUID,
    data_hora_chegada        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    grupo_atendimento        grupo_atendimento_enum NOT NULL,
    criterio_prioridade      VARCHAR(30) NOT NULL,
    senha_atendimento        VARCHAR(20) NOT NULL,
    ordem_entrada            INTEGER NOT NULL,
    situacao                 situacao_fila_enum NOT NULL DEFAULT 'AGUARDANDO',
    recolocacoes             INTEGER NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_entradas_fila_agendamento
        FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entradas_fila_paciente
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entradas_fila_unidade
        FOREIGN KEY (unidade_id) REFERENCES unidades_saude(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entradas_fila_atendente
        FOREIGN KEY (atendente_responsavel_id) REFERENCES profissionais(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS chamadas_fila (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrada_fila_id         UUID NOT NULL,
    profissional_chamador_id UUID NOT NULL,
    guiche_sala             VARCHAR(60) NOT NULL,
    data_hora_chamada       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    tentativa               INTEGER NOT NULL DEFAULT 1,
    estado                  estado_chamada_enum NOT NULL DEFAULT 'CHAMADO',
    data_hora_inicio        TIMESTAMPTZ(6),
    data_hora_conclusao     TIMESTAMPTZ(6),
    duracao_minutos         INTEGER,
    motivo_ausencia         TEXT,
    CONSTRAINT fk_chamadas_fila_entrada
        FOREIGN KEY (entrada_fila_id) REFERENCES entradas_fila(id) ON DELETE RESTRICT,
    CONSTRAINT fk_chamadas_fila_profissional
        FOREIGN KEY (profissional_chamador_id) REFERENCES profissionais(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS historico_eventos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade        VARCHAR(50) NOT NULL,
    entidade_id     UUID NOT NULL,
    status_anterior VARCHAR(50),
    status_novo     VARCHAR(50) NOT NULL,
    observacao      TEXT,
    ocorrido_em     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Constraints CHECK explícitas (aplicação idempotente mesmo sobre tabelas criadas via Prisma Migrate)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unidades_nome_len') THEN
        ALTER TABLE unidades_saude
            ADD CONSTRAINT chk_unidades_nome_len
            CHECK (char_length(trim(nome)) BETWEEN 3 AND 150);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unidades_inativacao') THEN
        ALTER TABLE unidades_saude
            ADD CONSTRAINT chk_unidades_inativacao
            CHECK (status = 'ATIVA' OR (motivo_inativacao IS NOT NULL AND char_length(trim(motivo_inativacao)) >= 5));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pacientes_contato') THEN
        ALTER TABLE pacientes
            ADD CONSTRAINT chk_pacientes_contato
            CHECK (email IS NOT NULL OR celular IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tentativas_login_paciente') THEN
        ALTER TABLE pacientes
            ADD CONSTRAINT chk_tentativas_login_paciente
            CHECK (tentativas_malsucedidas >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tentativas_login_profissional') THEN
        ALTER TABLE profissionais
            ADD CONSTRAINT chk_tentativas_login_profissional
            CHECK (tentativas_malsucedidas >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agendas_periodo') THEN
        ALTER TABLE agendas
            ADD CONSTRAINT chk_agendas_periodo
            CHECK (data_fim >= data_inicio);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agendas_capacidade') THEN
        ALTER TABLE agendas
            ADD CONSTRAINT chk_agendas_capacidade
            CHECK (capacidade_por_horario > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_vagas_ocupacao') THEN
        ALTER TABLE vagas_agenda
            ADD CONSTRAINT chk_vagas_ocupacao
            CHECK (capacidade_total > 0 AND vagas_ocupadas >= 0 AND vagas_ocupadas <= capacidade_total);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chamadas_duracao') THEN
        ALTER TABLE chamadas_fila
            ADD CONSTRAINT chk_chamadas_duracao
            CHECK (duracao_minutos IS NULL OR duracao_minutos >= 0);
    END IF;
END
$$;

-- 1.3 Integridade de Usuário (Índices únicos condicionais para regras de negócio no banco)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamento_paciente_servico_ativo
    ON agendamentos (paciente_id, servico_id)
    WHERE status = 'AGENDADO';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cnes_nao_nulo
    ON unidades_saude (cnes)
    WHERE cnes IS NOT NULL;


-- ============================================================================
-- ITEM 2 — TRIGGER EM PL/pgSQL (Validação de Transições e Auditoria)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validar_e_auditar_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME = 'agendamentos' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO historico_eventos (
                entidade,
                entidade_id,
                status_anterior,
                status_novo,
                observacao,
                ocorrido_em
            ) VALUES (
                'AGENDAMENTO',
                NEW.id,
                NULL,
                NEW.status::TEXT,
                'Agendamento criado (Protocolo ' || NEW.protocolo || ')',
                NOW()
            );
            RETURN NEW;
        END IF;

        IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
            IF OLD.status IN ('REALIZADO', 'CANCELADO', 'NAO_REALIZADO') THEN
                RAISE EXCEPTION
                    'Transição de status inválida em agendamentos: não é permitido alterar um agendamento em estado terminal (%) para (%)',
                    OLD.status, NEW.status;
            END IF;

            IF OLD.status = 'AGENDADO' AND NEW.status NOT IN ('REALIZADO', 'CANCELADO', 'NAO_REALIZADO') THEN
                RAISE EXCEPTION
                    'Transição de status inválida em agendamentos: % -> %',
                    OLD.status, NEW.status;
            END IF;

            IF NEW.status = 'CANCELADO' AND (NEW.motivo_cancelamento IS NULL OR char_length(trim(NEW.motivo_cancelamento)) < 5) THEN
                RAISE EXCEPTION
                    'Cancelamento de agendamento exige motivo_cancelamento com pelo menos 5 caracteres';
            END IF;

            INSERT INTO historico_eventos (
                entidade,
                entidade_id,
                status_anterior,
                status_novo,
                observacao,
                ocorrido_em
            ) VALUES (
                'AGENDAMENTO',
                NEW.id,
                OLD.status::TEXT,
                NEW.status::TEXT,
                COALESCE(NEW.motivo_cancelamento, 'Atualização de status do agendamento'),
                NOW()
            );
        END IF;

        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'entradas_fila' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO historico_eventos (
                entidade,
                entidade_id,
                status_anterior,
                status_novo,
                observacao,
                ocorrido_em
            ) VALUES (
                'ENTRADA_FILA',
                NEW.id,
                NULL,
                NEW.situacao::TEXT,
                'Check-in registrado (Senha ' || NEW.senha_atendimento || ')',
                NOW()
            );
            RETURN NEW;
        END IF;

        IF TG_OP = 'UPDATE' AND (OLD.situacao IS DISTINCT FROM NEW.situacao) THEN
            IF NOT (
                (OLD.situacao = 'AGUARDANDO' AND NEW.situacao IN ('CHAMADO', 'CANCELADO')) OR
                (OLD.situacao = 'CHAMADO' AND NEW.situacao IN ('EM_ATENDIMENTO', 'NAO_ATENDIDO', 'AGUARDANDO')) OR
                (OLD.situacao = 'EM_ATENDIMENTO' AND NEW.situacao IN ('CONCLUIDO', 'NAO_ATENDIDO'))
            ) THEN
                RAISE EXCEPTION
                    'Transição de situação inválida na fila: % -> %',
                    OLD.situacao, NEW.situacao;
            END IF;

            INSERT INTO historico_eventos (
                entidade,
                entidade_id,
                status_anterior,
                status_novo,
                observacao,
                ocorrido_em
            ) VALUES (
                'ENTRADA_FILA',
                NEW.id,
                OLD.situacao::TEXT,
                NEW.situacao::TEXT,
                'Atualização de situação na fila (Senha ' || NEW.senha_atendimento || ')',
                NOW()
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agendamentos_auditoria_status ON agendamentos;
CREATE TRIGGER trg_agendamentos_auditoria_status
    BEFORE INSERT OR UPDATE ON agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_e_auditar_status();

DROP TRIGGER IF EXISTS trg_entradas_fila_auditoria_status ON entradas_fila;
CREATE TRIGGER trg_entradas_fila_auditoria_status
    BEFORE INSERT OR UPDATE ON entradas_fila
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_e_auditar_status();


-- ============================================================================
-- ITEM 3 — CAMPOS INDEXADOS (CREATE INDEX)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agendamentos_protocolo
    ON agendamentos (protocolo);

CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_status
    ON agendamentos (paciente_id, status, data_hora_atendimento);

CREATE INDEX IF NOT EXISTS idx_entradas_fila_unidade_situacao_ordem
    ON entradas_fila (unidade_id, situacao, grupo_atendimento, ordem_entrada);

CREATE INDEX IF NOT EXISTS idx_vagas_agenda_disponiveis
    ON vagas_agenda (agenda_id, data_hora_inicio)
    WHERE vagas_ocupadas < capacidade_total;

CREATE INDEX IF NOT EXISTS idx_chamadas_fila_horario
    ON chamadas_fila (data_hora_chamada DESC);

CREATE INDEX IF NOT EXISTS idx_historico_eventos_entidade
    ON historico_eventos (entidade, entidade_id);


-- ============================================================================
-- ITEM 4 — VIEW LGPD (Painel Público de Chamadas sem Dados Pessoais)
-- ============================================================================

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


-- ============================================================================
-- ITEM 5 — CONTAS E PERMISSÕES (CREATE ROLE e GRANT / REVOKE)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_app_filas') THEN
        CREATE ROLE role_app_filas WITH LOGIN PASSWORD 'app_filas_2026';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_painel_publico') THEN
        CREATE ROLE role_painel_publico WITH LOGIN PASSWORD 'painel_publico_2026';
    END IF;
END
$$;

-- Privilégios da conta da aplicação (sem DELETE físico em dados operacionais)
GRANT USAGE ON SCHEMA public TO role_app_filas;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO role_app_filas;
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM role_app_filas;
GRANT DELETE ON TABLE profissionais_unidades TO role_app_filas;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_app_filas;

-- Privilégios mínimos da conta do painel público (LGPD — somente leitura na View)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM role_painel_publico;
GRANT USAGE ON SCHEMA public TO role_painel_publico;
GRANT SELECT ON vw_painel_chamadas_publico TO role_painel_publico;
