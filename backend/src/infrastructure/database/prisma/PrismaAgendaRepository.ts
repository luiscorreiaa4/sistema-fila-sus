import { Prisma, PrismaClient } from '@prisma/client';
import {
  Agenda,
  ConfiguracaoDiaHorario,
} from '../../../domain/entities/Agenda';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import {
  FiltroAgendas,
  FiltroVagasDisponiveis,
  IAgendaRepository,
  VagaDisponivelDTO,
} from '../../../domain/repositories/IAgendaRepository';
import { paraDominioAgenda, paraDominioVagaAgenda } from './mappers';

export class PrismaAgendaRepository implements IAgendaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<Agenda | null> {
    const row = await this.prisma.agenda.findUnique({ where: { id } });
    return row ? paraDominioAgenda(row) : null;
  }

  public async buscarVagaPorId(vagaId: string): Promise<VagaAgenda | null> {
    const row = await this.prisma.vagaAgenda.findUnique({
      where: { id: vagaId },
    });
    return row ? paraDominioVagaAgenda(row) : null;
  }

  public async existeConflitoProfissional(
    profissionalId: string,
    dataInicio: Date,
    dataFim: Date,
    diasHorarios: ConfiguracaoDiaHorario[],
    ignorarAgendaId?: string
  ): Promise<boolean> {
    const agendasConcorrentes = await this.prisma.agenda.findMany({
      where: {
        profissionalId,
        situacao: 'PUBLICADA',
        ...(ignorarAgendaId ? { id: { not: ignorarAgendaId } } : {}),
        dataInicio: { lte: dataFim },
        dataFim: { gte: dataInicio },
      },
    });

    if (agendasConcorrentes.length === 0) {
      return false;
    }

    const mapaNovo = new Map<number, Set<string>>();
    for (const item of diasHorarios) {
      const set = mapaNovo.get(item.diaSemana) ?? new Set<string>();
      for (const h of item.horarios) {
        set.add(h.trim());
      }
      mapaNovo.set(item.diaSemana, set);
    }

    const umDiaMs = 24 * 60 * 60 * 1000;

    for (const existente of agendasConcorrentes) {
      const configsExistentes =
        existente.diasHorarios as unknown as ConfiguracaoDiaHorario[];
      const mapaExistente = new Map<number, Set<string>>();
      for (const item of configsExistentes) {
        const set = mapaExistente.get(item.diaSemana) ?? new Set<string>();
        for (const h of item.horarios) {
          set.add(h.trim());
        }
        mapaExistente.set(item.diaSemana, set);
      }

      const inicioSobreposicao = Math.max(
        dataInicio.getTime(),
        existente.dataInicio.getTime()
      );
      const fimSobreposicao = Math.min(
        dataFim.getTime(),
        existente.dataFim.getTime()
      );

      for (let ts = inicioSobreposicao; ts <= fimSobreposicao; ts += umDiaMs) {
        const diaSemana = new Date(ts).getUTCDay();
        const horariosNovos = mapaNovo.get(diaSemana);
        const horariosExistentes = mapaExistente.get(diaSemana);
        if (!horariosNovos || !horariosExistentes) {
          continue;
        }
        for (const h of horariosNovos) {
          if (horariosExistentes.has(h)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public async listarVagasDisponiveis(
    filtros: FiltroVagasDisponiveis
  ): Promise<VagaDisponivelDTO[]> {
    let dataMin: Date | undefined;
    if (filtros.aPartirDe && filtros.dataInicio) {
      dataMin =
        filtros.aPartirDe.getTime() > filtros.dataInicio.getTime()
          ? filtros.aPartirDe
          : filtros.dataInicio;
    } else {
      dataMin = filtros.aPartirDe ?? filtros.dataInicio;
    }

    const rows = await this.prisma.vagaAgenda.findMany({
      where: {
        ...(dataMin || filtros.dataFim
          ? {
              dataHoraInicio: {
                ...(dataMin ? { gte: dataMin } : {}),
                ...(filtros.dataFim ? { lte: filtros.dataFim } : {}),
              },
            }
          : {}),
        agenda: {
          situacao: 'PUBLICADA',
          unidade: { status: 'ATIVA' },
          servico: { status: 'ATIVO' },
          ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
          ...(filtros.servicoId ? { servicoId: filtros.servicoId } : {}),
        },
      },
      include: {
        agenda: {
          include: {
            unidade: true,
            servico: true,
            profissional: true,
          },
        },
      },
      orderBy: { dataHoraInicio: 'asc' },
    });

    return rows
      .filter((row) => row.vagasOcupadas < row.capacidadeTotal)
      .map((row) => ({
        vaga: paraDominioVagaAgenda(row),
        agendaId: row.agendaId,
        unidadeId: row.agenda.unidadeId,
        unidadeNome: row.agenda.unidade.nome,
        servicoId: row.agenda.servicoId,
        servicoNome: row.agenda.servico.nome,
        especialidade: row.agenda.servico.especialidade,
        profissionalId: row.agenda.profissionalId,
        profissionalNome: row.agenda.profissional
          ? row.agenda.profissional.nomeSocial?.trim() ||
            row.agenda.profissional.nomeCompleto
          : null,
      }));
  }

  public async listarAgendas(filtros: FiltroAgendas = {}): Promise<Agenda[]> {
    const rows = await this.prisma.agenda.findMany({
      where: {
        ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
        ...(filtros.servicoId ? { servicoId: filtros.servicoId } : {}),
        ...(filtros.profissionalId
          ? { profissionalId: filtros.profissionalId }
          : {}),
        ...(filtros.situacao ? { situacao: filtros.situacao } : {}),
      },
      orderBy: { dataInicio: 'asc' },
    });
    return rows.map(paraDominioAgenda);
  }

  public async salvarComVagas(
    agenda: Agenda,
    vagas: VagaAgenda[]
  ): Promise<Agenda> {
    return this.prisma.$transaction(async (tx) => {
      const existente = await tx.agenda.findUnique({
        where: { id: agenda.getId() },
      });

      let salva;
      if (!existente) {
        salva = await tx.agenda.create({
          data: {
            id: agenda.getId(),
            unidadeId: agenda.getUnidadeId(),
            servicoId: agenda.getServicoId(),
            profissionalId: agenda.getProfissionalId(),
            dataInicio: agenda.getDataInicio(),
            dataFim: agenda.getDataFim(),
            diasHorarios:
              agenda.getDiasHorarios() as unknown as Prisma.InputJsonValue,
            capacidadePorHorario: agenda.getCapacidadePorHorario(),
            situacao: agenda.getSituacao(),
          },
        });
      } else {
        salva = await tx.agenda.update({
          where: { id: agenda.getId() },
          data: {
            situacao: agenda.getSituacao(),
            updatedAt: agenda.getUpdatedAt(),
          },
        });
      }

      if (vagas.length > 0) {
        const vagasExistentes = await tx.vagaAgenda.findMany({
          where: { agendaId: agenda.getId() },
          select: { dataHoraInicio: true },
        });
        const horariosJaCriados = new Set(
          vagasExistentes.map((v) => v.dataHoraInicio.getTime())
        );

        const novasVagas = vagas.filter(
          (v) => !horariosJaCriados.has(v.getDataHoraInicio().getTime())
        );

        if (novasVagas.length > 0) {
          await tx.vagaAgenda.createMany({
            data: novasVagas.map((vaga) => ({
              id: vaga.getId(),
              agendaId: vaga.getAgendaId(),
              dataHoraInicio: vaga.getDataHoraInicio(),
              capacidadeTotal: vaga.getCapacidadeTotal(),
              vagasOcupadas: vaga.getVagasOcupadas(),
            })),
          });
        }
      }

      return paraDominioAgenda(salva);
    });
  }

  public async atualizarSituacao(agenda: Agenda): Promise<Agenda> {
    const row = await this.prisma.agenda.update({
      where: { id: agenda.getId() },
      data: {
        situacao: agenda.getSituacao(),
        updatedAt: agenda.getUpdatedAt(),
      },
    });
    return paraDominioAgenda(row);
  }
}
