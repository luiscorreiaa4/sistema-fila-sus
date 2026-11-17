import { Request, Response } from 'express';
import {
  AtualizarPerfilPacienteUseCase,
  BuscarPacientePorCpfUseCase,
  CadastrarPacienteUseCase,
  ObterPerfilPacienteUseCase,
} from '../../../application/use-cases/pacientes/PacienteUseCases';
import { apresentarPaciente } from '../presenters/presenters';
import {
  atualizarPacienteSchema,
  cadastrarPacienteSchema,
} from '../validators/schemas';

export class PacientesController {
  constructor(
    private readonly cadastrarPaciente: CadastrarPacienteUseCase,
    private readonly obterPerfil: ObterPerfilPacienteUseCase,
    private readonly atualizarPerfil: AtualizarPerfilPacienteUseCase,
    private readonly buscarPorCpfUseCase: BuscarPacientePorCpfUseCase
  ) {}

  public autocadastro = async (req: Request, res: Response): Promise<void> => {
    const body = cadastrarPacienteSchema.parse(req.body);
    const paciente = await this.cadastrarPaciente.executar({
      ...body,
      origemCadastro: 'AUTOATENDIMENTO',
    });
    res.status(201).json({ paciente: apresentarPaciente(paciente) });
  };

  public cadastroAssistido = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const body = cadastrarPacienteSchema.parse(req.body);
    const paciente = await this.cadastrarPaciente.executar({
      ...body,
      origemCadastro: 'ASSISTIDO',
    });
    res.status(201).json({ paciente: apresentarPaciente(paciente) });
  };

  public obterMe = async (req: Request, res: Response): Promise<void> => {
    const paciente = await this.obterPerfil.executar(req.usuario!.sub);
    res.status(200).json({ paciente: apresentarPaciente(paciente) });
  };

  public atualizarMe = async (req: Request, res: Response): Promise<void> => {
    const body = atualizarPacienteSchema.parse(req.body);
    const paciente = await this.atualizarPerfil.executar({
      pacienteId: req.usuario!.sub,
      ...body,
    });
    res.status(200).json({ paciente: apresentarPaciente(paciente) });
  };

  public buscarPorCpf = async (req: Request, res: Response): Promise<void> => {
    const cpf = String(req.params.cpf ?? '');
    const paciente = await this.buscarPorCpfUseCase.executar(cpf);
    res.status(200).json({ paciente: apresentarPaciente(paciente) });
  };
}
