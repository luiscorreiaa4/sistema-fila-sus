import 'dotenv/config';
import { prisma } from './infrastructure/database/prisma/client';
import { app } from './infrastructure/http/app';

const PORT = Number(process.env.PORT ?? 3333);

const server = app.listen(PORT, () => {
  console.log(`Servidor SUS Filas rodando na porta ${PORT}`);
});

async function encerrar(sinal: string) {
  console.log(`\nRecebido ${sinal}. Encerrando servidor HTTP e Prisma...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void encerrar('SIGINT'));
process.on('SIGTERM', () => void encerrar('SIGTERM'));
