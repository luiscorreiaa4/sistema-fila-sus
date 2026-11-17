import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CadastrarUnidadeSaudeUseCase,
  InativarUnidadeSaudeUseCase,
  ListarUnidadesSaudeUseCase,
} from '../../../application/use-cases/unidades/UnidadeSaudeUseCases';
import { apresentarUnidadeSaude } from '../presenters/presenters';
import {
  criarUnidadeSchema,
  inativarComMotivoSchema,
  uuidSchema,
} from '../validators/schemas';

const listarUnidadesQuerySchema = z.object({
  status: z.enum(['ATIVA', 'INATIVA']).optional(),
  municipio: z.string().trim().optional(),
});

export class UnidadesController {
  constructor(
    private readonly cadastrarUnidade: CadastrarUnidadeSaudeUseCase,
    private readonly listarUnidades: ListarUnidadesSaudeUseCase,
    private readonly inativarUnidade: InativarUnidadeSaudeUseCase
  ) {}

  public criar = async (req: Request, res: Response): Promise<void> => {
    const body = criarUnidadeSchema.parse(req.body);
    const unidade = await this.cadastrarUnidade.executar(body);
    res.status(201).json({ unidade: apresentarUnidadeSaude(unidade) });
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    const query = listarUnidadesQuerySchema.parse(req.query);
    const unidades = await this.listarUnidades.executar(query);
    res.status(200).json({
      unidades: unidades.map(apresentarUnidadeSaude),
    });
  };

  public inativar = async (req: Request, res: Response): Promise<void> => {
    const unidadeId = uuidSchema.parse(req.params.id);
    const body = inativarComMotivoSchema.parse(req.body);
    const unidade = await this.inativarUnidade.executar({
      unidadeId,
      motivoInativacao: body.motivoInativacao,
    });
    res.status(200).json({ unidade: apresentarUnidadeSaude(unidade) });
  };
}
