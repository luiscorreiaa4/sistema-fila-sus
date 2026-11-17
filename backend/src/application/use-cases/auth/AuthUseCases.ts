import { Paciente } from '../../../domain/entities/Paciente';
import { Profissional } from '../../../domain/entities/Profissional';
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError';
import { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import { IProfissionalRepository } from '../../../domain/repositories/IProfissionalRepository';
import { Cpf } from '../../../domain/value-objects/Cpf';
import { IHashService } from '../../services/IHashService';
import {
  ITokenService,
  TipoUsuarioAutenticado,
  TokenPayload,
} from '../../services/ITokenService';

export interface AutenticarUsuarioInput {
  cpf: string;
  senha: string;
  tipoUsuario: TipoUsuarioAutenticado;
}

export interface AutenticarUsuarioOutput {
  token: string;
  tipoUsuario: TipoUsuarioAutenticado;
  usuario: Paciente | Profissional;
}

const ERRO_CREDENCIAL_INVALIDA = 'CPF ou senha inválidos';
const ERRO_BLOQUEIO_TEMPORARIO =
  'Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em 15 minutos.';

export class AutenticarUsuarioUseCase {
  constructor(
    private readonly pacienteRepo: IPacienteRepository,
    private readonly profissionalRepo: IProfissionalRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService
  ) {}

  public async executar(
    input: AutenticarUsuarioInput
  ): Promise<AutenticarUsuarioOutput> {
    const cpfVo = Cpf.criar(input.cpf);
    const agora = new Date();

    const usuario =
      input.tipoUsuario === 'PACIENTE'
        ? await this.pacienteRepo.buscarPorCpf(cpfVo.getValor())
        : await this.profissionalRepo.buscarPorCpf(cpfVo.getValor());

    if (!usuario) {
      throw new UnauthorizedError(ERRO_CREDENCIAL_INVALIDA, 401);
    }

    if (usuario.estaBloqueado(agora)) {
      throw new UnauthorizedError(ERRO_BLOQUEIO_TEMPORARIO, 423);
    }

    if (!usuario.podeAutenticar()) {
      throw new UnauthorizedError(ERRO_CREDENCIAL_INVALIDA, 401);
    }

    const autenticado = usuario.verificarCredencial(
      input.senha,
      agora,
      (plana, hash) => this.hashService.comparar(plana, hash)
    );

    if (usuario instanceof Paciente) {
      await this.pacienteRepo.atualizar(usuario);
    } else if (usuario instanceof Profissional) {
      await this.profissionalRepo.atualizar(usuario);
    }

    if (!autenticado) {
      throw new UnauthorizedError(ERRO_CREDENCIAL_INVALIDA, 401);
    }

    const payload: TokenPayload = {
      sub: usuario.getId(),
      tipoUsuario: input.tipoUsuario,
      perfil: usuario.obterPerfilAcesso(),
      unidadesVinculadas:
        usuario instanceof Profissional
          ? usuario.getUnidadesVinculadas()
          : [],
      nomeExibicao: usuario.obterNomeExibicao(),
    };

    const token = this.tokenService.gerarToken(payload);

    return {
      token,
      tipoUsuario: input.tipoUsuario,
      usuario,
    };
  }
}

export class ObterUsuarioAutenticadoUseCase {
  constructor(
    private readonly pacienteRepo: IPacienteRepository,
    private readonly profissionalRepo: IProfissionalRepository
  ) {}

  public async executar(
    sub: string,
    tipoUsuario: TipoUsuarioAutenticado
  ): Promise<{ tipoUsuario: TipoUsuarioAutenticado; usuario: Paciente | Profissional }> {
    const usuario =
      tipoUsuario === 'PACIENTE'
        ? await this.pacienteRepo.buscarPorId(sub)
        : await this.profissionalRepo.buscarPorId(sub);

    if (!usuario || !usuario.podeAutenticar()) {
      throw new UnauthorizedError('Sessão inválida ou usuário inativo', 401);
    }

    return { tipoUsuario, usuario };
  }
}
