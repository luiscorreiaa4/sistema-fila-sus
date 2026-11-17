import { PrismaClient } from '@prisma/client';
import { EstadoChamada } from '../../../domain/entities/ChamadaFila';
import {
  ChamadaPainelPublicoDTO,
  IPainelPublicoRepository,
} from '../../../domain/repositories/IPainelPublicoRepository';

/**
 * Repositório público LGPD: consulta exclusivamente a view `vw_painel_chamadas_publico`.
 */
export class PrismaPainelPublicoRepository implements IPainelPublicoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async listarChamadasPublicas(
    unidadeId: string,
    limite = 10
  ): Promise<ChamadaPainelPublicoDTO[]> {
    const limiteSeguro = Math.min(Math.max(1, Math.trunc(limite)), 50);

    const rows = await this.prisma.$queryRaw<
      Array<{
        chamadaId: string;
        unidadeId: string;
        unidadeNome: string;
        senhaAtendimento: string;
        guicheSala: string;
        horarioChamada: Date;
        tentativa: number;
        estado: EstadoChamada;
      }>
    >`
      SELECT
        chamada_id AS "chamadaId",
        unidade_id AS "unidadeId",
        unidade_nome AS "unidadeNome",
        senha_atendimento AS "senhaAtendimento",
        guiche_sala AS "guicheSala",
        horario_chamada AS "horarioChamada",
        tentativa,
        estado::text AS "estado"
      FROM vw_painel_chamadas_publico
      WHERE unidade_id = ${unidadeId}::uuid
      ORDER BY horario_chamada DESC
      LIMIT ${limiteSeguro}
    `;

    return rows.map((row) => ({
      chamadaId: row.chamadaId,
      unidadeId: row.unidadeId,
      unidadeNome: row.unidadeNome,
      senhaAtendimento: row.senhaAtendimento,
      guicheSala: row.guicheSala,
      horarioChamada: row.horarioChamada,
      tentativa: Number(row.tentativa),
      estado: row.estado,
    }));
  }
}
