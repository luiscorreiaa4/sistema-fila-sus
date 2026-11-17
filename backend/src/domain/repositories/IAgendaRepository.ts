import {
  Agenda,
  ConfiguracaoDiaHorario,
  SituacaoAgenda,
} from '../entities/Agenda';
import { VagaAgenda } from '../entities/VagaAgenda';

export interface FiltroVagasDisponiveis {
  unidadeId?: string;
  servicoId?: string;
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
  servicoId: string;
  servicoNome: string;
  especialidade: string;
  profissionalId: string | null;
  profissionalNome: string | null;
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
  salvarComVagas(agenda: Agenda, vagas: VagaAgenda[]): Promise<Agenda>;
  atualizarSituacao(agenda: Agenda): Promise<Agenda>;
}
