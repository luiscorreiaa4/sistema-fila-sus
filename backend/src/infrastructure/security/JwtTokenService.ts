import jwt from 'jsonwebtoken';
import {
  ITokenService,
  TokenPayload,
} from '../../application/services/ITokenService';
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError';

/**
 * Implementação JWT para emissão e verificação de tokens de sessão (expiração padrão de 8h).
 */
export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(
    secret = process.env.JWT_SECRET ?? 'chave-secreta-desenvolvimento-sus-cesmac-2026',
    expiresIn = process.env.JWT_EXPIRES_IN ?? '8h'
  ) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  public gerarToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  public verificarToken(token: string): TokenPayload {
    try {
      const decodificado = jwt.verify(token, this.secret);
      if (
        typeof decodificado !== 'object' ||
        decodificado === null ||
        typeof decodificado.sub !== 'string' ||
        (decodificado.tipoUsuario !== 'PACIENTE' &&
          decodificado.tipoUsuario !== 'PROFISSIONAL') ||
        typeof decodificado.perfil !== 'string'
      ) {
        throw new UnauthorizedError('Token inválido ou malformado');
      }

      return {
        sub: decodificado.sub,
        tipoUsuario: decodificado.tipoUsuario,
        perfil: decodificado.perfil,
        unidadesVinculadas: Array.isArray(decodificado.unidadesVinculadas)
          ? decodificado.unidadesVinculadas.map(String)
          : [],
        nomeExibicao:
          typeof decodificado.nomeExibicao === 'string'
            ? decodificado.nomeExibicao
            : '',
      };
    } catch (erro) {
      if (erro instanceof UnauthorizedError) {
        throw erro;
      }
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  }
}
