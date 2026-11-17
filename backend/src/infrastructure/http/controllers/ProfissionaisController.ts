import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CadastrarProfissionalUseCase,
  InativarProfissionalUseCase,
  ListarProfissionaisUseCase,
} from '../../../application/use-cases/profissionais/ProfissionalUseCases';
import { apresentarProfissional } from '../presenters/presenters';
import {
  cadastrarProfissionalSchema,
  inativarComMotivoSchema,
  uuidSchema,
} from '../validators/schemas';

const listarProfissionaisQuerySchema = z.object({
  unidadeId: uuidSchema.optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
});

export class ProfissionaisController {
  constructor(
    private readonly cadastrarProfissional: CadastrarProfissionalUseCase,
    private readonly listarProfissionais: ListarProfissionaisUseCase,
    private readonly inativarProfissional: InativarProfissionalUseCase
  ) {}

  public criar = async (req: Request, res: Response): Promise<void> => {
    const body = cadastrarProfissionalSchema.parse(req.body);
    const profissional = await this.cadastrarProfissional.executar(body);
    res.status(201).json({ profissional: apresentarProfissional(profissional) });
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    const query = listarProfissionaisQuerySchema.parse(req.query);
    const profissionais = await this.listarProfissionais.executar(query);
    res.status(200).json({
      profissionais: profissionais.map(apresentarProfissional),
    });
  };

  public inativar = async (req: Request, res: Response): Promise<void> => {
    const profissionalId = uuidSchema.parse(req.params.id);
    const body = inativarComMotivoSchema.parse(req.body);
    const profissional = await this.inativarProfissional.executar({
      profissionalId,
      motivoInativacao: body.motivoInativacao,
      executorId: req.usuario!.sub,
    });
    res.status(200).json({ profissional: apresentarProfissional(profissional) });
  };
}
