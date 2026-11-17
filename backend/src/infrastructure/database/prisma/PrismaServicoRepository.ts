import { PrismaClient } from '@prisma/client';
import { Servico } from '../../../domain/entities/Servico';
import {
  FiltroServicos,
  IServicoRepository,
} from '../../../domain/repositories/IServicoRepository';
import { paraDominioServico } from './mappers';

export class PrismaServicoRepository implements IServicoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<Servico | null> {
    const row = await this.prisma.servico.findUnique({ where: { id } });
    return row ? paraDominioServico(row) : null;
  }

  public async buscarPorNomeEEspecialidade(
    nome: string,
    especialidade: string
  ): Promise<Servico | null> {
    const row = await this.prisma.servico.findFirst({
      where: {
        nome: { equals: nome, mode: 'insensitive' },
        especialidade: { equals: especialidade, mode: 'insensitive' },
      },
    });
    return row ? paraDominioServico(row) : null;
  }

  public async listar(filtros: FiltroServicos = {}): Promise<Servico[]> {
    const rows = await this.prisma.servico.findMany({
      where: {
        ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros.especialidade
          ? {
              especialidade: {
                contains: filtros.especialidade,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(filtros.status ? { status: filtros.status } : {}),
      },
      orderBy: { nome: 'asc' },
    });
    return rows.map(paraDominioServico);
  }

  public async salvar(servico: Servico): Promise<Servico> {
    const row = await this.prisma.servico.create({
      data: {
        id: servico.getId(),
        nome: servico.getNome(),
        categoria: servico.getCategoria(),
        especialidade: servico.getEspecialidade(),
        modoAcesso: servico.getModoAcesso(),
        orientacoesPreparo: servico.getOrientacoesPreparo(),
        status: servico.getStatus(),
      },
    });
    return paraDominioServico(row);
  }

  public async atualizar(servico: Servico): Promise<Servico> {
    const row = await this.prisma.servico.update({
      where: { id: servico.getId() },
      data: {
        status: servico.getStatus(),
        orientacoesPreparo: servico.getOrientacoesPreparo(),
        updatedAt: servico.getUpdatedAt(),
      },
    });
    return paraDominioServico(row);
  }
}
