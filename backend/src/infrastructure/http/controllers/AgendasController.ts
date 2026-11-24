import { Request, Response } from 'express';
import { z } from 'zod';
import {
  AlterarSituacaoAgendaUseCase,
  ConsultarGradeAgendaUseCase,
  CriarAgendaUseCase,
  ListarAgendasDetalhadasUseCase,
  ListarVagasDisponiveisUseCase,
  ObterCatalogoBuscaVagasUseCase,
} from '../../../application/use-cases/agendas/AgendaUseCases';
import {
  apresentarAgenda,
  apresentarAgendaDetalhada,
  apresentarSlotGradeAgenda,
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
  especialidade: z.string().trim().min(1).max(100).optional(),
  categoria: z.enum(['CONSULTA', 'PROCEDIMENTO', 'CIRURGIA']).optional(),
  profissionalId: uuidSchema.optional(),
  buscaProfissional: z.string().trim().min(1).max(100).optional(),
  termo: z.string().trim().min(1).max(100).optional(),
  turno: z.enum(['MANHA', 'TARDE', 'NOITE']).optional(),
  data: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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

const consultarGradeQuerySchema = z.object({
  unidadeId: uuidSchema,
  profissionalId: uuidSchema.optional(),
  incluirSemProfissional: z.enum(['true', 'false']).optional(),
  servicoId: uuidSchema.optional(),
  dataInicio: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataInicio deve estar no formato YYYY-MM-DD'),
  dataFim: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataFim deve estar no formato YYYY-MM-DD'),
});

export class AgendasController {
  constructor(
    private readonly criarAgenda: CriarAgendaUseCase,
    private readonly alterarSituacaoAgenda: AlterarSituacaoAgendaUseCase,
    private readonly listarVagasDisponiveis: ListarVagasDisponiveisUseCase,
    private readonly listarAgendasDetalhadas: ListarAgendasDetalhadasUseCase,
    private readonly obterCatalogoBuscaVagas: ObterCatalogoBuscaVagasUseCase,
    private readonly consultarGradeAgenda: ConsultarGradeAgendaUseCase
  ) {}

  public criar = async (req: Request, res: Response): Promise<void> => {
    const body = criarAgendaSchema.parse(req.body);
    const resultado = await this.criarAgenda.executar({
      ...body,
      solicitanteId: req.usuario!.sub,
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
    const agendas = await this.listarAgendasDetalhadas.executar(query);
    res.status(200).json({
      agendas: agendas.map(apresentarAgendaDetalhada),
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

  public catalogoBusca = async (_req: Request, res: Response): Promise<void> => {
    const catalogo = await this.obterCatalogoBuscaVagas.executar();
    res.status(200).json(catalogo);
  };

  public grade = async (req: Request, res: Response): Promise<void> => {
    const query = consultarGradeQuerySchema.parse(req.query);
    const resultado = await this.consultarGradeAgenda.executar({
      unidadeId: query.unidadeId,
      profissionalId: query.profissionalId,
      incluirSemProfissional: query.incluirSemProfissional === 'true',
      servicoId: query.servicoId,
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
      solicitanteId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(200).json({
      slots: resultado.slots.map(apresentarSlotGradeAgenda),
      resumoDias: resultado.resumoDias,
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
