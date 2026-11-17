import { randomUUID } from 'node:crypto';
import { ChamadaFila } from '../../../domain/entities/ChamadaFila';
import { EntradaFila } from '../../../domain/entities/EntradaFila';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { ForbiddenError } from '../../../domain/errors/ForbiddenError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import { IAgendamentoRepository } from '../../../domain/repositories/IAgendamentoRepository';
import {
  EntradaFilaOperacionalDTO,
  IFilaRepository,
} from '../../../domain/repositories/IFilaRepository';
import { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import {
  ChamadaPainelPublicoDTO,
  IPainelPublicoRepository,
} from '../../../domain/repositories/IPainelPublicoRepository';
import { EstrategiaChamadaFila } from '../../../domain/strategies/EstrategiaChamadaFila';
import { OrdemChegadaStrategy } from '../../../domain/strategies/OrdemChegadaStrategy';
import { RodizioPrioritarioComumStrategy } from '../../../domain/strategies/RodizioPrioritarioComumStrategy';
import { Cpf } from '../../../domain/value-objects/Cpf';
import { obterIntervaloDiaMaceio } from '../../utils/dataMaceio';

function garantirVinculoUnidade(
  perfil: string,
  unidadesVinculadas: string[],
  unidadeId: string
): void {
  if (perfil !== 'ADMINISTRADOR' && !unidadesVinculadas.includes(unidadeId)) {
    throw new ForbiddenError(
      'Colaborador não vinculado à unidade de saúde informada'
    );
  }
}

export interface RealizarCheckinInput {
  protocolo?: string;
  cpf?: string;
  unidadeId: string;
  atendenteId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export interface RealizarCheckinOutput {
  entrada: EntradaFila;
  jaRegistrado: boolean;
}

export class RealizarCheckinUseCase {
  constructor(
    private readonly agendamentoRepo: IAgendamentoRepository,
    private readonly pacienteRepo: IPacienteRepository,
    private readonly filaRepo: IFilaRepository
  ) {}

  public async executar(
    input: RealizarCheckinInput
  ): Promise<RealizarCheckinOutput> {
    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      input.unidadeId
    );

    const protocoloLimpo = input.protocolo?.trim().toUpperCase();
    const cpfLimpo = input.cpf ? Cpf.criar(input.cpf).getValor() : undefined;

    if (!protocoloLimpo && !cpfLimpo) {
      throw new ValidationError(
        'Informe o protocolo do agendamento ou o CPF do paciente para o check-in'
      );
    }

    const agora = new Date();
    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio(agora);

    const agendamento = await this.agendamentoRepo.buscarAgendamentoDoDia({
      unidadeId: input.unidadeId,
      protocolo: protocoloLimpo,
      cpf: cpfLimpo,
      dataInicioDia,
      dataFimDia,
    });

    if (!agendamento) {
      throw new NotFoundError(
        'Nenhum agendamento AGENDADO encontrado para hoje nesta unidade'
      );
    }

    const entradaExistente =
      await this.filaRepo.buscarEntradaAtivaPorAgendamento(agendamento.getId());

    if (entradaExistente) {
      return {
        entrada: entradaExistente,
        jaRegistrado: true,
      };
    }

    const paciente = await this.pacienteRepo.buscarPorId(
      agendamento.getPacienteId()
    );
    if (!paciente) {
      throw new NotFoundError('Paciente do agendamento não encontrado');
    }

    const grupo = paciente.obterGrupoAtendimento(agora);
    const criterio = paciente.obterCriterioPrioridade(agora);

    const { ordemEntrada, sequenciaGrupo } =
      await this.filaRepo.obterProximoNumeroSequencialDoDia(
        input.unidadeId,
        grupo,
        dataInicioDia,
        dataFimDia
      );

    const prefixo = grupo === 'PRIORITARIO' ? 'P' : 'C';
    const senhaAtendimento = `${prefixo}-${String(sequenciaGrupo).padStart(
      3,
      '0'
    )}`;

    const entrada = new EntradaFila({
      id: randomUUID(),
      agendamentoId: agendamento.getId(),
      pacienteId: paciente.getId(),
      unidadeId: input.unidadeId,
      atendenteResponsavelId: input.atendenteId,
      dataHoraChegada: agora,
      grupoAtendimento: grupo,
      criterioPrioridade: criterio,
      senhaAtendimento,
      ordemEntrada,
      situacao: 'AGUARDANDO',
      recolocacoes: 0,
    });

    const entradaSalva = await this.filaRepo.registrarCheckin(entrada, true);
    return {
      entrada: entradaSalva,
      jaRegistrado: false,
    };
  }
}

export type NomeEstrategiaFila = 'RODIZIO_5_1' | 'ORDEM_CHEGADA';

export interface ChamarProximoPacienteInput {
  unidadeId: string;
  guicheSala: string;
  estrategia?: NomeEstrategiaFila;
  profissionalId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class ChamarProximoPacienteUseCase {
  constructor(private readonly filaRepo: IFilaRepository) {}

  public async executar(
    input: ChamarProximoPacienteInput
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila } | null> {
    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      input.unidadeId
    );

    const guicheLimpo = input.guicheSala?.trim() ?? '';
    if (guicheLimpo.length < 2 || guicheLimpo.length > 60) {
      throw new ValidationError(
        'Guichê ou sala deve ter entre 2 e 60 caracteres'
      );
    }

    const estrategia: EstrategiaChamadaFila =
      input.estrategia === 'ORDEM_CHEGADA'
        ? new OrdemChegadaStrategy()
        : new RodizioPrioritarioComumStrategy(5);

    const agora = new Date();
    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio(agora);

    return this.filaRepo.chamarProximoAtomico({
      unidadeId: input.unidadeId,
      guicheSala: guicheLimpo,
      profissionalChamadorId: input.profissionalId,
      estrategia,
      dataInicioDia,
      dataFimDia,
      agora,
    });
  }
}

export interface AcaoChamadaFilaInput {
  entradaId: string;
  profissionalId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class RechamarPacienteUseCase {
  constructor(private readonly filaRepo: IFilaRepository) {}

  public async executar(
    input: AcaoChamadaFilaInput
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }> {
    const entrada = await this.filaRepo.buscarEntradaPorId(input.entradaId);
    if (!entrada) {
      throw new NotFoundError('Entrada da fila não encontrada');
    }

    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      entrada.getUnidadeId()
    );

    if (entrada.getSituacao() !== 'CHAMADO') {
      throw new ConflictError(
        `Só é possível rechamar paciente em situação CHAMADO (atual: ${entrada.getSituacao()})`
      );
    }

    const ultimaChamada = await this.filaRepo.buscarUltimaChamadaPorEntrada(
      entrada.getId()
    );
    if (!ultimaChamada) {
      throw new NotFoundError('Registro de chamada anterior não encontrado');
    }

    ultimaChamada.rechamar(new Date());
    const chamadaAtualizada = await this.filaRepo.rechamar(
      entrada,
      ultimaChamada
    );

    return { entrada, chamada: chamadaAtualizada };
  }
}

export class IniciarAtendimentoFilaUseCase {
  constructor(private readonly filaRepo: IFilaRepository) {}

  public async executar(
    input: AcaoChamadaFilaInput
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }> {
    const entrada = await this.filaRepo.buscarEntradaPorId(input.entradaId);
    if (!entrada) {
      throw new NotFoundError('Entrada da fila não encontrada');
    }

    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      entrada.getUnidadeId()
    );

    const ultimaChamada = await this.filaRepo.buscarUltimaChamadaPorEntrada(
      entrada.getId()
    );
    if (!ultimaChamada) {
      throw new NotFoundError('Chamada ativa não encontrada para esta entrada');
    }

    entrada.iniciarAtendimento();
    ultimaChamada.iniciar(new Date());

    return this.filaRepo.iniciarAtendimento(entrada, ultimaChamada);
  }
}

export class ConcluirAtendimentoFilaUseCase {
  constructor(
    private readonly filaRepo: IFilaRepository,
    private readonly agendamentoRepo: IAgendamentoRepository
  ) {}

  public async executar(input: AcaoChamadaFilaInput) {
    const entrada = await this.filaRepo.buscarEntradaPorId(input.entradaId);
    if (!entrada) {
      throw new NotFoundError('Entrada da fila não encontrada');
    }

    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      entrada.getUnidadeId()
    );

    const ultimaChamada = await this.filaRepo.buscarUltimaChamadaPorEntrada(
      entrada.getId()
    );
    if (!ultimaChamada) {
      throw new NotFoundError('Chamada ativa não encontrada para esta entrada');
    }

    const agendamento = await this.agendamentoRepo.buscarPorId(
      entrada.getAgendamentoId()
    );
    if (!agendamento) {
      throw new NotFoundError('Agendamento vinculado à fila não encontrado');
    }

    entrada.concluir();
    ultimaChamada.concluir(new Date());
    agendamento.marcarRealizado();

    return this.filaRepo.concluirAtendimento(
      entrada,
      ultimaChamada,
      agendamento
    );
  }
}

export interface RegistrarAusenciaFilaInput extends AcaoChamadaFilaInput {
  motivoAusencia?: string;
  permitirRecolocacao?: boolean;
}

export class RegistrarAusenciaFilaUseCase {
  constructor(
    private readonly filaRepo: IFilaRepository,
    private readonly agendamentoRepo: IAgendamentoRepository
  ) {}

  public async executar(
    input: RegistrarAusenciaFilaInput
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }> {
    const entrada = await this.filaRepo.buscarEntradaPorId(input.entradaId);
    if (!entrada) {
      throw new NotFoundError('Entrada da fila não encontrada');
    }

    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      entrada.getUnidadeId()
    );

    const ultimaChamada = await this.filaRepo.buscarUltimaChamadaPorEntrada(
      entrada.getId()
    );
    if (!ultimaChamada) {
      throw new NotFoundError('Chamada ativa não encontrada para esta entrada');
    }

    const agendamento = await this.agendamentoRepo.buscarPorId(
      entrada.getAgendamentoId()
    );

    const agora = new Date();
    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio(agora);

    return this.filaRepo.registrarAusencia({
      entrada,
      chamada: ultimaChamada,
      agendamento,
      permitirRecolocacao: input.permitirRecolocacao ?? true,
      dataInicioDia,
      dataFimDia,
      motivo: input.motivoAusencia,
      agora,
    });
  }
}

export interface ListarFilaOperacionalInput {
  unidadeId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class ListarFilaOperacionalUseCase {
  constructor(private readonly filaRepo: IFilaRepository) {}

  public async executar(
    input: ListarFilaOperacionalInput
  ): Promise<EntradaFilaOperacionalDTO[]> {
    garantirVinculoUnidade(
      input.solicitantePerfil,
      input.unidadesVinculadas,
      input.unidadeId
    );

    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio();
    return this.filaRepo.listarFilaOperacionalDoDia(
      input.unidadeId,
      dataInicioDia,
      dataFimDia
    );
  }
}

export interface PosicaoPacienteFilaDTO {
  entradaId: string;
  unidadeId: string;
  unidadeNome: string;
  senhaAtendimento: string;
  grupoAtendimento: string;
  criterioPrioridade: string;
  situacao: string;
  posicaoNaFila: number;
  pessoasAFrente: number;
  guicheSala: string | null;
  dataHoraChamada: Date | null;
}

export class ConsultarMinhaPosicaoFilaUseCase {
  constructor(private readonly filaRepo: IFilaRepository) {}

  public async executar(
    pacienteId: string
  ): Promise<PosicaoPacienteFilaDTO[]> {
    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio();
    const entradasAtivas = await this.filaRepo.listarEntradasAtivasDoPaciente(
      pacienteId,
      dataInicioDia,
      dataFimDia
    );

    if (entradasAtivas.length === 0) {
      return [];
    }

    const estrategia = new RodizioPrioritarioComumStrategy(5);
    const cachePorUnidade = new Map<string, EntradaFila[]>();
    const resultado: PosicaoPacienteFilaDTO[] = [];

    for (const item of entradasAtivas) {
      const { entrada, unidadeNome, chamadaAtiva } = item;
      let posicaoNaFila = 0;
      let pessoasAFrente = 0;

      if (entrada.getSituacao() === 'AGUARDANDO') {
        let filaSimulada = cachePorUnidade.get(entrada.getUnidadeId());
        if (!filaSimulada) {
          const aguardando = await this.filaRepo.buscarAguardandoPorUnidade(
            entrada.getUnidadeId(),
            dataInicioDia,
            dataFimDia
          );
          const seguidos =
            await this.filaRepo.contarPrioritariosSeguidosNoCiclo(
              entrada.getUnidadeId(),
              dataInicioDia,
              dataFimDia
            );
          filaSimulada = estrategia.ordenarFilaSimulada(aguardando, seguidos);
          cachePorUnidade.set(entrada.getUnidadeId(), filaSimulada);
        }

        const indice = filaSimulada.findIndex(
          (e) => e.getId() === entrada.getId()
        );
        if (indice >= 0) {
          posicaoNaFila = indice + 1;
          pessoasAFrente = indice;
        }
      }

      resultado.push({
        entradaId: entrada.getId(),
        unidadeId: entrada.getUnidadeId(),
        unidadeNome,
        senhaAtendimento: entrada.getSenhaAtendimento(),
        grupoAtendimento: entrada.getGrupoAtendimento(),
        criterioPrioridade: entrada.getCriterioPrioridade(),
        situacao: entrada.getSituacao(),
        posicaoNaFila,
        pessoasAFrente,
        guicheSala: chamadaAtiva ? chamadaAtiva.getGuicheSala() : null,
        dataHoraChamada: chamadaAtiva ? chamadaAtiva.getDataHoraChamada() : null,
      });
    }

    return resultado;
  }
}

export class ConsultarPainelPublicoUseCase {
  constructor(private readonly painelRepo: IPainelPublicoRepository) {}

  public async executar(
    unidadeId: string,
    limite = 10
  ): Promise<ChamadaPainelPublicoDTO[]> {
    return this.painelRepo.listarChamadasPublicas(unidadeId, limite);
  }
}
