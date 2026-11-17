import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CancelarAgendamentoUseCase,
  ListarAgendamentosUnidadeUseCase,
  ListarMeusAgendamentosUseCase,
  MarcarAgendamentoUseCase,
} from '../../../application/use-cases/agendamentos/AgendamentoUseCases';
import {
  apresentarAgendamento,
  apresentarAgendamentoDetalhado,
} from '../presenters/presenters';
import {
  cancelarAgendamentoSchema,
  marcarAgendamentoSchema,
  uuidSchema,
} from '../validators/schemas';

const listarPorUnidadeQuerySchema = z.object({
  protocolo: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  data: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export class AgendamentosController {
  constructor(
    private readonly marcarAgendamento: MarcarAgendamentoUseCase,
    private readonly listarMeusAgendamentos: ListarMeusAgendamentosUseCase,
    private readonly listarAgendamentosUnidade: ListarAgendamentosUnidadeUseCase,
    private readonly cancelarAgendamento: CancelarAgendamentoUseCase
  ) {}

  public marcar = async (req: Request, res: Response): Promise<void> => {
    const body = marcarAgendamentoSchema.parse(req.body);
    const agendamento = await this.marcarAgendamento.executar({
      vagaId: body.vagaId,
      pacienteId: body.pacienteId,
      solicitanteId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(201).json({ agendamento: apresentarAgendamento(agendamento) });
  };

  public meus = async (req: Request, res: Response): Promise<void> => {
    const lista = await this.listarMeusAgendamentos.executar(req.usuario!.sub);
    res.status(200).json({
      agendamentos: lista.map(apresentarAgendamentoDetalhado),
    });
  };

  public porUnidade = async (req: Request, res: Response): Promise<void> => {
    const unidadeId = uuidSchema.parse(req.params.unidadeId);
    const query = listarPorUnidadeQuerySchema.parse(req.query);
    const lista = await this.listarAgendamentosUnidade.executar({
      unidadeId,
      protocolo: query.protocolo,
      cpf: query.cpf,
      data: query.data,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(200).json({
      agendamentos: lista.map(apresentarAgendamentoDetalhado),
    });
  };

  public cancelar = async (req: Request, res: Response): Promise<void> => {
    const agendamentoId = uuidSchema.parse(req.params.id);
    const body = cancelarAgendamentoSchema.parse(req.body);
    const agendamento = await this.cancelarAgendamento.executar({
      agendamentoId,
      motivoCancelamento: body.motivoCancelamento,
      solicitanteId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });
    res.status(200).json({ agendamento: apresentarAgendamento(agendamento) });
  };
}
