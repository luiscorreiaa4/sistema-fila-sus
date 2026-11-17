import { PrismaClient } from '@prisma/client';
import { Profissional } from '../../../domain/entities/Profissional';
import {
  FiltroProfissionais,
  IProfissionalRepository,
} from '../../../domain/repositories/IProfissionalRepository';
import { paraDominioProfissional } from './mappers';

export class PrismaProfissionalRepository implements IProfissionalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<Profissional | null> {
    const row = await this.prisma.profissional.findUnique({
      where: { id },
      include: { unidades: true },
    });
    return row ? paraDominioProfissional(row) : null;
  }

  public async buscarPorCpf(cpf: string): Promise<Profissional | null> {
    const row = await this.prisma.profissional.findUnique({
      where: { cpf },
      include: { unidades: true },
    });
    return row ? paraDominioProfissional(row) : null;
  }

  public async buscarPorEmail(email: string): Promise<Profissional | null> {
    const row = await this.prisma.profissional.findUnique({
      where: { email: email.toLowerCase() },
      include: { unidades: true },
    });
    return row ? paraDominioProfissional(row) : null;
  }

  public async listar(
    filtros: FiltroProfissionais = {}
  ): Promise<Profissional[]> {
    const rows = await this.prisma.profissional.findMany({
      where: {
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.unidadeId
          ? { unidades: { some: { unidadeId: filtros.unidadeId } } }
          : {}),
      },
      include: { unidades: true },
      orderBy: { nomeCompleto: 'asc' },
    });
    return rows.map(paraDominioProfissional);
  }

  public async salvar(profissional: Profissional): Promise<Profissional> {
    const unidadesVinculadas = profissional.getUnidadesVinculadas();
    const row = await this.prisma.profissional.create({
      data: {
        id: profissional.getId(),
        cpf: profissional.getCpf().getValor(),
        nomeCompleto: profissional.getNomeCompleto(),
        nomeSocial: profissional.getNomeSocial(),
        conselhoProfissional: profissional.getConselhoProfissional(),
        numeroRegistro: profissional.getNumeroRegistro(),
        ufRegistro: profissional.getUfRegistro(),
        especialidades: profissional.getEspecialidades(),
        email: profissional.getEmail()!,
        celular: profissional.getCelular(),
        nivelAcesso: profissional.getNivelAcesso(),
        credencialHash: profissional.getSenhaHash().getHash(),
        situacaoAcesso: profissional.getSituacaoAcesso(),
        status: profissional.getStatus(),
        motivoInativacao: profissional.getMotivoInativacao(),
        tentativasMalsucedidas: profissional.getTentativasMalsucedidas(),
        bloqueioTemporarioAte: profissional.getBloqueioTemporarioAte(),
        ultimoAcesso: profissional.getUltimoAcesso(),
        unidades: {
          create: unidadesVinculadas.map((unidadeId) => ({ unidadeId })),
        },
      },
      include: { unidades: true },
    });
    return paraDominioProfissional(row);
  }

  public async atualizar(profissional: Profissional): Promise<Profissional> {
    const row = await this.prisma.profissional.update({
      where: { id: profissional.getId() },
      data: {
        nomeSocial: profissional.getNomeSocial(),
        nivelAcesso: profissional.getNivelAcesso(),
        situacaoAcesso: profissional.getSituacaoAcesso(),
        status: profissional.getStatus(),
        motivoInativacao: profissional.getMotivoInativacao(),
        tentativasMalsucedidas: profissional.getTentativasMalsucedidas(),
        bloqueioTemporarioAte: profissional.getBloqueioTemporarioAte(),
        ultimoAcesso: profissional.getUltimoAcesso(),
        updatedAt: profissional.getUpdatedAt(),
      },
      include: { unidades: true },
    });
    return paraDominioProfissional(row);
  }
}
