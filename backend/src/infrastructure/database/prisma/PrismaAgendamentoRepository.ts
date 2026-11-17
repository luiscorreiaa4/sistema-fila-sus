import { Prisma, PrismaClient } from '@prisma/client';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import {
  AgendamentoDetalhadoDTO,
  FiltroAgendamentoDoDia,
  FiltroAgendamentosUnidade,
  IAgendamentoRepository,
} from '../../../domain/repositories/IAgendamentoRepository';
import { paraDominioAgendamento } from './mappers';

export class PrismaAgendamentoRepository implements IAgendamentoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<Agendamento | null> {
    const row = await this.prisma.agendamento.findUnique({ where: { id } });
    return row ? paraDominioAgendamento(row) : null;
  }

  public async buscarPorProtocolo(
    protocolo: string
  ): Promise<Agendamento | null> {
    const row = await this.prisma.agendamento.findUnique({
      where: { protocolo },
    });
    return row ? paraDominioAgendamento(row) : null;
  }

  public async buscarAtivoPorPacienteEServico(
    pacienteId: string,
    servicoId: string
  ): Promise<Agendamento | null> {
    const row = await this.prisma.agendamento.findFirst({
      where: {
        pacienteId,
        servicoId,
        status: 'AGENDADO',
      },
    });
    return row ? paraDominioAgendamento(row) : null;
  }

  public async buscarAgendamentoDoDia(
    filtros: FiltroAgendamentoDoDia
  ): Promise<Agendamento | null> {
    const row = await this.prisma.agendamento.findFirst({
      where: {
        unidadeId: filtros.unidadeId,
        status: 'AGENDADO',
        dataHoraAtendimento: {
          gte: filtros.dataInicioDia,
          lte: filtros.dataFimDia,
        },
        ...(filtros.protocolo ? { protocolo: filtros.protocolo } : {}),
        ...(filtros.cpf ? { paciente: { cpf: filtros.cpf } } : {}),
      },
      orderBy: { dataHoraAtendimento: 'asc' },
    });
    return row ? paraDominioAgendamento(row) : null;
  }

  public async listarPorPaciente(
    pacienteId: string
  ): Promise<AgendamentoDetalhadoDTO[]> {
    const rows = await this.prisma.agendamento.findMany({
      where: { pacienteId },
      include: {
        unidade: true,
        servico: true,
        profissional: true,
      },
      orderBy: { dataHoraAtendimento: 'desc' },
    });

    return rows.map((row) => ({
      agendamento: paraDominioAgendamento(row),
      unidadeNome: row.unidade.nome,
      servicoNome: row.servico.nome,
      especialidade: row.servico.especialidade,
      orientacoesPreparo: row.servico.orientacoesPreparo,
      profissionalNomeExibicao: row.profissional
        ? row.profissional.nomeSocial?.trim() || row.profissional.nomeCompleto
        : null,
    }));
  }

  public async listarPorUnidade(
    unidadeId: string,
    filtros: FiltroAgendamentosUnidade = {}
  ): Promise<AgendamentoDetalhadoDTO[]> {
    const rows = await this.prisma.agendamento.findMany({
      where: {
        unidadeId,
        ...(filtros.protocolo
          ? {
              protocolo: {
                contains: filtros.protocolo,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(filtros.cpf ? { paciente: { cpf: filtros.cpf } } : {}),
        ...(filtros.dataInicioDia || filtros.dataFimDia
          ? {
              dataHoraAtendimento: {
                ...(filtros.dataInicioDia
                  ? { gte: filtros.dataInicioDia }
                  : {}),
                ...(filtros.dataFimDia ? { lte: filtros.dataFimDia } : {}),
              },
            }
          : {}),
      },
      include: {
        unidade: true,
        servico: true,
        paciente: true,
        profissional: true,
      },
      orderBy: { dataHoraAtendimento: 'asc' },
    });

    return rows.map((row) => ({
      agendamento: paraDominioAgendamento(row),
      unidadeNome: row.unidade.nome,
      servicoNome: row.servico.nome,
      especialidade: row.servico.especialidade,
      orientacoesPreparo: row.servico.orientacoesPreparo,
      pacienteNomeExibicao:
        row.paciente.nomeSocial?.trim() || row.paciente.nomeCompleto,
      profissionalNomeExibicao: row.profissional
        ? row.profissional.nomeSocial?.trim() || row.profissional.nomeCompleto
        : null,
    }));
  }

  public async contarAgendamentosDoDiaNaUnidade(
    unidadeId: string,
    dataInicioDia: Date,
    dataFimDia: Date
  ): Promise<number> {
    return this.prisma.agendamento.count({
      where: {
        unidadeId,
        dataHoraAtendimento: {
          gte: dataInicioDia,
          lte: dataFimDia,
        },
      },
    });
  }

  public async reservarVagaECriar(
    agendamento: Agendamento
  ): Promise<Agendamento> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const linhasAfetadas = await tx.$executeRaw`
          UPDATE vagas_agenda
          SET vagas_ocupadas = vagas_ocupadas + 1
          WHERE id = ${agendamento.getVagaId()}::uuid
            AND vagas_ocupadas < capacidade_total
        `;

        if (linhasAfetadas === 0) {
          throw new ConflictError(
            'Não há mais vagas disponíveis para este horário'
          );
        }

        const criado = await tx.agendamento.create({
          data: {
            id: agendamento.getId(),
            pacienteId: agendamento.getPacienteId(),
            unidadeId: agendamento.getUnidadeId(),
            servicoId: agendamento.getServicoId(),
            profissionalId: agendamento.getProfissionalId(),
            vagaId: agendamento.getVagaId(),
            dataHoraAtendimento: agendamento.getDataHoraAtendimento(),
            protocolo: agendamento.getProtocolo(),
            senhaAtendimento: agendamento.getSenhaAtendimento(),
            versao: agendamento.getVersao(),
            origemMarcacao: agendamento.getOrigemMarcacao(),
            status: agendamento.getStatus(),
            motivoCancelamento: agendamento.getMotivoCancelamento(),
          },
        });

        return paraDominioAgendamento(criado);
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        const alvo = JSON.stringify(erro.meta?.target ?? '');
        if (alvo.includes('protocolo')) {
          throw new ConflictError('Conflito ao gerar protocolo único');
        }
        throw new ConflictError(
          'Paciente já possui agendamento ativo para este serviço'
        );
      }
      throw erro;
    }
  }

  public async cancelarELiberarVaga(agendamento: Agendamento): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.agendamento.update({
          where: { id: agendamento.getId() },
          data: {
            status: agendamento.getStatus(),
            motivoCancelamento: agendamento.getMotivoCancelamento(),
            versao: agendamento.getVersao(),
            updatedAt: agendamento.getUpdatedAt(),
          },
        });

        await tx.$executeRaw`
          UPDATE vagas_agenda
          SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - 1)
          WHERE id = ${agendamento.getVagaId()}::uuid
        `;
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        throw new NotFoundError('Agendamento não encontrado');
      }
      throw erro;
    }
  }

  public async atualizar(agendamento: Agendamento): Promise<Agendamento> {
    const row = await this.prisma.agendamento.update({
      where: { id: agendamento.getId() },
      data: {
        senhaAtendimento: agendamento.getSenhaAtendimento(),
        status: agendamento.getStatus(),
        motivoCancelamento: agendamento.getMotivoCancelamento(),
        versao: agendamento.getVersao(),
        updatedAt: agendamento.getUpdatedAt(),
      },
    });
    return paraDominioAgendamento(row);
  }
}
