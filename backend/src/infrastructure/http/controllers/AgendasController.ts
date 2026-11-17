import { Request, Response } from 'express';
import { z } from 'zod';
import {
  AlterarSituacaoAgendaUseCase,
  CriarAgendaUseCase,
  ListarAgendasUseCase,
  ListarVagasDisponiveisUseCase,
} from '../../../application/use-cases/agendas/AgendaUseCases';
import {
  apresentarAgenda,
  apresentarVagaDisponivel,
} from '../presenters/presenters';
import {
  alterarSituacaoAgendaSchema,
  criarAgendaSchema,
  uuidSchema,
} from '../validators/schemas';

const listarVagasQuerySchema = z.object({
  unidadeId: uuidSchema.optional(),
  servicoId: uuidSchema.optional(),
  dataInicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dataFim: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const listarAgendasQuerySchema = z.object({
  unidadeId: uuidSchema.optional(),
  servicoId: uuidSchema.optional(),
  profissionalId: uuidSchema.optional(),
  situacao: z.enum(['RASCUNHO', 'PUBLICADA', 'BLOQUEADA', 'ENCERRADA']).optional(),
});

export class AgendasController {
  constructor(
    private readonly criarAgenda: CriarAgendaUseCase,
    private readonly alterarSituacaoAgenda: AlterarSituacaoAgendaUseCase,
    private readonly listarVagasDisponiveis: ListarVagasDisponiveisUseCase,
    private readonly listarAgendas: ListarAgendasUseCase
  ) {}

  public criar = async (req: Request, res: Response): Promise<void> => {
    const body = criarAgendaSchema.parse(req.body);
    const resultado = await this.criarAgenda.executar({
      ...body,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(201).json({
      agenda: apresentarAgenda(resultado.agenda),
      vagasCriadas: resultado.vagasCriadas,
    });
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    const query = listarAgendasQuerySchema.parse(req.query);
    const agendas = await this.listarAgendas.executar(query);
    res.status(200).json({
      agendas: agendas.map(apresentarAgenda),
    });
  };

  public listarDisponiveis = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const query = listarVagasQuerySchema.parse(req.query);
    const vagas = await this.listarVagasDisponiveis.executar(query);
    res.status(200).json({
      vagas: vagas.map(apresentarVagaDisponivel),
    });
  };

  public publicar = async (req: Request, res: Response): Promise<void> => {
    const agendaId = uuidSchema.parse(req.params.id);
    const resultado = await this.alterarSituacaoAgenda.executar({
      agendaId,
      situacao: 'PUBLICADA',
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(200).json({
      agenda: apresentarAgenda(resultado.agenda),
      vagasCriadas: resultado.vagasCriadas,
    });
  };

  public alterarSituacao = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const agendaId = uuidSchema.parse(req.params.id);
    const body = alterarSituacaoAgendaSchema.parse(req.body);
    const resultado = await this.alterarSituacaoAgenda.executar({
      agendaId,
      situacao: body.situacao,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(200).json({
      agenda: apresentarAgenda(resultado.agenda),
      vagasCriadas: resultado.vagasCriadas,
    });
  };
}
