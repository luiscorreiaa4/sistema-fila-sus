import { Agendamento } from '../entities/Agendamento';

export interface FiltroAgendamentoDoDia {
  unidadeId: string;
  protocolo?: string;
  cpf?: string;
  dataInicioDia: Date;
  dataFimDia: Date;
}

export interface FiltroAgendamentosUnidade {
  protocolo?: string;
  cpf?: string;
  dataInicioDia?: Date;
  dataFimDia?: Date;
}

export interface AgendamentoDetalhadoDTO {
  agendamento: Agendamento;
  unidadeNome: string;
  servicoNome: string;
  especialidade: string;
  orientacoesPreparo: string | null;
  pacienteNomeExibicao?: string;
  profissionalNomeExibicao?: string | null;
}

export interface IAgendamentoRepository {
  buscarPorId(id: string): Promise<Agendamento | null>;
  buscarPorProtocolo(protocolo: string): Promise<Agendamento | null>;
  buscarAtivoPorPacienteEServico(
    pacienteId: string,
    servicoId: string
  ): Promise<Agendamento | null>;
  buscarAgendamentoDoDia(
    filtros: FiltroAgendamentoDoDia
  ): Promise<Agendamento | null>;
  listarPorPaciente(pacienteId: string): Promise<AgendamentoDetalhadoDTO[]>;
  listarPorUnidade(
    unidadeId: string,
    filtros?: FiltroAgendamentosUnidade
  ): Promise<AgendamentoDetalhadoDTO[]>;
  contarAgendamentosDoDiaNaUnidade(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<number>;
  reservarVagaECriar(agendamento: Agendamento): Promise<Agendamento>;
  cancelarELiberarVaga(agendamento: Agendamento): Promise<void>;
  atualizar(agendamento: Agendamento): Promise<Agendamento>;
}
