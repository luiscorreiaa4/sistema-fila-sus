import { Agendamento } from '../entities/Agendamento';
import { ChamadaFila } from '../entities/ChamadaFila';
import { EntradaFila, GrupoAtendimento } from '../entities/EntradaFila';
import { EstrategiaChamadaFila } from '../strategies/EstrategiaChamadaFila';

export interface EntradaFilaOperacionalDTO {
  entrada: EntradaFila;
  nomeExibicao: string;
  protocolo: string;
  servicoNome: string;
  ultimaChamada: ChamadaFila | null;
}

export interface ParametrosChamarProximo {
  unidadeId: string;
  guicheSala: string;
  profissionalChamadorId: string;
  estrategia: EstrategiaChamadaFila;
  dataInicioDia: Date;
  dataFimDia: Date;
  agora?: Date;
}

export interface ParametrosRegistrarAusencia {
  entrada: EntradaFila;
  chamada: ChamadaFila;
  agendamento?: Agendamento | null;
  permitirRecolocacao: boolean;
  dataInicioDia: Date;
  dataFimDia: Date;
  motivo?: string;
  agora?: Date;
}

export interface IFilaRepository {
  buscarEntradaPorId(id: string): Promise<EntradaFila | null>;
  buscarEntradaAtivaPorAgendamento(
    agendamentoId: string
  ): Promise<EntradaFila | null>;
  buscarUltimaChamadaPorEntrada(
    entradaFilaId: string
  ): Promise<ChamadaFila | null>;
  buscarAguardandoPorUnidade(
    unidadeId: string,
    dataInicioDia?: Date,
    dataFimDia?: Date
  ): Promise<EntradaFila[]>;
  contarPrioritariosSeguidosNoCiclo(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<number>;
  listarFilaOperacionalDoDia(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<EntradaFilaOperacionalDTO[]>;
  listarEntradasAtivasDoPaciente(
    pacienteId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<Array<{ entrada: EntradaFila; unidadeNome: string; chamadaAtiva: ChamadaFila | null }>>;
  obterProximoNumeroSequencialDoDia(
    unidadeId: string,
    grupo: GrupoAtendimento,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<{ ordemEntrada: number; sequenciaGrupo: number }>;
  registrarCheckin(
    entrada: EntradaFila,
    atualizarSenhaAgendamento?: boolean
  ): Promise<EntradaFila>;
  chamarProximoAtomico(
    params: ParametrosChamarProximo
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila } | null>;
  rechamar(entrada: EntradaFila, chamada: ChamadaFila): Promise<ChamadaFila>;
  iniciarAtendimento(
    entrada: EntradaFila,
    chamada: ChamadaFila
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }>;
  concluirAtendimento(
    entrada: EntradaFila,
    chamada: ChamadaFila,
    agendamento: Agendamento
  ): Promise<{
    entrada: EntradaFila;
    chamada: ChamadaFila;
    agendamento: Agendamento;
  }>;
  registrarAusencia(
    params: ParametrosRegistrarAusencia
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }>;
}
