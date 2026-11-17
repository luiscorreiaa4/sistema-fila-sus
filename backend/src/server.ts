import 'dotenv/config';
import { app } from './infrastructure/http/app';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
  console.log(`Servidor SUS Filas rodando na porta ${PORT}`);
});
