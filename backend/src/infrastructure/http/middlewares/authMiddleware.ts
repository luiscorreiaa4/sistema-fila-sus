import { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ITokenService,
  TokenPayload,
} from '../../../application/services/ITokenService';
import { ForbiddenError } from '../../../domain/errors/ForbiddenError';
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError';

declare global {
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export function criarAuthMiddlewares(tokenService: ITokenService) {
  const autenticarJwt: RequestHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Token de autenticação não fornecido'));
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return next(new UnauthorizedError('Token de autenticação inválido'));
    }

    try {
      req.usuario = tokenService.verificarToken(token);
      return next();
    } catch (erro) {
      return next(erro);
    }
  };

  const exigirPerfis = (...perfisPermitidos: string[]): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.usuario) {
        return next(new UnauthorizedError('Usuário não autenticado'));
      }

      if (!perfisPermitidos.includes(req.usuario.perfil)) {
        return next(
          new ForbiddenError('Perfil sem permissão para executar esta operação')
        );
      }

      return next();
    };
  };

  const verificarVinculoUnidade = (
    extrairUnidadeId: (req: Request) => string | undefined
  ): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.usuario) {
        return next(new UnauthorizedError('Usuário não autenticado'));
      }

      if (
        req.usuario.tipoUsuario === 'PACIENTE' ||
        req.usuario.perfil === 'ADMINISTRADOR'
      ) {
        return next();
      }

      const unidadeId = extrairUnidadeId(req);
      if (
        unidadeId &&
        !req.usuario.unidadesVinculadas.includes(unidadeId)
      ) {
        return next(
          new ForbiddenError(
            'Colaborador não está vinculado à unidade de saúde informada'
          )
        );
      }

      return next();
    };
  };

  return {
    autenticarJwt,
    exigirPerfis,
    verificarVinculoUnidade,
  };
}
