import { z } from 'zod';

export const uuidSchema = z.string().uuid('Identificador UUID inválido');

export const criarUnidadeSchema = z.object({
  cnes: z.string().trim().min(7).max(7).optional().nullable(),
  cnpj: z.string().trim().min(14, 'CNPJ inválido'),
  nome: z.string().trim().min(3).max(150),
  telefone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email('E-mail inválido').max(150).optional().nullable(),
  cep: z.string().trim().min(8, 'CEP inválido'),
  logradouro: z.string().trim().min(1).max(200),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().min(1).max(100),
  municipio: z.string().trim().min(1).max(100),
  estado: z.string().trim().length(2, 'UF deve conter 2 letras'),
  fusoHorario: z.string().trim().min(3).max(50).optional(),
});

export const inativarComMotivoSchema = z.object({
  motivoInativacao: z
    .string()
    .trim()
    .min(5, 'Motivo de inativação deve ter pelo menos 5 caracteres'),
});

const tipoDeficienciaEnum = z.enum([
  'FISICA',
  'AUDITIVA',
  'VISUAL',
  'INTELECTUAL',
  'PSICOSSOCIAL',
  'TEA',
]);

const possuiDeficienciaEnum = z.enum([
  'SIM',
  'NAO',
  'PREFIRO_NAO_INFORMAR',
]);

export const cadastrarPacienteSchema = z.object({
  cpf: z.string().trim().min(11, 'CPF inválido'),
  cns: z.string().trim().min(15, 'CNS inválido'),
  nomeCompleto: z.string().trim().min(3).max(150),
  nomeSocial: z.string().trim().max(150).optional().nullable(),
  dataNascimento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato YYYY-MM-DD'),
  email: z.string().trim().email('E-mail inválido').max(150).optional().nullable(),
  celular: z.string().trim().max(20).optional().nullable(),
  celularWhatsapp: z.boolean().optional(),
  possuiDeficiencia: possuiDeficienciaEnum.default('NAO'),
  tiposDeficiencia: z.array(tipoDeficienciaEnum).optional(),
  preferenciasAcessibilidade: z.string().trim().optional().nullable(),
  cep: z.string().trim().min(8, 'CEP inválido'),
  logradouro: z.string().trim().min(1).max(200),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(100).optional().nullable(),
  bairro: z.string().trim().min(1).max(100),
  municipio: z.string().trim().min(1).max(100),
  estado: z.string().trim().length(2, 'UF deve conter 2 letras'),
  senha: z.string().min(8, 'Senha deve ter entre 8 e 64 caracteres').max(64),
  cienciaPrivacidade: z.boolean(),
});

export const atualizarPacienteSchema = z.object({
  cpf: z.unknown().optional(),
  nomeSocial: z.string().trim().max(150).optional().nullable(),
  email: z.string().trim().email('E-mail inválido').max(150).optional().nullable(),
  celular: z.string().trim().max(20).optional().nullable(),
  celularWhatsapp: z.boolean().optional(),
  possuiDeficiencia: possuiDeficienciaEnum.optional(),
  tiposDeficiencia: z.array(tipoDeficienciaEnum).optional(),
  preferenciasAcessibilidade: z.string().trim().optional().nullable(),
  endereco: z
    .object({
      cep: z.string().trim().min(8),
      logradouro: z.string().trim().min(1).max(200),
      numero: z.string().trim().min(1).max(20),
      complemento: z.string().trim().max(100).optional().nullable(),
      bairro: z.string().trim().min(1).max(100),
      municipio: z.string().trim().min(1).max(100),
      estado: z.string().trim().length(2),
    })
    .optional(),
});

export const cadastrarProfissionalSchema = z.object({
  cpf: z.string().trim().min(11, 'CPF inválido'),
  nomeCompleto: z.string().trim().min(3).max(150),
  nomeSocial: z.string().trim().max(150).optional().nullable(),
  conselhoProfissional: z.string().trim().max(30).optional().nullable(),
  numeroRegistro: z.string().trim().max(30).optional().nullable(),
  ufRegistro: z.string().trim().length(2).optional().nullable(),
  email: z.string().trim().email('E-mail inválido').max(150),
  celular: z.string().trim().max(20).optional().nullable(),
  unidadesVinculadas: z
    .array(uuidSchema)
    .min(1, 'Informe pelo menos uma unidade vinculada'),
  especialidades: z.array(z.string().trim().min(1)).optional(),
  nivelAcesso: z.enum(['ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR']),
  senha: z.string().min(8, 'Senha deve ter entre 8 e 64 caracteres').max(64),
});

export const loginSchema = z.object({
  cpf: z.string().trim().min(11, 'CPF inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  tipoUsuario: z.enum(['PACIENTE', 'PROFISSIONAL']),
});

export const cadastrarServicoSchema = z.object({
  nome: z.string().trim().min(3).max(150),
  categoria: z.enum(['CONSULTA', 'PROCEDIMENTO', 'CIRURGIA']),
  especialidade: z.string().trim().min(2).max(100),
  modoAcesso: z.enum(['DIRETO', 'REGULADO']).optional(),
  orientacoesPreparo: z.string().trim().optional().nullable(),
});

export const criarAgendaSchema = z.object({
  unidadeId: uuidSchema,
  servicoId: uuidSchema,
  profissionalId: uuidSchema.nullable().optional(),
  dataInicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataInicio deve estar no formato YYYY-MM-DD'),
  dataFim: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataFim deve estar no formato YYYY-MM-DD'),
  diasHorarios: z
    .array(
      z.object({
        diaSemana: z.number().int().min(0).max(6),
        horarios: z
          .array(
            z
              .string()
              .trim()
              .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário deve estar no formato HH:mm')
          )
          .min(1),
      })
    )
    .min(1),
  capacidadePorHorario: z.number().int().positive(),
  publicar: z.boolean().optional(),
});

export const alterarSituacaoAgendaSchema = z.object({
  situacao: z.enum(['PUBLICADA', 'BLOQUEADA', 'ENCERRADA']),
});

export const marcarAgendamentoSchema = z.object({
  vagaId: uuidSchema,
  pacienteId: uuidSchema.optional(),
});

export const cancelarAgendamentoSchema = z.object({
  motivoCancelamento: z
    .string()
    .trim()
    .min(5, 'Motivo do cancelamento deve ter pelo menos 5 caracteres'),
});

export const checkinSchema = z
  .object({
    protocolo: z.string().trim().min(3).optional(),
    cpf: z.string().trim().min(11).optional(),
    unidadeId: uuidSchema,
  })
  .refine((dados) => Boolean(dados.protocolo || dados.cpf), {
    message: 'Informe o protocolo ou o CPF do paciente',
  });

export const chamarProximoSchema = z.object({
  unidadeId: uuidSchema,
  guicheSala: z.string().trim().min(2).max(60),
  estrategia: z.enum(['RODIZIO_5_1', 'ORDEM_CHEGADA']).optional(),
});

export const registrarAusenciaSchema = z.object({
  motivoAusencia: z.string().trim().optional(),
  permitirRecolocacao: z.boolean().optional(),
});
