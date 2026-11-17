import { randomUUID } from 'node:crypto';
import {
  Agendamento,
  OrigemMarcacao,
} from '../../../domain/entities/Agendamento';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { ForbiddenError } from '../../../domain/errors/ForbiddenError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import { IAgendaRepository } from '../../../domain/repositories/IAgendaRepository';
import {
  AgendamentoDetalhadoDTO,
  FiltroAgendamentosUnidade,
  IAgendamentoRepository,
} from '../../../domain/repositories/IAgendamentoRepository';
import { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import { IServicoRepository } from '../../../domain/repositories/IServicoRepository';
import { IUnidadeSaudeRepository } from '../../../domain/repositories/IUnidadeSaudeRepository';
import { Cpf } from '../../../domain/value-objects/Cpf';
import {
  obterIntervaloDeDataIsoMaceio,
  obterIntervaloDiaMaceio,
} from '../../utils/dataMaceio';

export interface MarcarAgendamentoInput {
  vagaId: string;
  pacienteId?: string;
  solicitanteId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class MarcarAgendamentoUseCase {
  constructor(
    private readonly agendamentoRepo: IAgendamentoRepository,
    private readonly agendaRepo: IAgendaRepository,
    private readonly unidadeRepo: IUnidadeSaudeRepository,
    private readonly servicoRepo: IServicoRepository,
    private readonly pacienteRepo: IPacienteRepository
  ) {}

  public async executar(input: MarcarAgendamentoInput): Promise<Agendamento> {
    const ehPaciente = input.solicitantePerfil === 'PACIENTE';
    const pacienteId = ehPaciente ? input.solicitanteId : input.pacienteId;
    const origemMarcacao: OrigemMarcacao = ehPaciente
      ? 'APLICATIVO'
      : 'ASSISTIDA';

    if (!pacienteId) {
      throw new ValidationError(
        'Identificador do paciente é obrigatório para marcação assistida'
      );
    }

    const vaga = await this.agendaRepo.buscarVagaPorId(input.vagaId);
    if (!vaga) {
      throw new NotFoundError('Vaga de horário não encontrada');
    }

    const agenda = await this.agendaRepo.buscarPorId(vaga.getAgendaId());
    if (!agenda) {
      throw new NotFoundError('Agenda vinculada à vaga não encontrada');
    }

    if (
      !ehPaciente &&
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(agenda.getUnidadeId())
    ) {
      throw new ForbiddenError(
        'Colaborador não vinculado à unidade de saúde desta agenda'
      );
    }

    const unidade = await this.unidadeRepo.buscarPorId(agenda.getUnidadeId());
    if (!unidade) {
      throw new NotFoundError('Unidade de saúde não encontrada');
    }
    if (!unidade.aceitaAgendas()) {
      throw new ConflictError(
        'Unidade de saúde inativa não aceita novos agendamentos'
      );
    }

    const servico = await this.servicoRepo.buscarPorId(agenda.getServicoId());
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }
    if (!servico.estaAtivo()) {
      throw new ConflictError(
        'Serviço inativo não aceita novos agendamentos'
      );
    }

    if (!agenda.estaPublicada()) {
      throw new ConflictError(
        'Agenda não está publicada para marcações'
      );
    }

    const agora = new Date();
    if (vaga.getDataHoraInicio().getTime() <= agora.getTime()) {
      throw new ConflictError(
        'Não é possível realizar agendamento em horário passado'
      );
    }

    if (!vaga.temDisponibilidade()) {
      throw new ConflictError(
        'Não há mais vagas disponíveis para este horário'
      );
    }

    const paciente = await this.pacienteRepo.buscarPorId(pacienteId);
    if (!paciente || !paciente.podeAutenticar()) {
      throw new NotFoundError('Paciente não encontrado ou inativo');
    }

    const duplicado = await this.agendamentoRepo.buscarAtivoPorPacienteEServico(
      pacienteId,
      agenda.getServicoId()
    );
    if (duplicado) {
      throw new ConflictError(
        'Paciente já possui agendamento ativo para este serviço'
      );
    }

    const { dataInicioDia, dataFimDia } = obterIntervaloDiaMaceio(
      vaga.getDataHoraInicio()
    );
    const totalDoDia =
      await this.agendamentoRepo.contarAgendamentosDoDiaNaUnidade(
        unidade.getId(),
        dataInicioDia,
        dataFimDia
      );

    const prefixoSenha = paciente.ehPrioritarioLegal(vaga.getDataHoraInicio())
      ? 'P'
      : 'C';
    const senhaProvisoria = `${prefixoSenha}${String(totalDoDia + 1).padStart(
      3,
      '0'
    )}`;

    const agendamento = new Agendamento({
      id: randomUUID(),
      pacienteId: paciente.getId(),
      unidadeId: unidade.getId(),
      servicoId: servico.getId(),
      profissionalId: agenda.getProfissionalId(),
      vagaId: vaga.getId(),
      dataHoraAtendimento: vaga.getDataHoraInicio(),
      protocolo: Agendamento.gerarProtocolo(agora),
      senhaAtendimento: senhaProvisoria,
      origemMarcacao,
      status: 'AGENDADO',
    });

    return this.agendamentoRepo.reservarVagaECriar(agendamento);
  }
}

export class ListarMeusAgendamentosUseCase {
  constructor(private readonly agendamentoRepo: IAgendamentoRepository) {}

  public async executar(
    pacienteId: string
  ): Promise<AgendamentoDetalhadoDTO[]> {
    return this.agendamentoRepo.listarPorPaciente(pacienteId);
  }
}

export interface ListarAgendamentosUnidadeInput {
  unidadeId: string;
  protocolo?: string;
  cpf?: string;
  data?: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class ListarAgendamentosUnidadeUseCase {
  constructor(private readonly agendamentoRepo: IAgendamentoRepository) {}

  public async executar(
    input: ListarAgendamentosUnidadeInput
  ): Promise<AgendamentoDetalhadoDTO[]> {
    if (
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(input.unidadeId)
    ) {
      throw new ForbiddenError(
        'Colaborador não vinculado à unidade de saúde informada'
      );
    }

    const filtros: FiltroAgendamentosUnidade = {};

    if (input.protocolo && input.protocolo.trim().length > 0) {
      filtros.protocolo = input.protocolo.trim().toUpperCase();
    }

    if (input.cpf && input.cpf.trim().length > 0) {
      filtros.cpf = Cpf.criar(input.cpf).getValor();
    }

    if (input.data && input.data.trim().length > 0) {
      const intervalo = obterIntervaloDeDataIsoMaceio(input.data.trim());
      filtros.dataInicioDia = intervalo.dataInicioDia;
      filtros.dataFimDia = intervalo.dataFimDia;
    }

    return this.agendamentoRepo.listarPorUnidade(input.unidadeId, filtros);
  }
}

export interface CancelarAgendamentoInput {
  agendamentoId: string;
  motivoCancelamento: string;
  solicitanteId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class CancelarAgendamentoUseCase {
  constructor(private readonly agendamentoRepo: IAgendamentoRepository) {}

  public async executar(input: CancelarAgendamentoInput): Promise<Agendamento> {
    const agendamento = await this.agendamentoRepo.buscarPorId(
      input.agendamentoId
    );
    if (!agendamento) {
      throw new NotFoundError('Agendamento não encontrado');
    }

    if (input.solicitantePerfil === 'PACIENTE') {
      if (agendamento.getPacienteId() !== input.solicitanteId) {
        throw new ForbiddenError(
          'Cidadão só pode cancelar seus próprios agendamentos'
        );
      }
    } else if (
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(agendamento.getUnidadeId())
    ) {
      throw new ForbiddenError(
        'Colaborador não vinculado à unidade deste agendamento'
      );
    }

    agendamento.cancelar(input.motivoCancelamento);
    await this.agendamentoRepo.cancelarELiberarVaga(agendamento);

    return agendamento;
  }
}
