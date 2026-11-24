import { Prisma, PrismaClient } from '@prisma/client';
import { obterTurnoMaceio } from '../../../application/utils/dataMaceio';
import {
  Agenda,
  ConfiguracaoDiaHorario,
} from '../../../domain/entities/Agenda';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import {
  AgendaDetalhadaDTO,
  FiltroAgendas,
  FiltroGradeAgenda,
  FiltroVagasDisponiveis,
  IAgendaRepository,
  SlotGradeAgendaDTO,
  VagaDisponivelDTO,
} from '../../../domain/repositories/IAgendaRepository';
import {
  paraDominioAgenda,
  paraDominioPaciente,
  paraDominioVagaAgenda,
} from './mappers';

function formatarDadosProfissional(
  profissional: {
    nomeCompleto: string;
    nomeSocial: string | null;
    conselhoProfissional: string | null;
    numeroRegistro: string | null;
    ufRegistro: string | null;
  } | null
): { nome: string | null; registro: string | null } {
  if (!profissional) {
    return { nome: null, registro: null };
  }

  const nome =
    profissional.nomeSocial?.trim() || profissional.nomeCompleto;
  const conselho = profissional.conselhoProfissional?.trim() || null;
  const numero = profissional.numeroRegistro?.trim() || null;
  const uf = profissional.ufRegistro?.trim().toUpperCase() || null;

  let registro: string | null = null;
  if (conselho && numero && uf) {
    registro = `${conselho} ${numero}/${uf}`;
  } else if (conselho && numero) {
    registro = `${conselho} ${numero}`;
  }

  return { nome, registro };
}

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

    const termo = filtros.termo?.trim();
    const buscaProf = filtros.buscaProfissional?.trim();
    const especialidade = filtros.especialidade?.trim();

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
          servico: {
            status: 'ATIVO',
            ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
            ...(especialidade
              ? {
                  especialidade: {
                    contains: especialidade,
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
          ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
          ...(filtros.servicoId ? { servicoId: filtros.servicoId } : {}),
          ...(filtros.profissionalId
            ? { profissionalId: filtros.profissionalId }
            : {}),
          ...(buscaProf
            ? {
                profissional: {
                  OR: [
                    {
                      nomeCompleto: {
                        contains: buscaProf,
                        mode: 'insensitive',
                      },
                    },
                    {
                      nomeSocial: {
                        contains: buscaProf,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              }
            : {}),
          ...(termo
            ? {
                OR: [
                  {
                    servico: {
                      nome: { contains: termo, mode: 'insensitive' },
                    },
                  },
                  {
                    servico: {
                      especialidade: { contains: termo, mode: 'insensitive' },
                    },
                  },
                  {
                    unidade: {
                      nome: { contains: termo, mode: 'insensitive' },
                    },
                  },
                  {
                    profissional: {
                      nomeCompleto: { contains: termo, mode: 'insensitive' },
                    },
                  },
                  {
                    profissional: {
                      nomeSocial: { contains: termo, mode: 'insensitive' },
                    },
                  },
                ],
              }
            : {}),
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
      .filter((row) => {
        if (row.vagasOcupadas >= row.capacidadeTotal) {
          return false;
        }
        if (filtros.turno && obterTurnoMaceio(row.dataHoraInicio) !== filtros.turno) {
          return false;
        }
        return true;
      })
      .map((row) => {
        const prof = formatarDadosProfissional(row.agenda.profissional);
        return {
          vaga: paraDominioVagaAgenda(row),
          agendaId: row.agendaId,
          unidadeId: row.agenda.unidadeId,
          unidadeNome: row.agenda.unidade.nome,
          unidadeBairro: row.agenda.unidade.bairro,
          unidadeMunicipio: row.agenda.unidade.municipio,
          servicoId: row.agenda.servicoId,
          servicoNome: row.agenda.servico.nome,
          especialidade: row.agenda.servico.especialidade,
          categoria: row.agenda.servico.categoria,
          orientacoesPreparo: row.agenda.servico.orientacoesPreparo,
          profissionalId: row.agenda.profissionalId,
          profissionalNome: prof.nome,
          profissionalRegistro: prof.registro,
        };
      });
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

  public async listarAgendasDetalhadas(
    filtros: FiltroAgendas = {}
  ): Promise<AgendaDetalhadaDTO[]> {
    const rows = await this.prisma.agenda.findMany({
      where: {
        ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
        ...(filtros.servicoId ? { servicoId: filtros.servicoId } : {}),
        ...(filtros.profissionalId
          ? { profissionalId: filtros.profissionalId }
          : {}),
        ...(filtros.situacao ? { situacao: filtros.situacao } : {}),
      },
      include: {
        unidade: true,
        servico: true,
        profissional: true,
        vagas: {
          select: {
            capacidadeTotal: true,
            vagasOcupadas: true,
          },
        },
      },
      orderBy: { dataInicio: 'asc' },
    });

    return rows.map((row) => {
      const prof = formatarDadosProfissional(row.profissional);
      const totalHorarios = row.vagas.length;
      const totalVagas = row.vagas.reduce(
        (acc, v) => acc + v.capacidadeTotal,
        0
      );
      const vagasOcupadas = row.vagas.reduce(
        (acc, v) => acc + v.vagasOcupadas,
        0
      );
      const vagasDisponiveis = Math.max(0, totalVagas - vagasOcupadas);

      return {
        agenda: paraDominioAgenda(row),
        unidadeNome: row.unidade.nome,
        servicoNome: row.servico.nome,
        especialidade: row.servico.especialidade,
        categoria: row.servico.categoria,
        profissionalNome: prof.nome,
        profissionalRegistro: prof.registro,
        totalHorarios,
        totalVagas,
        vagasOcupadas,
        vagasDisponiveis,
      };
    });
  }

  public async consultarGradeHorarios(
    filtros: FiltroGradeAgenda
  ): Promise<SlotGradeAgendaDTO[]> {
    const filtroProfissional = filtros.profissionalId
      ? filtros.incluirSemProfissional
        ? {
            OR: [
              { profissionalId: filtros.profissionalId },
              { profissionalId: null },
            ],
          }
        : { profissionalId: filtros.profissionalId }
      : {};

    const rows = await this.prisma.vagaAgenda.findMany({
      where: {
        dataHoraInicio: {
          gte: filtros.dataInicio,
          lte: filtros.dataFim,
        },
        agenda: {
          unidadeId: filtros.unidadeId,
          situacao: { in: ['PUBLICADA', 'BLOQUEADA'] },
          ...(filtros.servicoId ? { servicoId: filtros.servicoId } : {}),
          ...filtroProfissional,
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
        agendamentos: {
          where: {
            status: { not: 'CANCELADO' },
          },
          include: {
            paciente: true,
            entradaFila: {
              include: {
                chamadas: {
                  orderBy: { dataHoraChamada: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { dataHoraInicio: 'asc' },
    });

    return rows.map((row) => {
      const prof = formatarDadosProfissional(row.agenda.profissional);

      return {
        vaga: paraDominioVagaAgenda(row),
        agendaId: row.agendaId,
        situacaoAgenda: row.agenda.situacao,
        unidadeId: row.agenda.unidadeId,
        unidadeNome: row.agenda.unidade.nome,
        servicoId: row.agenda.servicoId,
        servicoNome: row.agenda.servico.nome,
        especialidade: row.agenda.servico.especialidade,
        categoria: row.agenda.servico.categoria,
        profissionalId: row.agenda.profissionalId,
        profissionalNome: prof.nome,
        profissionalRegistro: prof.registro,
        agendamentos: row.agendamentos.map((ag) => {
          const pacienteDominio = paraDominioPaciente(ag.paciente);
          return {
            id: ag.id,
            protocolo: ag.protocolo,
            senhaAtendimento: ag.senhaAtendimento,
            status: ag.status,
            origemMarcacao: ag.origemMarcacao,
            pacienteId: ag.pacienteId,
            pacienteNomeExibicao: pacienteDominio.obterNomeExibicao(),
            ehPrioritarioLegal: pacienteDominio.ehPrioritarioLegal(
              row.dataHoraInicio
            ),
            criterioPrioridade: pacienteDominio.obterCriterioPrioridade(
              row.dataHoraInicio
            ),
            situacaoFila: ag.entradaFila?.situacao ?? null,
            guicheSalaChamada:
              ag.entradaFila?.chamadas[0]?.guicheSala ?? null,
          };
        }),
      };
    });
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
