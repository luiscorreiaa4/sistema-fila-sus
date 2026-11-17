import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { prisma as defaultPrisma } from '../database/prisma/client';
import { errorHandler } from './middlewares/errorHandler';
import { criarApiRouter } from './routes';

export function createApp(prismaClient: PrismaClient = defaultPrisma) {
  const app = express();

  const origensPermitidas = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;

  app.use(
    cors({
      origin: origensPermitidas,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      servico: 'sistema-fila-sus-api',
    });
  });

  app.use('/api', criarApiRouter(prismaClient));

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      erro: 'Rota não encontrada',
      codigo: 'NOT_FOUND',
    });
  });

  app.use(errorHandler);

  return app;
}

const app = createApp(defaultPrisma);

export { app };
