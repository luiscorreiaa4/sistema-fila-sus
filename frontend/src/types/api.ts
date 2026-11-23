// ============================================================================
// Enums (espelho estrito de backend/prisma/schema.prisma e domínio)
// ============================================================================

export type StatusUnidade = 'ATIVA' | 'INATIVA';
export type StatusCadastro = 'ATIVO' | 'INATIVO';
export type PossuiDeficiencia = 'SIM' | 'NAO' | 'PREFIRO_NAO_INFORMAR';
export type TipoDeficiencia =
  | 'FISICA'
  | 'AUDITIVA'
  | 'VISUAL'
  | 'INTELECTUAL'
  | 'PSICOSSOCIAL'
  | 'TEA';
export type SituacaoCns = 'PENDENTE_CONFIRMACAO' | 'CONFIRMADO' | 'DIVERGENTE';
export type OrigemCadastro = 'AUTOATENDIMENTO' | 'ASSISTIDO';

export type NivelAcesso = 'ATENDENTE' | 'PROFISSIONAL_SAUDE' | 'ADMINISTRADOR';
export type PerfilAcesso = 'PACIENTE' | NivelAcesso;
export type TipoUsuario = 'PACIENTE' | 'PROFISSIONAL';
export type SituacaoAcesso = 'CONVITE_PENDENTE' | 'ATIVO' | 'BLOQUEADO';

export type CategoriaServico = 'CONSULTA' | 'PROCEDIMENTO' | 'CIRURGIA';
export type ModoAcessoServico = 'DIRETO' | 'REGULADO';
export type StatusServico = 'ATIVO' | 'INATIVO';

export type SituacaoAgenda = 'RASCUNHO' | 'PUBLICADA' | 'BLOQUEADA' | 'ENCERRADA';
export type OrigemMarcacao = 'APLICATIVO' | 'ASSISTIDA';
export type StatusAgendamento = 'AGENDADO' | 'REALIZADO' | 'CANCELADO' | 'NAO_REALIZADO';

export type GrupoAtendimento = 'PRIORITARIO' | 'COMUM';
export type CriterioPrioridade = 'IDOSO_60_MAIS' | 'PCD' | 'AMBOS' | 'PADRAO';
export type SituacaoFila =
  | 'AGUARDANDO'
  | 'CHAMADO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'NAO_ATENDIDO'
  | 'CANCELADO';
export type EstadoChamada = 'CHAMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'NAO_ATENDIDO';
export type EstrategiaFila = 'RODIZIO_5_1' | 'ORDEM_CHEGADA';

// ============================================================================
// DTOs de Resposta (espelho de backend/src/infrastructure/http/presenters/presenters.ts)
// ============================================================================

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
}

export interface UnidadeSaudeDTO {
  id: string;
  cnes: string | null;
  cnpj: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: Endereco;
  fusoHorario: string;
  status: StatusUnidade;
  motivoInativacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PacienteDTO {
  id: string;
  cpf: string;
  cpfFormatado: string;
  cns: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  nomeExibicao: string;
  dataNascimento: string;
  email: string | null;
  celular: string | null;
  celularWhatsapp: boolean;
  possuiDeficiencia: PossuiDeficiencia;
  tiposDeficiencia: TipoDeficiencia[];
  preferenciasAcessibilidade: string | null;
  endereco: Endereco;
  situacaoCns: SituacaoCns;
  origemCadastro: OrigemCadastro;
  status: StatusCadastro;
  ehPrioritarioLegal: boolean;
  criterioPrioridade: CriterioPrioridade;
  perfil: 'PACIENTE';
  createdAt: string;
  updatedAt: string;
}

export interface ProfissionalDTO {
  id: string;
  cpf: string;
  cpfFormatado: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  nomeExibicao: string;
  conselhoProfissional: string | null;
  numeroRegistro: string | null;
  ufRegistro: string | null;
  email: string;
  celular: string | null;
  nivelAcesso: NivelAcesso;
  perfil: NivelAcesso;
  situacaoAcesso: SituacaoAcesso;
  status: StatusCadastro;
  motivoInativacao: string | null;
  unidadesVinculadas: string[];
  especialidades: string[];
  createdAt: string;
  updatedAt: string;
}

export type UsuarioAutenticado = PacienteDTO | ProfissionalDTO;

export function isPaciente(
  usuario: UsuarioAutenticado | null | undefined,
  tipoUsuario: TipoUsuario | null | undefined
): usuario is PacienteDTO {
  return Boolean(usuario && tipoUsuario === 'PACIENTE');
}

export function isProfissional(
  usuario: UsuarioAutenticado | null | undefined,
  tipoUsuario: TipoUsuario | null | undefined
): usuario is ProfissionalDTO {
  return Boolean(usuario && tipoUsuario === 'PROFISSIONAL');
}

export interface ServicoDTO {
  id: string;
  nome: string;
  categoria: CategoriaServico;
  especialidade: string;
  modoAcesso: ModoAcessoServico;
  orientacoesPreparo: string | null;
  status: StatusServico;
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguracaoDiaHorario {
  diaSemana: number;
  horarios: string[];
}

export interface AgendaDTO {
  id: string;
  unidadeId: string;
  servicoId: string;
  profissionalId: string | null;
  dataInicio: string;
  dataFim: string;
  diasHorarios: ConfiguracaoDiaHorario[];
  capacidadePorHorario: number;
  situacao: SituacaoAgenda;
  createdAt: string;
  updatedAt: string;
}

export interface VagaDisponivelDTO {
  id: string;
  agendaId: string;
  dataHoraInicio: string;
  capacidadeTotal: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
  unidadeId: string;
  unidadeNome: string;
  servicoId: string;
  servicoNome: string;
  especialidade: string;
  profissionalId: string | null;
  profissionalNome: string | null;
}

export interface AgendamentoDTO {
  id: string;
  pacienteId: string;
  unidadeId: string;
  servicoId: string;
  profissionalId: string | null;
  vagaId: string;
  dataHoraAtendimento: string;
  protocolo: string;
  senhaAtendimento: string;
  versao: number;
  origemMarcacao: OrigemMarcacao;
  status: StatusAgendamento;
  motivoCancelamento: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgendamentoDetalhadoDTO extends AgendamentoDTO {
  unidadeNome: string;
  servicoNome: string;
  especialidade: string;
  orientacoesPreparo: string | null;
  pacienteNomeExibicao?: string;
  profissionalNomeExibicao?: string | null;
}

export interface EntradaFilaDTO {
  id: string;
  agendamentoId: string;
  pacienteId: string;
  unidadeId: string;
  atendenteResponsavelId: string | null;
  dataHoraChegada: string;
  grupoAtendimento: GrupoAtendimento;
  criterioPrioridade: string;
  senhaAtendimento: string;
  ordemEntrada: number;
  situacao: SituacaoFila;
  recolocacoes: number;
}

export interface ChamadaFilaDTO {
  id: string;
  entradaFilaId: string;
  profissionalChamadorId: string;
  guicheSala: string;
  dataHoraChamada: string;
  tentativa: number;
  estado: EstadoChamada;
  dataHoraInicio: string | null;
  dataHoraConclusao: string | null;
  duracaoMinutos: number | null;
  motivoAusencia: string | null;
}

export interface EntradaFilaOperacionalDTO extends EntradaFilaDTO {
  nomeExibicao: string;
  protocolo: string;
  servicoNome: string;
  ultimaChamada: ChamadaFilaDTO | null;
}

export interface PosicaoPacienteFilaDTO {
  entradaId: string;
  unidadeId: string;
  unidadeNome: string;
  senhaAtendimento: string;
  grupoAtendimento: GrupoAtendimento;
  criterioPrioridade: string;
  situacao: SituacaoFila;
  posicaoNaFila: number;
  pessoasAFrente: number;
  guicheSala: string | null;
  dataHoraChamada: string | null;
}

export interface ChamadaPainelPublicoDTO {
  chamadaId: string;
  unidadeId: string;
  unidadeNome: string;
  senhaAtendimento: string;
  guicheSala: string;
  horarioChamada: string;
  tentativa: number;
  estado: EstadoChamada;
}

export interface HealthResponse {
  status: string;
  servico: string;
}

export interface ApiErrorDetail {
  campo: string;
  mensagem: string;
}

export interface ApiErrorBody {
  erro: string;
  codigo: string;
  detalhes?: ApiErrorDetail[];
}

// ============================================================================
// Payloads de Entrada (espelho de backend/src/infrastructure/http/validators/schemas.ts)
// ============================================================================

export interface LoginInput {
  cpf: string;
  senha: string;
  tipoUsuario: TipoUsuario;
}

export interface LoginResponse {
  token: string;
  tipoUsuario: TipoUsuario;
  usuario: UsuarioAutenticado;
}

export interface AuthMeResponse {
  tipoUsuario: TipoUsuario;
  usuario: UsuarioAutenticado;
}

export interface CadastrarPacienteInput {
  cpf: string;
  cns: string;
  nomeCompleto: string;
  nomeSocial?: string | null;
  dataNascimento: string;
  email?: string | null;
  celular?: string | null;
  celularWhatsapp?: boolean;
  possuiDeficiencia: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  senha: string;
  cienciaPrivacidade: boolean;
}

export interface AtualizarPacienteInput {
  nomeSocial?: string | null;
  email?: string | null;
  celular?: string | null;
  celularWhatsapp?: boolean;
  possuiDeficiencia?: PossuiDeficiencia;
  tiposDeficiencia?: TipoDeficiencia[];
  preferenciasAcessibilidade?: string | null;
  endereco?: Endereco;
}

export interface CriarUnidadeInput {
  cnes?: string | null;
  cnpj: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  fusoHorario?: string;
}

export interface CadastrarProfissionalInput {
  cpf: string;
  nomeCompleto: string;
  nomeSocial?: string | null;
  conselhoProfissional?: string | null;
  numeroRegistro?: string | null;
  ufRegistro?: string | null;
  email: string;
  celular?: string | null;
  unidadesVinculadas: string[];
  especialidades?: string[];
  nivelAcesso: NivelAcesso;
  senha: string;
}

export interface CadastrarServicoInput {
  nome: string;
  categoria: CategoriaServico;
  especialidade: string;
  modoAcesso?: ModoAcessoServico;
  orientacoesPreparo?: string | null;
}

export interface CriarAgendaInput {
  unidadeId: string;
  servicoId: string;
  profissionalId?: string | null;
  dataInicio: string;
  dataFim: string;
  diasHorarios: ConfiguracaoDiaHorario[];
  capacidadePorHorario: number;
  publicar?: boolean;
}

export interface MarcarAgendamentoInput {
  vagaId: string;
  pacienteId?: string;
}

export interface CheckinInput {
  protocolo?: string;
  cpf?: string;
  unidadeId: string;
}

export interface ChamarProximoInput {
  unidadeId: string;
  guicheSala: string;
  estrategia?: EstrategiaFila;
}

export interface RegistrarAusenciaInput {
  motivoAusencia?: string;
  permitirRecolocacao?: boolean;
}
