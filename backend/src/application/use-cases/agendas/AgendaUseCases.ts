import { randomUUID } from 'node:crypto';
import {
  Agenda,
  ConfiguracaoDiaHorario,
  SituacaoAgenda,
} from '../../../domain/entities/Agenda';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { ForbiddenError } from '../../../domain/errors/ForbiddenError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import {
  FiltroAgendas,
  FiltroVagasDisponiveis,
  IAgendaRepository,
  VagaDisponivelDTO,
} from '../../../domain/repositories/IAgendaRepository';
import { IProfissionalRepository } from '../../../domain/repositories/IProfissionalRepository';
import { IServicoRepository } from '../../../domain/repositories/IServicoRepository';
import { IUnidadeSaudeRepository } from '../../../domain/repositories/IUnidadeSaudeRepository';
import {
  converterDataIsoParaDateUtc,
  obterIntervaloDeDataIsoMaceio,
} from '../../utils/dataMaceio';

export interface CriarAgendaInput {
  unidadeId: string;
  servicoId: string;
  profissionalId?: string | null;
  dataInicio: string;
  dataFim: string;
  diasHorarios: ConfiguracaoDiaHorario[];
  capacidadePorHorario: number;
  publicar?: boolean;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export interface CriarAgendaOutput {
  agenda: Agenda;
  vagasCriadas: number;
}

export class CriarAgendaUseCase {
  constructor(
    private readonly agendaRepo: IAgendaRepository,
    private readonly unidadeRepo: IUnidadeSaudeRepository,
    private readonly servicoRepo: IServicoRepository,
    private readonly profissionalRepo: IProfissionalRepository
  ) {}

  public async executar(input: CriarAgendaInput): Promise<CriarAgendaOutput> {
    if (
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(input.unidadeId)
    ) {
      throw new ForbiddenError(
        'Profissional não está vinculado à unidade de saúde informada'
      );
    }

    const unidade = await this.unidadeRepo.buscarPorId(input.unidadeId);
    if (!unidade) {
      throw new NotFoundError('Unidade de saúde não encontrada');
    }
    if (!unidade.aceitaAgendas()) {
      throw new ConflictError(
        'Unidade de saúde inativa não pode receber novas agendas'
      );
    }

    const servico = await this.servicoRepo.buscarPorId(input.servicoId);
    if (!servico) {
      throw new NotFoundError('Serviço não encontrado');
    }
    if (!servico.estaAtivo()) {
      throw new ConflictError('Serviço inativo não pode compor novas agendas');
    }

    const dataInicio = converterDataIsoParaDateUtc(input.dataInicio);
    const dataFim = converterDataIsoParaDateUtc(input.dataFim);

    const agenda = new Agenda({
      id: randomUUID(),
      unidadeId: input.unidadeId,
      servicoId: input.servicoId,
      profissionalId: input.profissionalId ?? null,
      dataInicio,
      dataFim,
      diasHorarios: input.diasHorarios,
      capacidadePorHorario: input.capacidadePorHorario,
      situacao: 'RASCUNHO',
    });

    const profissionalId = agenda.getProfissionalId();
    if (profissionalId) {
      const profissional =
        await this.profissionalRepo.buscarPorId(profissionalId);
      if (!profissional) {
        throw new NotFoundError('Profissional informado não encontrado');
      }
      if (profissional.getStatus() !== 'ATIVO') {
        throw new ConflictError(
          'Profissional inativo não pode ser vinculado a uma agenda'
        );
      }
      if (!profissional.estaVinculadoAUnidade(input.unidadeId)) {
        throw new ValidationError(
          'Profissional informado não está vinculado à unidade de saúde da agenda'
        );
      }

      const conflito = await this.agendaRepo.existeConflitoProfissional(
        profissionalId,
        agenda.getDataInicio(),
        agenda.getDataFim(),
        agenda.getDiasHorarios()
      );
      if (conflito) {
        throw new ConflictError(
          'Profissional já possui agenda publicada conflitante neste período e horário'
        );
      }
    }

    let vagas: VagaAgenda[] = [];
    if (input.publicar !== false) {
      vagas = agenda.publicar('-03:00');
    }

    const agendaSalva = await this.agendaRepo.salvarComVagas(agenda, vagas);
    return {
      agenda: agendaSalva,
      vagasCriadas: vagas.length,
    };
  }
}

export interface AlterarSituacaoAgendaInput {
  agendaId: string;
  situacao: Exclude<SituacaoAgenda, 'RASCUNHO'>;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export class AlterarSituacaoAgendaUseCase {
  constructor(
    private readonly agendaRepo: IAgendaRepository,
    private readonly unidadeRepo: IUnidadeSaudeRepository,
    private readonly servicoRepo: IServicoRepository
  ) {}

  public async executar(
    input: AlterarSituacaoAgendaInput
  ): Promise<{ agenda: Agenda; vagasCriadas: number }> {
    const agenda = await this.agendaRepo.buscarPorId(input.agendaId);
    if (!agenda) {
      throw new NotFoundError('Agenda não encontrada');
    }

    if (
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(agenda.getUnidadeId())
    ) {
      throw new ForbiddenError(
        'Colaborador não vinculado à unidade de saúde desta agenda'
      );
    }

    if (input.situacao === 'PUBLICADA') {
      const unidade = await this.unidadeRepo.buscarPorId(agenda.getUnidadeId());
      if (!unidade || !unidade.aceitaAgendas()) {
        throw new ConflictError(
          'Unidade de saúde inativa não permite publicar agenda'
        );
      }

      const servico = await this.servicoRepo.buscarPorId(agenda.getServicoId());
      if (!servico || !servico.estaAtivo()) {
        throw new ConflictError('Serviço inativo não permite publicar agenda');
      }

      const profissionalId = agenda.getProfissionalId();
      if (profissionalId) {
        const conflito = await this.agendaRepo.existeConflitoProfissional(
          profissionalId,
          agenda.getDataInicio(),
          agenda.getDataFim(),
          agenda.getDiasHorarios(),
          agenda.getId()
        );
        if (conflito) {
          throw new ConflictError(
            'Profissional já possui agenda publicada conflitante neste período e horário'
          );
        }
      }

      const vagas = agenda.publicar('-03:00');
      const salva = await this.agendaRepo.salvarComVagas(agenda, vagas);
      return { agenda: salva, vagasCriadas: vagas.length };
    }

    if (input.situacao === 'BLOQUEADA') {
      agenda.bloquear();
    } else if (input.situacao === 'ENCERRADA') {
      agenda.encerrar();
    } else {
      throw new ValidationError('Situação de agenda inválida');
    }

    const atualizada = await this.agendaRepo.atualizarSituacao(agenda);
    return { agenda: atualizada, vagasCriadas: 0 };
  }
}

export interface ListarVagasDisponiveisInput {
  unidadeId?: string;
  servicoId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export class ListarVagasDisponiveisUseCase {
  constructor(private readonly agendaRepo: IAgendaRepository) {}

  public async executar(
    input: ListarVagasDisponiveisInput = {}
  ): Promise<VagaDisponivelDTO[]> {
    const filtros: FiltroVagasDisponiveis = {
      unidadeId: input.unidadeId,
      servicoId: input.servicoId,
      aPartirDe: new Date(),
    };

    if (input.dataInicio) {
      filtros.dataInicio = obterIntervaloDeDataIsoMaceio(
        input.dataInicio
      ).dataInicioDia;
    }

    if (input.dataFim) {
      filtros.dataFim = obterIntervaloDeDataIsoMaceio(input.dataFim).dataFimDia;
    }

    return this.agendaRepo.listarVagasDisponiveis(filtros);
  }
}

export class ListarAgendasUseCase {
  constructor(private readonly agendaRepo: IAgendaRepository) {}

  public async executar(filtros: FiltroAgendas = {}): Promise<Agenda[]> {
    return this.agendaRepo.listarAgendas(filtros);
  }
}
