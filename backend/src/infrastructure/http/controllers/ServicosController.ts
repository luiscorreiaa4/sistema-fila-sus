import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CadastrarServicoUseCase,
  InativarServicoUseCase,
  ListarServicosUseCase,
} from '../../../application/use-cases/servicos/ServicoUseCases';
import { apresentarServico } from '../presenters/presenters';
import { cadastrarServicoSchema, uuidSchema } from '../validators/schemas';

const listarServicosQuerySchema = z.object({
  categoria: z.enum(['CONSULTA', 'PROCEDIMENTO', 'CIRURGIA']).optional(),
  especialidade: z.string().trim().optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  incluirInativos: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export class ServicosController {
  constructor(
    private readonly cadastrarServico: CadastrarServicoUseCase,
    private readonly listarServicos: ListarServicosUseCase,
    private readonly inativarServico: InativarServicoUseCase
  ) {}

  public criar = async (req: Request, res: Response): Promise<void> => {
    const body = cadastrarServicoSchema.parse(req.body);
    const servico = await this.cadastrarServico.executar(body);
    res.status(201).json({ servico: apresentarServico(servico) });
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    const query = listarServicosQuerySchema.parse(req.query);
    const servicos = await this.listarServicos.executar(query);
    res.status(200).json({
      servicos: servicos.map(apresentarServico),
    });
  };

  public inativar = async (req: Request, res: Response): Promise<void> => {
    const servicoId = uuidSchema.parse(req.params.id);
    const servico = await this.inativarServico.executar(servicoId);
    res.status(200).json({ servico: apresentarServico(servico) });
  };
}
