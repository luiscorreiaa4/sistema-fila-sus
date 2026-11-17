import { PrismaClient } from '@prisma/client';
import { UnidadeSaude } from '../../../domain/entities/UnidadeSaude';
import {
  FiltroUnidadesSaude,
  IUnidadeSaudeRepository,
} from '../../../domain/repositories/IUnidadeSaudeRepository';
import { paraDominioUnidadeSaude } from './mappers';

export class PrismaUnidadeSaudeRepository implements IUnidadeSaudeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<UnidadeSaude | null> {
    const row = await this.prisma.unidadeSaude.findUnique({ where: { id } });
    return row ? paraDominioUnidadeSaude(row) : null;
  }

  public async buscarPorCnes(cnes: string): Promise<UnidadeSaude | null> {
    const row = await this.prisma.unidadeSaude.findUnique({ where: { cnes } });
    return row ? paraDominioUnidadeSaude(row) : null;
  }

  public async buscarPorNomeEMunicipio(
    nome: string,
    municipio: string
  ): Promise<UnidadeSaude | null> {
    const row = await this.prisma.unidadeSaude.findFirst({
      where: {
        nome: { equals: nome, mode: 'insensitive' },
        municipio: { equals: municipio, mode: 'insensitive' },
      },
    });
    return row ? paraDominioUnidadeSaude(row) : null;
  }

  public async listar(
    filtros: FiltroUnidadesSaude = {}
  ): Promise<UnidadeSaude[]> {
    const rows = await this.prisma.unidadeSaude.findMany({
      where: {
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.municipio
          ? {
              municipio: {
                contains: filtros.municipio,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: { nome: 'asc' },
    });
    return rows.map(paraDominioUnidadeSaude);
  }

  public async salvar(unidade: UnidadeSaude): Promise<UnidadeSaude> {
    const endereco = unidade.getEndereco();
    const row = await this.prisma.unidadeSaude.create({
      data: {
        id: unidade.getId(),
        cnes: unidade.getCnes(),
        cnpj: unidade.getCnpj(),
        nome: unidade.getNome(),
        telefone: unidade.getTelefone(),
        email: unidade.getEmail(),
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento ?? null,
        bairro: endereco.bairro,
        municipio: endereco.municipio,
        estado: endereco.estado,
        fusoHorario: unidade.getFusoHorario(),
        status: unidade.getStatus(),
        motivoInativacao: unidade.getMotivoInativacao(),
      },
    });
    return paraDominioUnidadeSaude(row);
  }

  public async atualizar(unidade: UnidadeSaude): Promise<UnidadeSaude> {
    const endereco = unidade.getEndereco();
    const row = await this.prisma.unidadeSaude.update({
      where: { id: unidade.getId() },
      data: {
        nome: unidade.getNome(),
        telefone: unidade.getTelefone(),
        email: unidade.getEmail(),
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento ?? null,
        bairro: endereco.bairro,
        municipio: endereco.municipio,
        estado: endereco.estado,
        status: unidade.getStatus(),
        motivoInativacao: unidade.getMotivoInativacao(),
        updatedAt: unidade.getUpdatedAt(),
      },
    });
    return paraDominioUnidadeSaude(row);
  }
}
