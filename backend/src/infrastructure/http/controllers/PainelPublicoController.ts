import { Request, Response } from 'express';
import { z } from 'zod';
import { ConsultarPainelPublicoUseCase } from '../../../application/use-cases/fila/FilaUseCases';
import { apresentarChamadaPainelPublico } from '../presenters/presenters';
import { uuidSchema } from '../validators/schemas';

const painelQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(50).optional(),
});

export class PainelPublicoController {
  constructor(
    private readonly consultarPainelPublico: ConsultarPainelPublicoUseCase
  ) {}

  public consultar = async (req: Request, res: Response): Promise<void> => {
    const unidadeId = uuidSchema.parse(req.params.unidadeId);
    const query = painelQuerySchema.parse(req.query);
    const chamadas = await this.consultarPainelPublico.executar(
      unidadeId,
      query.limite ?? 10
    );

    res.status(200).json({
      unidadeId,
      chamadas: chamadas.map(apresentarChamadaPainelPublico),
    });
  };
}
