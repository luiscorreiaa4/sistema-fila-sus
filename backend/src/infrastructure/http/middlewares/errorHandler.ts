import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors/DomainError';

export function errorHandler(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (erro instanceof ZodError) {
    const primeiroErro = erro.errors[0];
    res.status(400).json({
      erro: primeiroErro?.message ?? 'Dados de entrada inválidos',
      codigo: 'VALIDATION_ERROR',
      detalhes: erro.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
    return;
  }

  if (erro instanceof DomainError) {
    res.status(erro.statusCode).json({
      erro: erro.message,
      codigo: erro.codigo,
    });
    return;
  }

  if (erro instanceof SyntaxError && 'body' in erro) {
    res.status(400).json({
      erro: 'JSON inválido no corpo da requisição',
      codigo: 'INVALID_JSON',
    });
    return;
  }

  console.error('[API ERROR]', erro);
  res.status(500).json({
    erro: 'Erro interno no servidor',
    codigo: 'INTERNAL_SERVER_ERROR',
  });
}
