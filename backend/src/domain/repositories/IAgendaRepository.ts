import {
  Agenda,
  ConfiguracaoDiaHorario,
  SituacaoAgenda,
} from '../entities/Agenda';
import { OrigemMarcacao, StatusAgendamento } from '../entities/Agendamento';
import { SituacaoFila } from '../entities/EntradaFila';
import { CategoriaServico } from '../entities/Servico';
import { VagaAgenda } from '../entities/VagaAgenda';

export interface FiltroVagasDisponiveis {
  unidadeId?: string;
  servicoId?: string;
  especialidade?: string;
  categoria?: CategoriaServico;
  profissionalId?: string;
  buscaProfissional?: string;
  termo?: string;
  turno?: 'MANHA' | 'TARDE' | 'NOITE';
  dataInicio?: Date;
  dataFim?: Date;
  aPartirDe?: Date;
}

export interface FiltroAgendas {
  unidadeId?: string;
  servicoId?: string;
  profissionalId?: string;
  situacao?: SituacaoAgenda;
}

export interface VagaDisponivelDTO {
  vaga: VagaAgenda;
  agendaId: string;
  unidadeId: string;
  unidadeNome: string;
  unidadeBairro: string;
  unidadeMunicipio: string;
  servicoId: string;
  servicoNome: string;
  especialidade: string;
  categoria: CategoriaServico;
  orientacoesPreparo: string | null;
  profissionalId: string | null;
  profissionalNome: string | null;
  profissionalRegistro: string | null;
}

export interface AgendaDetalhadaDTO {
  agenda: Agenda;
  unidadeNome: string;
  servicoNome: string;
  especialidade: string;
  categoria: CategoriaServico;
  profissionalNome: string | null;
  profissionalRegistro: string | null;
  totalHorarios: number;
  totalVagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
}

export interface FiltroGradeAgenda {
  unidadeId: string;
  profissionalId?: string;
  incluirSemProfissional?: boolean;
  servicoId?: string;
  dataInicio: Date;
  dataFim: Date;
}

export interface AgendamentoSlotGradeDTO {
  id: string;
  protocolo: string;
  senhaAtendimento: string;
  status: StatusAgendamento;
  origemMarcacao: OrigemMarcacao;
  pacienteId: string;
  pacienteNomeExibicao: string;
  ehPrioritarioLegal: boolean;
  criterioPrioridade: string;
  situacaoFila: SituacaoFila | null;
  guicheSalaChamada: string | null;
}

export interface SlotGradeAgendaDTO {
  vaga: VagaAgenda;
  agendaId: string;
  situacaoAgenda: SituacaoAgenda;
  unidadeId: string;
  unidadeNome: string;
  servicoId: string;
  servicoNome: string;
  especialidade: string;
  categoria: CategoriaServico;
  profissionalId: string | null;
  profissionalNome: string | null;
  profissionalRegistro: string | null;
  agendamentos: AgendamentoSlotGradeDTO[];
}

export interface IAgendaRepository {
  buscarPorId(id: string): Promise<Agenda | null>;
  buscarVagaPorId(vagaId: string): Promise<VagaAgenda | null>;
  existeConflitoProfissional(
    profissionalId: string,
    dataInicio: Date,
    dataFim: Date,
    diasHorarios: ConfiguracaoDiaHorario[],
    ignorarAgendaId?: string
  ): Promise<boolean>;
  listarVagasDisponiveis(
    filtros: FiltroVagasDisponiveis
  ): Promise<VagaDisponivelDTO[]>;
  listarAgendas(filtros?: FiltroAgendas): Promise<Agenda[]>;
  listarAgendasDetalhadas(filtros?: FiltroAgendas): Promise<AgendaDetalhadaDTO[]>;
  consultarGradeHorarios(filtros: FiltroGradeAgenda): Promise<SlotGradeAgendaDTO[]>;
  salvarComVagas(agenda: Agenda, vagas: VagaAgenda[]): Promise<Agenda>;
  atualizarSituacao(agenda: Agenda): Promise<Agenda>;
}
