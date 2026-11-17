import { Request, Response } from 'express';
import {
  AutenticarUsuarioUseCase,
  ObterUsuarioAutenticadoUseCase,
} from '../../../application/use-cases/auth/AuthUseCases';
import { Paciente } from '../../../domain/entities/Paciente';
import {
  apresentarPaciente,
  apresentarProfissional,
} from '../presenters/presenters';
import { loginSchema } from '../validators/schemas';

export class AuthController {
  constructor(
    private readonly autenticarUsuario: AutenticarUsuarioUseCase,
    private readonly obterUsuarioAutenticado: ObterUsuarioAutenticadoUseCase
  ) {}

  public login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body);
    const resultado = await this.autenticarUsuario.executar(body);

    res.status(200).json({
      token: resultado.token,
      tipoUsuario: resultado.tipoUsuario,
      usuario:
        resultado.usuario instanceof Paciente
          ? apresentarPaciente(resultado.usuario)
          : apresentarProfissional(resultado.usuario),
    });
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.obterUsuarioAutenticado.executar(
      req.usuario!.sub,
      req.usuario!.tipoUsuario
    );

    res.status(200).json({
      tipoUsuario: resultado.tipoUsuario,
      usuario:
        resultado.usuario instanceof Paciente
          ? apresentarPaciente(resultado.usuario)
          : apresentarProfissional(resultado.usuario),
    });
  };
}
