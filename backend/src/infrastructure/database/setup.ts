import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function extrairConfiguracaoConexao(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const nomeBanco = url.pathname.replace(/^\//, '');

  if (!nomeBanco || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nomeBanco)) {
    throw new Error(`Nome de banco inválido na DATABASE_URL: "${nomeBanco}"`);
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';
  adminUrl.searchParams.delete('schema');

  const targetUrl = new URL(url.toString());
  targetUrl.searchParams.delete('schema');

  return {
    nomeBanco,
    host: url.hostname,
    porta: url.port || '5432',
    adminConnectionString: adminUrl.toString(),
    targetConnectionString: targetUrl.toString(),
  };
}

async function garantirBancoExiste(
  adminConnectionString: string,
  nomeBanco: string
): Promise<void> {
  const adminClient = new Client({ connectionString: adminConnectionString });
  await adminClient.connect();

  try {
    const resultado = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [nomeBanco]
    );

    if (resultado.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${nomeBanco}"`);
      console.log(`✔ Banco de dados "${nomeBanco}" criado.`);
    } else {
      console.log(`✔ Banco de dados "${nomeBanco}" já existe.`);
    }
  } finally {
    await adminClient.end();
  }
}

async function aplicarEstrutura3af(targetConnectionString: string): Promise<void> {
  const caminhoSql = path.resolve(__dirname, '../../../../sql/estrutura_3af.sql');

  if (!fs.existsSync(caminhoSql)) {
    throw new Error(`Arquivo SQL não encontrado em: ${caminhoSql}`);
  }

  const sql = fs.readFileSync(caminhoSql, 'utf-8');
  const client = new Client({ connectionString: targetConnectionString });
  await client.connect();

  try {
    await client.query(sql);

    const { rows: tabelas } = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const { rows: views } = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM information_schema.views
       WHERE table_schema = 'public' AND table_name = 'vw_painel_chamadas_publico'`
    );
    const { rows: triggers } = await client.query<{ total: string }>(
      `SELECT COUNT(DISTINCT trigger_name)::text AS total
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'`
    );

    console.log(
      `✔ Script sql/estrutura_3af.sql aplicado com sucesso (${tabelas[0].total} tabelas, ${triggers[0].total} triggers, ${views[0].total} view LGPD).`
    );
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('✖ Variável DATABASE_URL não encontrada. Verifique o arquivo backend/.env.');
    process.exit(1);
  }

  if (databaseUrl.includes('SUA_SENHA_AQUI')) {
    console.error(
      '✖ Preencha a senha real do PostgreSQL no arquivo backend/.env (substitua SUA_SENHA_AQUI) antes de rodar o setup.'
    );
    process.exit(1);
  }

  const config = extrairConfiguracaoConexao(databaseUrl);
  console.log(`Conectando ao PostgreSQL em ${config.host}:${config.porta}...`);

  await garantirBancoExiste(config.adminConnectionString, config.nomeBanco);
  await aplicarEstrutura3af(config.targetConnectionString);
}

main().catch((erro: unknown) => {
  const err = erro as { code?: string; message?: string };

  if (err.code === 'ECONNREFUSED') {
    console.error(
      '✖ Não foi possível conectar ao PostgreSQL. Verifique se o serviço está rodando na porta configurada em backend/.env.'
    );
  } else if (err.code === '28P01') {
    console.error(
      '✖ Autenticação recusada pelo PostgreSQL (usuário ou senha inválidos em backend/.env).'
    );
  } else {
    console.error('✖ Erro durante o setup do banco de dados:', err.message ?? erro);
  }

  process.exit(1);
});
