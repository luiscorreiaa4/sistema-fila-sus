import type {
  AgendaDTO,
  AgendamentoDTO,
  AgendamentoDetalhadoDTO,
  ApiErrorBody,
  ApiErrorDetail,
  AtualizarPacienteInput,
  AuthMeResponse,
  CadastrarPacienteInput,
  CadastrarProfissionalInput,
  CadastrarServicoInput,
  CategoriaServico,
  ChamadaFilaDTO,
  ChamadaPainelPublicoDTO,
  ChamarProximoInput,
  CheckinInput,
  CriarAgendaInput,
  CriarUnidadeInput,
  EntradaFilaDTO,
  EntradaFilaOperacionalDTO,
  HealthResponse,
  LoginInput,
  LoginResponse,
  MarcarAgendamentoInput,
  PacienteDTO,
  PosicaoPacienteFilaDTO,
  ProfissionalDTO,
  RegistrarAusenciaInput,
  ServicoDTO,
  SituacaoAgenda,
  StatusCadastro,
  StatusServico,
  StatusUnidade,
  UnidadeSaudeDTO,
  VagaDisponivelDTO,
} from '../types/api';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export const TOKEN_STORAGE_KEY = 'fila_sus_token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage cheio ou bloqueado: o token não é persistido
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage indisponível: nada a remover
  }
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly codigo: string;
  public readonly detalhes?: ApiErrorDetail[];

  constructor(
    message: string,
    status: number,
    codigo = 'API_ERROR',
    detalhes?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export function extrairMensagemErro(erro: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (erro instanceof ApiError) {
    return erro.message;
  }
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }
  return fallback;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor da API. Verifique se o backend está ativo.',
      0,
      'NETWORK_ERROR'
    );
  }

  let data: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errBody = (data ?? {}) as Partial<ApiErrorBody>;
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new CustomEvent('fila-sus:unauthorized'));
    }
    throw new ApiError(
      errBody.erro || `Erro na requisição (${response.status})`,
      response.status,
      errBody.codigo || 'HTTP_ERROR',
      errBody.detalhes
    );
  }

  return data as T;
}

// Endpoints agrupados como em routes/index.ts do backend

export const healthApi = {
  check: () => request<HealthResponse>('/health', { auth: false }),
};

export const authApi = {
  login: (input: LoginInput) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  me: () => request<AuthMeResponse>('/auth/me'),
};

export const unidadesApi = {
  listar: (params?: { status?: StatusUnidade; municipio?: string }) =>
    request<{ unidades: UnidadeSaudeDTO[] }>(`/unidades${buildQuery(params)}`),
  criar: (input: CriarUnidadeInput) =>
    request<{ unidade: UnidadeSaudeDTO }>('/unidades', {
      method: 'POST',
      body: input,
    }),
  inativar: (id: string, motivoInativacao: string) =>
    request<{ unidade: UnidadeSaudeDTO }>(`/unidades/${id}/inativar`, {
      method: 'PATCH',
      body: { motivoInativacao },
    }),
};

export const servicosApi = {
  listar: (params?: {
    categoria?: CategoriaServico;
    especialidade?: string;
    status?: StatusServico;
    incluirInativos?: boolean;
  }) => request<{ servicos: ServicoDTO[] }>(`/servicos${buildQuery(params)}`),
  criar: (input: CadastrarServicoInput) =>
    request<{ servico: ServicoDTO }>('/servicos', {
      method: 'POST',
      body: input,
    }),
  inativar: (id: string) =>
    request<{ servico: ServicoDTO }>(`/servicos/${id}/inativar`, {
      method: 'PATCH',
    }),
};

export const profissionaisApi = {
  listar: (params?: { unidadeId?: string; status?: StatusCadastro }) =>
    request<{ profissionais: ProfissionalDTO[] }>(`/profissionais${buildQuery(params)}`),
  criar: (input: CadastrarProfissionalInput) =>
    request<{ profissional: ProfissionalDTO }>('/profissionais', {
      method: 'POST',
      body: input,
    }),
  inativar: (id: string, motivoInativacao: string) =>
    request<{ profissional: ProfissionalDTO }>(`/profissionais/${id}/inativar`, {
      method: 'PATCH',
      body: { motivoInativacao },
    }),
};

export const pacientesApi = {
  autocadastro: (input: CadastrarPacienteInput) =>
    request<{ paciente: PacienteDTO }>('/pacientes/autocadastro', {
      method: 'POST',
      body: input,
      auth: false,
    }),
  cadastroAssistido: (input: CadastrarPacienteInput) =>
    request<{ paciente: PacienteDTO }>('/pacientes/assistido', {
      method: 'POST',
      body: input,
    }),
  obterMe: () => request<{ paciente: PacienteDTO }>('/pacientes/me'),
  atualizarMe: (input: AtualizarPacienteInput) =>
    request<{ paciente: PacienteDTO }>('/pacientes/me', {
      method: 'PATCH',
      body: input,
    }),
  buscarPorCpf: (cpf: string) =>
    request<{ paciente: PacienteDTO }>(`/pacientes/cpf/${encodeURIComponent(cpf)}`),
};

export const agendasApi = {
  listarDisponiveis: (params?: {
    unidadeId?: string;
    servicoId?: string;
    dataInicio?: string;
    dataFim?: string;
  }) =>
    request<{ vagas: VagaDisponivelDTO[] }>(
      `/agendas/disponiveis${buildQuery(params)}`
    ),
  listar: (params?: {
    unidadeId?: string;
    servicoId?: string;
    profissionalId?: string;
    situacao?: SituacaoAgenda;
  }) => request<{ agendas: AgendaDTO[] }>(`/agendas${buildQuery(params)}`),
  criar: (input: CriarAgendaInput) =>
    request<{ agenda: AgendaDTO; vagasCriadas: number }>('/agendas', {
      method: 'POST',
      body: input,
    }),
  publicar: (id: string) =>
    request<{ agenda: AgendaDTO; vagasCriadas: number }>(`/agendas/${id}/publicar`, {
      method: 'POST',
    }),
  alterarSituacao: (id: string, situacao: 'PUBLICADA' | 'BLOQUEADA' | 'ENCERRADA') =>
    request<{ agenda: AgendaDTO; vagasCriadas: number }>(`/agendas/${id}/situacao`, {
      method: 'PATCH',
      body: { situacao },
    }),
};

export const agendamentosApi = {
  marcar: (input: MarcarAgendamentoInput) =>
    request<{ agendamento: AgendamentoDTO }>('/agendamentos', {
      method: 'POST',
      body: input,
    }),
  meus: () => request<{ agendamentos: AgendamentoDetalhadoDTO[] }>('/agendamentos/meus'),
  porUnidade: (
    unidadeId: string,
    params?: { protocolo?: string; cpf?: string; data?: string }
  ) =>
    request<{ agendamentos: AgendamentoDetalhadoDTO[] }>(
      `/agendamentos/unidade/${unidadeId}${buildQuery(params)}`
    ),
  cancelar: (id: string, motivoCancelamento: string) =>
    request<{ agendamento: AgendamentoDTO }>(`/agendamentos/${id}/cancelar`, {
      method: 'PATCH',
      body: { motivoCancelamento },
    }),
};

export const filaApi = {
  checkin: (input: CheckinInput) =>
    request<{ jaRegistrado: boolean; entrada: EntradaFilaDTO }>('/fila/check-in', {
      method: 'POST',
      body: input,
    }),
  listarUnidade: (unidadeId: string) =>
    request<{ fila: EntradaFilaOperacionalDTO[] }>(`/fila/unidade/${unidadeId}`),
  chamarProximo: (input: ChamarProximoInput) =>
    request<
      | { entrada: EntradaFilaDTO; chamada: ChamadaFilaDTO }
      | { chamada: null; mensagem: string }
    >('/fila/chamar-proximo', {
      method: 'POST',
      body: input,
    }),
  rechamar: (entradaId: string) =>
    request<{ entrada: EntradaFilaDTO; chamada: ChamadaFilaDTO }>(
      `/fila/chamadas/${entradaId}/rechamar`,
      { method: 'POST' }
    ),
  iniciar: (entradaId: string) =>
    request<{ entrada: EntradaFilaDTO; chamada: ChamadaFilaDTO }>(
      `/fila/chamadas/${entradaId}/iniciar`,
      { method: 'PATCH' }
    ),
  concluir: (entradaId: string) =>
    request<{
      entrada: EntradaFilaDTO;
      chamada: ChamadaFilaDTO;
      agendamento: AgendamentoDTO;
    }>(`/fila/chamadas/${entradaId}/concluir`, { method: 'PATCH' }),
  ausente: (entradaId: string, input: RegistrarAusenciaInput) =>
    request<{ entrada: EntradaFilaDTO; chamada: ChamadaFilaDTO }>(
      `/fila/chamadas/${entradaId}/ausente`,
      {
        method: 'PATCH',
        body: input,
      }
    ),
  minhaPosicao: () =>
    request<{ entradas: PosicaoPacienteFilaDTO[] }>('/fila/minha-posicao'),
};

export const painelPublicoApi = {
  consultar: (unidadeId: string, limite = 15) =>
    request<{ unidadeId: string; chamadas: ChamadaPainelPublicoDTO[] }>(
      `/publico/painel/${unidadeId}${buildQuery({ limite })}`,
      { auth: false }
    ),
};
