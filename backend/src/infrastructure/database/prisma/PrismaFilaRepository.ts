import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { ChamadaFila } from '../../../domain/entities/ChamadaFila';
import {
  EntradaFila,
  GrupoAtendimento,
  SituacaoFila,
} from '../../../domain/entities/EntradaFila';
import {
  EntradaFilaOperacionalDTO,
  IFilaRepository,
  ParametrosChamarProximo,
  ParametrosRegistrarAusencia,
} from '../../../domain/repositories/IFilaRepository';
import {
  paraDominioAgendamento,
  paraDominioChamadaFila,
  paraDominioEntradaFila,
} from './mappers';

interface RawEntradaFilaRow {
  id: string;
  agendamentoId: string;
  pacienteId: string;
  unidadeId: string;
  atendenteResponsavelId: string | null;
  dataHoraChegada: Date;
  grupoAtendimento: GrupoAtendimento;
  criterioPrioridade: string;
  senhaAtendimento: string;
  ordemEntrada: number;
  situacao: SituacaoFila;
  recolocacoes: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaFilaRepository implements IFilaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarEntradaPorId(id: string): Promise<EntradaFila | null> {
    const row = await this.prisma.entradaFila.findUnique({ where: { id } });
    return row ? paraDominioEntradaFila(row) : null;
  }

  public async buscarEntradaAtivaPorAgendamento(
    agendamentoId: string
  ): Promise<EntradaFila | null> {
    const row = await this.prisma.entradaFila.findFirst({
      where: {
        agendamentoId,
        situacao: { in: ['AGUARDANDO', 'CHAMADO', 'EM_ATENDIMENTO'] },
      },
    });
    return row ? paraDominioEntradaFila(row) : null;
  }

  public async buscarUltimaChamadaPorEntrada(
    entradaFilaId: string
  ): Promise<ChamadaFila | null> {
    const row = await this.prisma.chamadaFila.findFirst({
      where: { entradaFilaId },
      orderBy: [{ tentativa: 'desc' }, { dataHoraChamada: 'desc' }],
    });
    return row ? paraDominioChamadaFila(row) : null;
  }

  public async buscarAguardandoPorUnidade(
    unidadeId: string,
    dataInicioDia?: Date,
    dataFimDia?: Date
  ): Promise<EntradaFila[]> {
    const rows = await this.prisma.entradaFila.findMany({
      where: {
        unidadeId,
        situacao: 'AGUARDANDO',
        ...(dataInicioDia || dataFimDia
          ? {
              dataHoraChegada: {
                ...(dataInicioDia ? { gte: dataInicioDia } : {}),
                ...(dataFimDia ? { lte: dataFimDia } : {}),
              },
            }
          : {}),
      },
      orderBy: { ordemEntrada: 'asc' },
    });
    return rows.map(paraDominioEntradaFila);
  }

  public async contarPrioritariosSeguidosNoCiclo(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<number> {
    return this.calcularPrioritariosSeguidos(
      this.prisma,
      unidadeId,
      dataInicioDia,
      dataFimDia
    );
  }

  private async calcularPrioritariosSeguidos(
    executor: Prisma.TransactionClient | PrismaClient,
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<number> {
    const ultimasChamadas = await executor.$queryRaw<
      Array<{ grupoAtendimento: GrupoAtendimento }>
    >`
      SELECT ef.grupo_atendimento::text AS "grupoAtendimento"
      FROM chamadas_fila cf
      INNER JOIN entradas_fila ef ON ef.id = cf.entrada_fila_id
      WHERE ef.unidade_id = ${unidadeId}::uuid
        AND cf.data_hora_chamada >= ${dataInicioDia}
        AND cf.data_hora_chamada <= ${dataFimDia}
      ORDER BY cf.data_hora_chamada DESC
      LIMIT 50
    `;

    let seguidos = 0;
    for (const item of ultimasChamadas) {
      if (item.grupoAtendimento === 'PRIORITARIO') {
        seguidos += 1;
      } else {
        break;
      }
    }
    return seguidos;
  }

  public async listarFilaOperacionalDoDia(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<EntradaFilaOperacionalDTO[]> {
    const rows = await this.prisma.entradaFila.findMany({
      where: {
        unidadeId,
        dataHoraChegada: {
          gte: dataInicioDia,
          lte: dataFimDia,
        },
      },
      include: {
        paciente: true,
        agendamento: {
          include: {
            servico: true,
          },
        },
        chamadas: {
          orderBy: [{ tentativa: 'desc' }, { dataHoraChamada: 'desc' }],
          take: 1,
        },
      },
      orderBy: { ordemEntrada: 'asc' },
    });

    return rows.map((row) => ({
      entrada: paraDominioEntradaFila(row),
      nomeExibicao:
        row.paciente.nomeSocial?.trim() || row.paciente.nomeCompleto,
      protocolo: row.agendamento.protocolo,
      servicoNome: row.agendamento.servico.nome,
      ultimaChamada: row.chamadas[0]
        ? paraDominioChamadaFila(row.chamadas[0])
        : null,
    }));
  }

  public async listarEntradasAtivasDoPaciente(
    pacienteId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<
    Array<{
      entrada: EntradaFila;
      unidadeNome: string;
      chamadaAtiva: ChamadaFila | null;
    }>
  > {
    const rows = await this.prisma.entradaFila.findMany({
      where: {
        pacienteId,
        situacao: { in: ['AGUARDANDO', 'CHAMADO', 'EM_ATENDIMENTO'] },
        dataHoraChegada: {
          gte: dataInicioDia,
          lte: dataFimDia,
        },
      },
      include: {
        unidade: true,
        chamadas: {
          orderBy: [{ tentativa: 'desc' }, { dataHoraChamada: 'desc' }],
          take: 1,
        },
      },
      orderBy: { dataHoraChegada: 'asc' },
    });

    return rows.map((row) => ({
      entrada: paraDominioEntradaFila(row),
      unidadeNome: row.unidade.nome,
      chamadaAtiva: row.chamadas[0]
        ? paraDominioChamadaFila(row.chamadas[0])
        : null,
    }));
  }

  public async obterProximoNumeroSequencialDoDia(
    unidadeId: string,
    grupo: GrupoAtendimento,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<{ ordemEntrada: number; sequenciaGrupo: number }> {
    const [maxOrdem, totalGrupo] = await Promise.all([
      this.prisma.entradaFila.aggregate({
        where: {
          unidadeId,
          dataHoraChegada: {
            gte: dataInicioDia,
            lte: dataFimDia,
          },
        },
        _max: { ordemEntrada: true },
      }),
      this.prisma.entradaFila.count({
        where: {
          unidadeId,
          grupoAtendimento: grupo,
          dataHoraChegada: {
            gte: dataInicioDia,
            lte: dataFimDia,
          },
        },
      }),
    ]);

    return {
      ordemEntrada: (maxOrdem._max.ordemEntrada ?? 0) + 1,
      sequenciaGrupo: totalGrupo + 1,
    };
  }

  public async registrarCheckin(
    entrada: EntradaFila,
    atualizarSenhaAgendamento = true
  ): Promise<EntradaFila> {
    return this.prisma.$transaction(async (tx) => {
      const criada = await tx.entradaFila.create({
        data: {
          id: entrada.getId(),
          agendamentoId: entrada.getAgendamentoId(),
          pacienteId: entrada.getPacienteId(),
          unidadeId: entrada.getUnidadeId(),
          atendenteResponsavelId: entrada.getAtendenteResponsavelId(),
          dataHoraChegada: entrada.getDataHoraChegada(),
          grupoAtendimento: entrada.getGrupoAtendimento(),
          criterioPrioridade: entrada.getCriterioPrioridade(),
          senhaAtendimento: entrada.getSenhaAtendimento(),
          ordemEntrada: entrada.getOrdemEntrada(),
          situacao: entrada.getSituacao(),
          recolocacoes: entrada.getRecolocacoes(),
        },
      });

      if (atualizarSenhaAgendamento) {
        await tx.agendamento.update({
          where: { id: entrada.getAgendamentoId() },
          data: {
            senhaAtendimento: entrada.getSenhaAtendimento(),
          },
        });
      }

      return paraDominioEntradaFila(criada);
    });
  }

  public async chamarProximoAtomico(
    params: ParametrosChamarProximo
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila } | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<RawEntradaFilaRow[]>`
        SELECT
          id,
          agendamento_id AS "agendamentoId",
          paciente_id AS "pacienteId",
          unidade_id AS "unidadeId",
          atendente_responsavel_id AS "atendenteResponsavelId",
          data_hora_chegada AS "dataHoraChegada",
          grupo_atendimento::text AS "grupoAtendimento",
          criterio_prioridade AS "criterioPrioridade",
          senha_atendimento AS "senhaAtendimento",
          ordem_entrada AS "ordemEntrada",
          situacao::text AS "situacao",
          recolocacoes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM entradas_fila
        WHERE unidade_id = ${params.unidadeId}::uuid
          AND situacao = 'AGUARDANDO'::situacao_fila_enum
          AND data_hora_chegada >= ${params.dataInicioDia}
          AND data_hora_chegada <= ${params.dataFimDia}
        ORDER BY ordem_entrada ASC
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) {
        return null;
      }

      const aguardando = rows.map(
        (row) =>
          new EntradaFila({
            id: row.id,
            agendamentoId: row.agendamentoId,
            pacienteId: row.pacienteId,
            unidadeId: row.unidadeId,
            atendenteResponsavelId: row.atendenteResponsavelId,
            dataHoraChegada: row.dataHoraChegada,
            grupoAtendimento: row.grupoAtendimento,
            criterioPrioridade: row.criterioPrioridade,
            senhaAtendimento: row.senhaAtendimento,
            ordemEntrada: row.ordemEntrada,
            situacao: row.situacao,
            recolocacoes: row.recolocacoes,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
      );

      const prioritariosSeguidos = await this.calcularPrioritariosSeguidos(
        tx,
        params.unidadeId,
        params.dataInicioDia,
        params.dataFimDia
      );

      const selecionada = params.estrategia.selecionarProximaEntrada(
        aguardando,
        prioritariosSeguidos
      );

      if (!selecionada) {
        return null;
      }

      selecionada.chamar();

      const chamadasAnteriores = await tx.chamadaFila.count({
        where: { entradaFilaId: selecionada.getId() },
      });

      const agora = params.agora ?? new Date();
      const chamada = new ChamadaFila({
        id: randomUUID(),
        entradaFilaId: selecionada.getId(),
        profissionalChamadorId: params.profissionalChamadorId,
        guicheSala: params.guicheSala,
        dataHoraChamada: agora,
        tentativa: chamadasAnteriores + 1,
        estado: 'CHAMADO',
      });

      await tx.entradaFila.update({
        where: { id: selecionada.getId() },
        data: {
          situacao: selecionada.getSituacao(),
          updatedAt: selecionada.getUpdatedAt(),
        },
      });

      await tx.chamadaFila.create({
        data: {
          id: chamada.getId(),
          entradaFilaId: chamada.getEntradaFilaId(),
          profissionalChamadorId: chamada.getProfissionalChamadorId(),
          guicheSala: chamada.getGuicheSala(),
          dataHoraChamada: chamada.getDataHoraChamada(),
          tentativa: chamada.getTentativa(),
          estado: chamada.getEstado(),
        },
      });

      return { entrada: selecionada, chamada };
    });
  }

  public async rechamar(
    _entrada: EntradaFila,
    chamada: ChamadaFila
  ): Promise<ChamadaFila> {
    const row = await this.prisma.chamadaFila.update({
      where: { id: chamada.getId() },
      data: {
        tentativa: chamada.getTentativa(),
        dataHoraChamada: chamada.getDataHoraChamada(),
      },
    });
    return paraDominioChamadaFila(row);
  }

  public async iniciarAtendimento(
    entrada: EntradaFila,
    chamada: ChamadaFila
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }> {
    return this.prisma.$transaction(async (tx) => {
      const entradaAtualizada = await tx.entradaFila.update({
        where: { id: entrada.getId() },
        data: {
          situacao: entrada.getSituacao(),
          updatedAt: entrada.getUpdatedAt(),
        },
      });

      const chamadaAtualizada = await tx.chamadaFila.update({
        where: { id: chamada.getId() },
        data: {
          estado: chamada.getEstado(),
          dataHoraInicio: chamada.getDataHoraInicio(),
        },
      });

      return {
        entrada: paraDominioEntradaFila(entradaAtualizada),
        chamada: paraDominioChamadaFila(chamadaAtualizada),
      };
    });
  }

  public async concluirAtendimento(
    entrada: EntradaFila,
    chamada: ChamadaFila,
    agendamento: Agendamento
  ): Promise<{
    entrada: EntradaFila;
    chamada: ChamadaFila;
    agendamento: Agendamento;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const entradaAtualizada = await tx.entradaFila.update({
        where: { id: entrada.getId() },
        data: {
          situacao: entrada.getSituacao(),
          updatedAt: entrada.getUpdatedAt(),
        },
      });

      const chamadaAtualizada = await tx.chamadaFila.update({
        where: { id: chamada.getId() },
        data: {
          estado: chamada.getEstado(),
          dataHoraConclusao: chamada.getDataHoraConclusao(),
          duracaoMinutos: chamada.getDuracaoMinutos(),
        },
      });

      const agendamentoAtualizado = await tx.agendamento.update({
        where: { id: agendamento.getId() },
        data: {
          status: agendamento.getStatus(),
          versao: agendamento.getVersao(),
          updatedAt: agendamento.getUpdatedAt(),
        },
      });

      return {
        entrada: paraDominioEntradaFila(entradaAtualizada),
        chamada: paraDominioChamadaFila(chamadaAtualizada),
        agendamento: paraDominioAgendamento(agendamentoAtualizado),
      };
    });
  }

  public async registrarAusencia(
    params: ParametrosRegistrarAusencia
  ): Promise<{ entrada: EntradaFila; chamada: ChamadaFila }> {
    return this.prisma.$transaction(async (tx) => {
      const { entrada, chamada, agendamento, permitirRecolocacao } = params;
      const agora = params.agora ?? new Date();

      const podeRecolocar =
        permitirRecolocacao &&
        entrada.getRecolocacoes() === 0 &&
        entrada.getSituacao() === 'CHAMADO';

      if (podeRecolocar) {
        const maxOrdem = await tx.entradaFila.aggregate({
          where: {
            unidadeId: entrada.getUnidadeId(),
            dataHoraChegada: {
              gte: params.dataInicioDia,
              lte: params.dataFimDia,
            },
          },
          _max: { ordemEntrada: true },
        });
        const novaOrdem = (maxOrdem._max.ordemEntrada ?? 0) + 1;
        entrada.registrarAusencia(true, novaOrdem);
      } else {
        entrada.registrarAusencia(false);
      }

      chamada.marcarAusencia(params.motivo, agora);

      const entradaAtualizada = await tx.entradaFila.update({
        where: { id: entrada.getId() },
        data: {
          situacao: entrada.getSituacao(),
          recolocacoes: entrada.getRecolocacoes(),
          ordemEntrada: entrada.getOrdemEntrada(),
          updatedAt: entrada.getUpdatedAt(),
        },
      });

      const chamadaAtualizada = await tx.chamadaFila.update({
        where: { id: chamada.getId() },
        data: {
          estado: chamada.getEstado(),
          dataHoraConclusao: chamada.getDataHoraConclusao(),
          motivoAusencia: chamada.getMotivoAusencia(),
        },
      });

      if (entrada.getSituacao() === 'NAO_ATENDIDO' && agendamento) {
        agendamento.marcarNaoRealizado(params.motivo);
        await tx.agendamento.update({
          where: { id: agendamento.getId() },
          data: {
            status: agendamento.getStatus(),
            motivoCancelamento: agendamento.getMotivoCancelamento(),
            versao: agendamento.getVersao(),
            updatedAt: agendamento.getUpdatedAt(),
          },
        });
      }

      return {
        entrada: paraDominioEntradaFila(entradaAtualizada),
        chamada: paraDominioChamadaFila(chamadaAtualizada),
      };
    });
  }
}
