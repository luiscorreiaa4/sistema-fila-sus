import { randomUUID } from 'node:crypto';
import {
  Agenda,
  ConfiguracaoDiaHorario,
  SituacaoAgenda,
} from '../../../domain/entities/Agenda';
import { CategoriaServico } from '../../../domain/entities/Servico';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { ForbiddenError } from '../../../domain/errors/ForbiddenError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ValidationError } from '../../../domain/errors/ValidationError';
import {
  AgendaDetalhadaDTO,
  FiltroAgendas,
  FiltroVagasDisponiveis,
  IAgendaRepository,
  SlotGradeAgendaDTO,
  VagaDisponivelDTO,
} from '../../../domain/repositories/IAgendaRepository';
import { IProfissionalRepository } from '../../../domain/repositories/IProfissionalRepository';
import { IServicoRepository } from '../../../domain/repositories/IServicoRepository';
import { IUnidadeSaudeRepository } from '../../../domain/repositories/IUnidadeSaudeRepository';
import {
  TurnoAtendimento,
  converterDataIsoParaDateUtc,
  extrairDataIsoMaceio,
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
  solicitanteId?: string;
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

    let profissionalIdResolvido: string | null = input.profissionalId ?? null;
    if (input.solicitantePerfil === 'PROFISSIONAL_SAUDE') {
      if (
        input.profissionalId &&
        input.solicitanteId &&
        input.profissionalId !== input.solicitanteId
      ) {
        throw new ForbiddenError(
          'Profissional de saúde só pode criar agendas vinculadas ao próprio cadastro'
        );
      }
      profissionalIdResolvido = input.profissionalId || input.solicitanteId || null;
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
      profissionalId: profissionalIdResolvido,
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
  especialidade?: string;
  categoria?: CategoriaServico;
  profissionalId?: string;
  buscaProfissional?: string;
  termo?: string;
  turno?: TurnoAtendimento;
  data?: string;
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
      especialidade: input.especialidade,
      categoria: input.categoria,
      profissionalId: input.profissionalId,
      buscaProfissional: input.buscaProfissional,
      termo: input.termo,
      turno: input.turno,
      aPartirDe: new Date(),
    };

    if (input.data) {
      const intervaloDia = obterIntervaloDeDataIsoMaceio(input.data);
      if (!input.dataInicio) {
        filtros.dataInicio = intervaloDia.dataInicioDia;
      }
      if (!input.dataFim) {
        filtros.dataFim = intervaloDia.dataFimDia;
      }
    }

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

export class ListarAgendasDetalhadasUseCase {
  constructor(private readonly agendaRepo: IAgendaRepository) {}

  public async executar(
    filtros: FiltroAgendas = {}
  ): Promise<AgendaDetalhadaDTO[]> {
    return this.agendaRepo.listarAgendasDetalhadas(filtros);
  }
}

export interface CatalogoProfissionalPublicoDTO {
  id: string;
  nomeExibicao: string;
  registroConselho: string | null;
  especialidades: string[];
  unidadesVinculadas: string[];
}

export interface CatalogoBuscaVagasOutput {
  especialidades: string[];
  profissionais: CatalogoProfissionalPublicoDTO[];
}

export class ObterCatalogoBuscaVagasUseCase {
  constructor(
    private readonly servicoRepo: IServicoRepository,
    private readonly profissionalRepo: IProfissionalRepository
  ) {}

  public async executar(): Promise<CatalogoBuscaVagasOutput> {
    const [servicosAtivos, profissionaisAtivos] = await Promise.all([
      this.servicoRepo.listar({ status: 'ATIVO' }),
      this.profissionalRepo.listar({ status: 'ATIVO' }),
    ]);

    const especialidadesSet = new Set<string>();
    for (const s of servicosAtivos) {
      especialidadesSet.add(s.getEspecialidade());
    }
    const especialidades = Array.from(especialidadesSet).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );

    const profissionais = profissionaisAtivos
      .filter(
        (p) =>
          p.getNivelAcesso() === 'PROFISSIONAL_SAUDE' && p.podeAutenticar()
      )
      .sort((a, b) =>
        a.obterNomeExibicao().localeCompare(b.obterNomeExibicao(), 'pt-BR')
      )
      .map((p) => ({
        id: p.getId(),
        nomeExibicao: p.obterNomeExibicao(),
        registroConselho: p.obterRegistroConselhoFormatado(),
        especialidades: p.getEspecialidades(),
        unidadesVinculadas: p.getUnidadesVinculadas(),
      }));

    return { especialidades, profissionais };
  }
}

export interface ConsultarGradeAgendaInput {
  unidadeId: string;
  profissionalId?: string;
  incluirSemProfissional?: boolean;
  servicoId?: string;
  dataInicio: string;
  dataFim: string;
  solicitanteId: string;
  solicitantePerfil: string;
  unidadesVinculadas: string[];
}

export interface ResumoDiaGradeDTO {
  data: string;
  totalHorarios: number;
  totalCapacidade: number;
  totalAgendados: number;
  totalLivres: number;
  totalRealizados: number;
  totalNaFila: number;
}

export interface ConsultarGradeAgendaOutput {
  slots: SlotGradeAgendaDTO[];
  resumoDias: ResumoDiaGradeDTO[];
}

export class ConsultarGradeAgendaUseCase {
  constructor(private readonly agendaRepo: IAgendaRepository) {}

  public async executar(
    input: ConsultarGradeAgendaInput
  ): Promise<ConsultarGradeAgendaOutput> {
    if (
      input.solicitantePerfil !== 'ADMINISTRADOR' &&
      !input.unidadesVinculadas.includes(input.unidadeId)
    ) {
      throw new ForbiddenError(
        'Colaborador não vinculado à unidade de saúde informada'
      );
    }

    const inicio = obterIntervaloDeDataIsoMaceio(input.dataInicio).dataInicioDia;
    const fim = obterIntervaloDeDataIsoMaceio(input.dataFim).dataFimDia;

    if (fim.getTime() < inicio.getTime()) {
      throw new ValidationError(
        'Data final não pode ser anterior à data inicial'
      );
    }

    const profissionalId =
      input.solicitantePerfil === 'PROFISSIONAL_SAUDE' && !input.profissionalId
        ? input.solicitanteId
        : input.profissionalId;

    const slots = await this.agendaRepo.consultarGradeHorarios({
      unidadeId: input.unidadeId,
      profissionalId,
      incluirSemProfissional: input.incluirSemProfissional,
      servicoId: input.servicoId,
      dataInicio: inicio,
      dataFim: fim,
    });

    const mapaDias = new Map<string, ResumoDiaGradeDTO>();

    for (const slot of slots) {
      const dataIso = extrairDataIsoMaceio(slot.vaga.getDataHoraInicio());
      const atual = mapaDias.get(dataIso) ?? {
        data: dataIso,
        totalHorarios: 0,
        totalCapacidade: 0,
        totalAgendados: 0,
        totalLivres: 0,
        totalRealizados: 0,
        totalNaFila: 0,
      };

      const agendadosAtivos = slot.agendamentos.filter(
        (ag) => ag.status !== 'CANCELADO'
      );
      const realizados = agendadosAtivos.filter(
        (ag) => ag.status === 'REALIZADO'
      ).length;
      const naFila = agendadosAtivos.filter(
        (ag) =>
          ag.situacaoFila === 'AGUARDANDO' ||
          ag.situacaoFila === 'CHAMADO' ||
          ag.situacaoFila === 'EM_ATENDIMENTO'
      ).length;

      atual.totalHorarios += 1;
      atual.totalCapacidade += slot.vaga.getCapacidadeTotal();
      atual.totalAgendados += agendadosAtivos.length;
      atual.totalLivres += slot.vaga.vagasDisponiveis();
      atual.totalRealizados += realizados;
      atual.totalNaFila += naFila;

      mapaDias.set(dataIso, atual);
    }

    const resumoDias = Array.from(mapaDias.values()).sort((a, b) =>
      a.data.localeCompare(b.data)
    );

    return { slots, resumoDias };
  }
}
